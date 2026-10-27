import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import { compareProducts } from '../../presenter/compare';

const router = Router();

export function enrichProduct(prod: any) {
  const reviews = db.reviews.filter((r) => r.productId === prod.id);
  const questions = db.questions.filter((q) => q.productId === prod.id);

  const reviewCount = reviews.length;
  const questionCount = questions.length;
  const totalRatingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const rating = reviewCount > 0 ? Math.round((totalRatingSum / reviewCount) * 10) / 10 : 0;

  return {
    ...prod,
    name: prod.name || prod.title,
    title: prod.title || prod.name,
    image: prod.image || (prod.images && prod.images[0]) || '',
    rating,
    reviewCount,
    questionCount,
  };
}

router.get('/categories', (_req: Request, res: Response) => {
  const categories = [...db.categories]
    .sort((a, b) => a.order - b.order)
    .map((cat) => ({
      ...cat,
      productCount: db.products.filter((p) => p.category === cat.slug || p.categoryId === cat.id).length,
    }));
  return res.json({ success: true, ok: true, data: categories, categories });
});

router.get('/categories/:slug', (req: Request, res: Response) => {
  const slug = req.params.slug;
  const category = db.categories.find((c) => c.slug === slug || c.id === slug);
  if (!category) {
    return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Категория не найдена' });
  }
  const products = db.products
    .filter((p) => p.category === category.slug || p.categoryId === category.id)
    .map(enrichProduct);

  return res.json({
    success: true,
    ok: true,
    category,
    products,
    data: { category, products },
  });
});

router.get('/banners', (_req: Request, res: Response) => {
  const banners = db.banners
    .filter((b) => b.isActive)
    .sort((a, b) => a.order - b.order);
  return res.json({ success: true, ok: true, data: banners, banners });
});

// Smart comparison endpoint (GET /products/compare?ids=a,b or POST /products/compare)
const handleCompare = (req: Request, res: Response) => {
  try {
    const rawIds = req.query.ids
      ? String(req.query.ids).split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(req.body?.ids)
      ? req.body.ids
      : [];

    const products = rawIds
      .map((id: string) => db.products.find((p) => p.id === id || p.slug === id))
      .filter(Boolean)
      .map(enrichProduct);

    if (products.length < 2) {
      return res.status(400).json({
        success: false,
        ok: false,
        message: 'Для сравнения укажите минимум 2 товара одной категории (?ids=id1,id2)',
      });
    }

    const comparison = compareProducts(products);
    return res.json({
      success: true,
      ok: true,
      products,
      comparison,
      data: { products, comparison },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
};

router.get('/products/compare', handleCompare);
router.post('/products/compare', handleCompare);

router.get('/products', (req: Request, res: Response) => {
  try {
    const {
      category,
      brand,
      badge,
      minPrice,
      maxPrice,
      inStock,
      isFeatured,
      search,
      page: pageQ,
      limit: limitQ,
      sort,
    } = req.query;

    let filtered = [...db.products];

    if (category) {
      filtered = filtered.filter((p) => p.category === category || p.categoryId === category);
    }

    if (brand && typeof brand === 'string') {
      filtered = filtered.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
    }

    if (badge && typeof badge === 'string') {
      filtered = filtered.filter((p) => p.badge === badge.toLowerCase());
    }

    if (minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= Number(minPrice));
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= Number(maxPrice));
    }

    if (inStock === 'true') {
      filtered = filtered.filter((p) => p.stock > 0);
    }

    if (isFeatured === 'true') {
      filtered = filtered.filter((p) => p.isFeatured);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      if (q) {
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.slug.toLowerCase().includes(q) ||
            (p.description?.ru && p.description.ru.toLowerCase().includes(q)) ||
            (p.description?.en && p.description.en.toLowerCase().includes(q)),
        );
      }
    }

    let enriched = filtered.map(enrichProduct);

    if (sort === 'price_asc' || sort === 'priceAsc') {
      enriched.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc' || sort === 'priceDesc') {
      enriched.sort((a, b) => b.price - a.price);
    } else if (sort === 'popular') {
      enriched.sort((a, b) => b.reviewCount * 10 + b.rating + b.questionCount - (a.reviewCount * 10 + a.rating + a.questionCount));
    } else {
      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = enriched.length;
    const page = Math.max(Number(pageQ) || 1, 1);
    const limit = Math.max(Number(limitQ) || 24, 1);
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;

    const paginated = enriched.slice(skip, skip + limit);

    return res.json({
      success: true,
      ok: true,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      data: paginated,
      products: paginated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, ok: false, error: 'err.server', message: error.message });
  }
});

router.get('/products/:slug', (req: Request, res: Response) => {
  const slugParam = req.params.slug;
  const product = db.products.find((p) => p.slug === slugParam || p.id === slugParam);

  if (!product) {
    return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Товар не найден' });
  }

  const enriched = enrichProduct(product);
  return res.json({ success: true, ok: true, data: enriched, product: enriched });
});

export default router;
