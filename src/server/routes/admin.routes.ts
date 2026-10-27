import { Router } from 'express';
import type { Request, Response } from 'express';
import { db, type ProductEntity, type CategoryEntity, type BannerEntity } from '../db';
import { authMiddleware, adminMiddleware } from '../auth.middleware';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// 1. Dashboard Analytics & Unit Economics (/api/v1/admin/stats)
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const activeOrders = db.orders.filter((o) => o.status !== 'CANCELLED');
    const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const totalOrders = db.orders.length;
    const paidOrdersCount = activeOrders.length;
    const averageOrderValue = paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0;

    // Estimated unit economics based on Business Model (avg 22% gross margin on hardware + add-ons)
    const estimatedGrossProfit = Math.round(totalRevenue * 0.22);

    const lowStockProducts = db.products
      .filter((p) => p.stock <= 8)
      .map((p) => ({ id: p.id, title: p.title, slug: p.slug, stock: p.stock, price: p.price }));

    const categoryBreakdown = db.categories.map((cat) => {
      const catProducts = db.products.filter((p) => p.category === cat.slug || p.categoryId === cat.id);
      return {
        category: cat.name,
        slug: cat.slug,
        productCount: catProducts.length,
        totalStock: catProducts.reduce((sum, p) => sum + p.stock, 0),
      };
    });

    const stats = {
      totalRevenue,
      estimatedGrossProfit,
      totalOrders,
      paidOrdersCount,
      cancelledOrdersCount: db.orders.filter((o) => o.status === 'CANCELLED').length,
      averageOrderValue,
      totalUsers: db.users.length,
      totalProducts: db.products.length,
      totalReviews: db.reviews.length,
      totalQuestions: db.questions.length,
      b2bQuotesCount: db.b2bQuotes.length,
      tradeInRequestsCount: db.tradeInRequests.length,
      lowStockProducts,
      categoryBreakdown,
    };

    return res.json({ success: true, ok: true, stats, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, ok: false, message: error.message });
  }
});

// 2. Orders Management
router.get('/orders', (_req: Request, res: Response) => {
  try {
    const orders = [...db.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((order) => {
        const user = db.users.find((u) => u.id === order.userId);
        const items = db.orderItems
          .filter((i) => i.orderId === order.id)
          .map((item) => {
            const product = db.products.find((p) => p.id === item.productId);
            return {
              ...item,
              product: product
                ? {
                    id: product.id,
                    title: product.title,
                    slug: product.slug,
                  }
                : null,
            };
          });

        return {
          ...order,
          user: user
            ? {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
              }
            : null,
          items,
        };
      });

    return res.json({ success: true, ok: true, data: orders, orders });
  } catch (error: any) {
    return res.status(500).json({ success: false, ok: false, message: error.message });
  }
});

router.patch('/orders/:id/status', (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, ok: false, message: 'Некорректный статус заказа' });
    }

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, ok: false, message: 'Заказ не найден' });
    }

    const prevStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    // If order is being cancelled for the first time, return stock
    if (status === 'CANCELLED' && prevStatus !== 'CANCELLED') {
      const items = db.orderItems.filter((i) => i.orderId === order.id);
      for (const item of items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) prod.stock += item.quantity;
      }
    }

    db.save();

    return res.json({
      success: true,
      ok: true,
      message: `Статус заказа обновлен на ${status}`,
      data: order,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

// 3. Products CRUD
router.post('/products', (req: Request, res: Response) => {
  try {
    const {
      title,
      name,
      slug,
      description,
      price,
      oldPrice,
      stock,
      images,
      image,
      categoryId,
      category,
      specs,
      isFeatured,
      brand,
      colors,
      badge,
    } = req.body;

    const prodTitle = title || name;
    if (!prodTitle || !price) {
      return res.status(400).json({ success: false, ok: false, message: 'Укажите title/name и price' });
    }

    const prodSlug = slug || prodTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = db.products.find((p) => p.slug === prodSlug);
    if (existing) {
      return res.status(400).json({ success: false, ok: false, message: 'Товар с таким slug уже существует' });
    }

    const catSlug = category || 'smartphones';
    const now = new Date().toISOString();

    const newProd: ProductEntity = {
      id: 'prod-' + Math.random().toString(36).slice(2, 10),
      title: prodTitle,
      name: prodTitle,
      slug: prodSlug,
      brand: brand || 'Arc',
      colors: colors || ['#6c63ff', '#2ec4ff'],
      badge: badge || null,
      description:
        typeof description === 'object'
          ? description
          : { ru: description || prodTitle, en: description || prodTitle },
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      stock: Number(stock) ?? 10,
      image: image || (images && images[0]) || '',
      images: images || (image ? [image] : []),
      categoryId: categoryId || 'cat-' + catSlug,
      category: catSlug,
      specs: specs || {},
      isFeatured: Boolean(isFeatured),
      createdAt: now,
      updatedAt: now,
    };

    db.products.push(newProd);
    db.save();

    return res.status(201).json({ success: true, ok: true, data: newProd, product: newProd });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

router.patch('/products/:id', (req: Request, res: Response) => {
  try {
    const prodId = req.params.id;
    const prod = db.products.find((p) => p.id === prodId || p.slug === prodId);

    if (!prod) {
      return res.status(404).json({ success: false, ok: false, message: 'Товар не найден' });
    }

    const {
      title,
      name,
      price,
      oldPrice,
      stock,
      badge,
      brand,
      description,
      image,
      images,
      specs,
      isFeatured,
      category,
    } = req.body;

    if (title !== undefined || name !== undefined) {
      prod.title = title || name;
      prod.name = title || name;
    }
    if (price !== undefined) prod.price = Number(price);
    if (oldPrice !== undefined) prod.oldPrice = oldPrice ? Number(oldPrice) : null;
    if (stock !== undefined) prod.stock = Math.max(0, Number(stock));
    if (badge !== undefined) prod.badge = badge;
    if (brand !== undefined) prod.brand = brand;
    if (category !== undefined) prod.category = category;
    if (isFeatured !== undefined) prod.isFeatured = Boolean(isFeatured);
    if (image !== undefined) {
      prod.image = image;
      if (!prod.images.includes(image) && image) prod.images = [image, ...prod.images];
    }
    if (Array.isArray(images)) prod.images = images;
    if (specs !== undefined && typeof specs === 'object') {
      prod.specs = { ...prod.specs, ...specs };
    }
    if (description !== undefined) {
      prod.description =
        typeof description === 'object' ? description : { ru: String(description), en: String(description) };
    }

    prod.updatedAt = new Date().toISOString();
    db.save();

    return res.json({ success: true, ok: true, message: 'Товар успешно обновлен', data: prod, product: prod });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

router.delete('/products/:id', (req: Request, res: Response) => {
  try {
    const prodId = req.params.id;
    const idx = db.products.findIndex((p) => p.id === prodId || p.slug === prodId);

    if (idx < 0) {
      return res.status(404).json({ success: false, ok: false, message: 'Товар не найден' });
    }

    db.products.splice(idx, 1);
    db.save();

    return res.json({ success: true, ok: true, message: 'Товар успешно удален' });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

// 4. Users Management
router.get('/users', (_req: Request, res: Response) => {
  const users = db.users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    login: u.login,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
    ordersCount: db.orders.filter((o) => o.userId === u.id).length,
  }));

  return res.json({ success: true, ok: true, users, data: users });
});

router.patch('/users/:id/role', (req: Request, res: Response) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!['CUSTOMER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ success: false, ok: false, message: 'Роль должна быть CUSTOMER или ADMIN' });
  }

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, ok: false, message: 'Пользователь не найден' });
  }

  user.role = role;
  user.updatedAt = new Date().toISOString();
  db.save();

  return res.json({
    success: true,
    ok: true,
    message: `Роль пользователя ${user.email} изменена на ${role}`,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  });
});

// 5. Categories CRUD
router.post('/categories', (req: Request, res: Response) => {
  const { name, slug, icon, order } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ success: false, ok: false, message: 'Укажите name и slug категории' });
  }

  if (db.categories.some((c) => c.slug === slug)) {
    return res.status(400).json({ success: false, ok: false, message: 'Категория с таким slug уже существует' });
  }

  const newCat: CategoryEntity = {
    id: 'cat-' + slug,
    name,
    slug,
    icon: icon || 'box',
    order: Number(order) || db.categories.length + 1,
    createdAt: new Date().toISOString(),
  };

  db.categories.push(newCat);
  db.save();

  return res.status(201).json({ success: true, ok: true, category: newCat, data: newCat });
});

router.patch('/categories/:id', (req: Request, res: Response) => {
  const catId = req.params.id;
  const cat = db.categories.find((c) => c.id === catId || c.slug === catId);
  if (!cat) {
    return res.status(404).json({ success: false, ok: false, message: 'Категория не найдена' });
  }

  const { name, icon, order } = req.body;
  if (name !== undefined) cat.name = name;
  if (icon !== undefined) cat.icon = icon;
  if (order !== undefined) cat.order = Number(order);
  db.save();

  return res.json({ success: true, ok: true, category: cat, data: cat });
});

router.delete('/categories/:id', (req: Request, res: Response) => {
  const catId = req.params.id;
  const idx = db.categories.findIndex((c) => c.id === catId || c.slug === catId);
  if (idx < 0) {
    return res.status(404).json({ success: false, ok: false, message: 'Категория не найдена' });
  }

  db.categories.splice(idx, 1);
  db.save();

  return res.json({ success: true, ok: true, message: 'Категория удалена' });
});

// 6. Banners CRUD
router.get('/banners', (_req: Request, res: Response) => {
  return res.json({ success: true, ok: true, banners: db.banners, data: db.banners });
});

router.post('/banners', (req: Request, res: Response) => {
  const { title, imageUrl, link, isActive, order } = req.body;
  if (!title || !imageUrl) {
    return res.status(400).json({ success: false, ok: false, message: 'Укажите title и imageUrl баннера' });
  }

  const newBanner: BannerEntity = {
    id: 'banner-' + Math.random().toString(36).slice(2, 9),
    title,
    imageUrl,
    link: link || '/home',
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    order: Number(order) || db.banners.length + 1,
    createdAt: new Date().toISOString(),
  };

  db.banners.push(newBanner);
  db.save();

  return res.status(201).json({ success: true, ok: true, banner: newBanner, data: newBanner });
});

router.patch('/banners/:id', (req: Request, res: Response) => {
  const banner = db.banners.find((b) => b.id === req.params.id);
  if (!banner) {
    return res.status(404).json({ success: false, ok: false, message: 'Баннер не найден' });
  }

  const { title, imageUrl, link, isActive, order } = req.body;
  if (title !== undefined) banner.title = title;
  if (imageUrl !== undefined) banner.imageUrl = imageUrl;
  if (link !== undefined) banner.link = link;
  if (isActive !== undefined) banner.isActive = Boolean(isActive);
  if (order !== undefined) banner.order = Number(order);
  db.save();

  return res.json({ success: true, ok: true, banner, data: banner });
});

router.delete('/banners/:id', (req: Request, res: Response) => {
  const idx = db.banners.findIndex((b) => b.id === req.params.id);
  if (idx < 0) {
    return res.status(404).json({ success: false, ok: false, message: 'Баннер не найден' });
  }

  db.banners.splice(idx, 1);
  db.save();

  return res.json({ success: true, ok: true, message: 'Баннер удален' });
});

export default router;
