import { Router } from 'express';
import type { Response } from 'express';
import { db } from '../db';
import { authMiddleware, type AuthenticatedRequest } from '../auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const userCart = db.cartItems.filter((c) => c.userId === userId);

  const items = userCart.map((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    const price = product ? product.price : 0;
    return {
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: product
        ? {
            id: product.id,
            title: product.title,
            name: product.name,
            slug: product.slug,
            price: product.price,
            images: product.images,
            image: product.image,
            stock: product.stock,
          }
        : null,
      subtotal: price * item.quantity,
    };
  });

  const totalCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = items.reduce((acc, curr) => acc + curr.subtotal, 0);

  return res.json({
    success: true,
    ok: true,
    data: {
      items,
      totalCount,
      totalPrice,
    },
    items,
    totalCount,
    totalPrice,
  });
});

const handleAddItem = (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, ok: false, message: 'Не указан productId' });
    }

    const qty = Math.max(Number(quantity) || 1, 1);
    const product = db.products.find((p) => p.id === productId || p.slug === productId);
    if (!product) {
      return res.status(404).json({ success: false, ok: false, message: 'Товар не найден' });
    }

    if (product.stock < qty) {
      return res.status(400).json({ success: false, ok: false, message: 'Недостаточно товара на складе' });
    }

    let existing = db.cartItems.find((c) => c.userId === userId && c.productId === product.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, product.stock);
    } else {
      existing = {
        id: 'cart-' + Math.random().toString(36).slice(2, 10),
        userId,
        productId: product.id,
        quantity: qty,
      };
      db.cartItems.push(existing);
    }

    db.save();
    return res.json({ success: true, ok: true, message: 'Товар добавлен в корзину', item: existing });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
};

router.post('/', handleAddItem);
router.post('/items', handleAddItem);

// Sync client cart with server cart
router.post('/sync', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { items } = req.body;

    if (Array.isArray(items)) {
      const remaining = db.cartItems.filter((c) => c.userId !== userId);
      db.cartItems.length = 0;
      db.cartItems.push(...remaining);

      for (const line of items) {
        const prodId = line.productId || line.id;
        const qty = Math.max(Number(line.quantity || line.qty) || 1, 1);
        const prod = db.products.find((p) => p.id === prodId || p.slug === prodId);
        if (prod && prod.stock > 0) {
          db.cartItems.push({
            id: 'cart-' + Math.random().toString(36).slice(2, 10),
            userId,
            productId: prod.id,
            quantity: Math.min(qty, prod.stock),
          });
        }
      }
      db.save();
    }

    return res.json({ success: true, ok: true, message: 'Корзина синхронизирована' });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

const handlePatchItem = (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const itemId = req.params.itemId;
    const { quantity } = req.body;

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, ok: false, message: 'Некорректное количество' });
    }

    const item = db.cartItems.find((c) => c.userId === userId && (c.id === itemId || c.productId === itemId));
    if (!item) {
      return res.status(404).json({ success: false, ok: false, message: 'Позиция в корзине не найдена' });
    }

    const product = db.products.find((p) => p.id === item.productId);
    if (product && product.stock < qty) {
      return res.status(400).json({ success: false, ok: false, message: 'Запрошенное количество превышает остаток' });
    }

    item.quantity = qty;
    db.save();

    return res.json({ success: true, ok: true, message: 'Количество обновлено', item });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
};

router.patch('/:itemId', handlePatchItem);
router.patch('/items/:itemId', handlePatchItem);

const handleDeleteItem = (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const itemId = req.params.itemId;

    const idx = db.cartItems.findIndex((c) => c.userId === userId && (c.id === itemId || c.productId === itemId));
    if (idx >= 0) {
      db.cartItems.splice(idx, 1);
      db.save();
    }

    return res.json({ success: true, ok: true, message: 'Товар удален из корзины' });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
};

router.delete('/:itemId', handleDeleteItem);
router.delete('/items/:itemId', handleDeleteItem);

router.delete('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const remaining = db.cartItems.filter((c) => c.userId !== userId);
  db.cartItems.length = 0;
  db.cartItems.push(...remaining);
  db.save();

  return res.json({ success: true, ok: true, message: 'Корзина очищена' });
});

export default router;
