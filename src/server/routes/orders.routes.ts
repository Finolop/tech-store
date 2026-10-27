import crypto from 'node:crypto';
import { Router } from 'express';
import type { Response } from 'express';
import { db } from '../db';
import { authMiddleware, optionalAuthMiddleware, type AuthenticatedRequest } from '../auth.middleware';

const router = Router();
const uuidv4 = () => crypto.randomUUID();

// GET /api/v1/orders
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userOrders = db.orders
    .filter((o) => o.userId === req.user!.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => {
      const items = db.orderItems
        .filter((oi) => oi.orderId === order.id)
        .map((oi) => {
          const product = db.products.find((p) => p.id === oi.productId);
          return {
            ...oi,
            productTitle: product?.title || 'Товар',
            productImage: product?.image || '',
          };
        });
      return {
        ...order,
        total: order.totalAmount,
        items,
      };
    });

  return res.json({
    success: true,
    ok: true,
    data: userOrders,
    orders: userOrders,
  });
});

// GET /api/v1/orders/:id
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      ok: false,
      message: 'Заказ не найден',
    });
  }

  if (order.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      ok: false,
      message: 'Нет доступа к этому заказу',
    });
  }

  const items = db.orderItems
    .filter((oi) => oi.orderId === order.id)
    .map((oi) => {
      const product = db.products.find((p) => p.id === oi.productId);
      return {
        ...oi,
        product,
      };
    });

  return res.json({
    success: true,
    ok: true,
    data: {
      ...order,
      total: order.totalAmount,
      items,
    },
  });
});

// POST /api/v1/orders
router.post('/', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    items: bodyItems,
    recipientName,
    deliveryAddress,
    contactPhone,
    comment,
    promoCode,
    warrantyCare = false,
    paymentMethod = 'CARD',
  } = req.body || {};

  let itemsToOrder: Array<{ productId: string; quantity: number }> = [];

  if (Array.isArray(bodyItems) && bodyItems.length > 0) {
    itemsToOrder = bodyItems.map((item: any) => ({
      productId: String(item.productId || item.id),
      quantity: Math.max(1, Number(item.quantity ?? item.qty ?? 1)),
    }));
  } else if (req.user) {
    const cart = db.cartItems.filter((ci) => ci.userId === req.user!.userId);
    itemsToOrder = cart.map((ci) => ({
      productId: ci.productId,
      quantity: ci.quantity,
    }));
  }

  if (itemsToOrder.length === 0) {
    return res.status(400).json({
      success: false,
      ok: false,
      message: 'Корзина пуста',
    });
  }

  let subtotalAmount = 0;
  const validatedItems: Array<{ product: any; quantity: number }> = [];

  for (const reqItem of itemsToOrder) {
    const product = db.products.find((p) => p.id === reqItem.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        ok: false,
        message: `Товар ${reqItem.productId} не найден`,
      });
    }
    if (product.stock < reqItem.quantity) {
      return res.status(400).json({
        success: false,
        ok: false,
        message: `Недостаточно товара «${product.title}» на складе (доступно: ${product.stock})`,
      });
    }
    subtotalAmount += product.price * reqItem.quantity;
    validatedItems.push({ product, quantity: reqItem.quantity });
  }

  let discountAmount = 0;
  let appliedPromo: string | null = null;
  if (promoCode) {
    const cleanCode = String(promoCode).trim().toUpperCase();
    const promo = db.promoCodes.find((p) => p.code.toUpperCase() === cleanCode && p.isActive);
    if (promo && subtotalAmount >= promo.minOrderAmount) {
      discountAmount = Math.round((subtotalAmount * promo.discountPercent) / 100);
      appliedPromo = promo.code;
    }
  }

  const warrantyPrice = warrantyCare ? Math.round(subtotalAmount * 0.08) : 0;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount + warrantyPrice);

  const normalizedPayment: 'CARD' | 'SBP' = paymentMethod === 'SBP' ? 'SBP' : 'CARD';

  const now = new Date().toISOString();
  const orderId = `ord-${Date.now().toString(36).toUpperCase()}`;

  for (const vi of validatedItems) {
    vi.product.stock -= vi.quantity;
    vi.product.updatedAt = now;

    db.orderItems.push({
      id: uuidv4(),
      orderId,
      productId: vi.product.id,
      price: vi.product.price,
      quantity: vi.quantity,
    });
  }

  const newOrder = {
    id: orderId,
    userId: req.user?.userId || 'guest',
    status: 'PAID' as const,
    subtotalAmount,
    discountAmount,
    promoCode: appliedPromo,
    warrantyCare: Boolean(warrantyCare),
    warrantyPrice,
    paymentMethod: normalizedPayment,
    totalAmount,
    recipientName: recipientName ? String(recipientName).trim() : 'Покупатель',
    deliveryAddress: deliveryAddress ? String(deliveryAddress).trim() : 'Самовывоз из фирменного шоурума ARCSHOP',
    contactPhone: contactPhone ? String(contactPhone).trim() : '+7 (999) 000-00-00',
    comment: comment ? String(comment).trim() : undefined,
    createdAt: now,
    updatedAt: now,
  };

  db.orders.push(newOrder);

  if (req.user) {
    for (let i = db.cartItems.length - 1; i >= 0; i--) {
      if (db.cartItems[i].userId === req.user.userId) {
        db.cartItems.splice(i, 1);
      }
    }
  }

  db.save();

  return res.status(201).json({
    success: true,
    ok: true,
    order: {
      id: newOrder.id,
      total: newOrder.totalAmount,
      subtotalAmount,
      discountAmount,
      promoCode: appliedPromo,
      warrantyCare: newOrder.warrantyCare,
      warrantyPrice,
      paymentMethod: newOrder.paymentMethod,
      recipientName: newOrder.recipientName,
      deliveryAddress: newOrder.deliveryAddress,
      contactPhone: newOrder.contactPhone,
      createdAt: newOrder.createdAt,
    },
    data: newOrder,
  });
});

// PATCH /api/v1/orders/:id/cancel
router.patch('/:id/cancel', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      ok: false,
      message: 'Заказ не найден',
    });
  }

  if (order.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      ok: false,
      message: 'Вы не можете отменить чужой заказ',
    });
  }

  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    return res.status(400).json({
      success: false,
      ok: false,
      message: `Невозможно отменить заказ в статусе ${order.status}`,
    });
  }

  order.status = 'CANCELLED';
  order.updatedAt = new Date().toISOString();

  const items = db.orderItems.filter((oi) => oi.orderId === order.id);
  for (const oi of items) {
    const product = db.products.find((p) => p.id === oi.productId);
    if (product) {
      product.stock += oi.quantity;
    }
  }

  db.save();

  return res.json({
    success: true,
    ok: true,
    data: order,
  });
});

export default router;
