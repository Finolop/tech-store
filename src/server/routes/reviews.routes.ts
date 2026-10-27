import { Router } from 'express';
import type { Response } from 'express';
import { db, type ReviewEntity } from '../db';
import { authMiddleware, optionalAuthMiddleware, type AuthenticatedRequest } from '../auth.middleware';

const router = Router({ mergeParams: true });

router.get('/:productId/reviews', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.productId;
    const product = db.products.find((p) => p.id === rawId || p.slug === rawId);
    const productId = product ? product.id : rawId;
    const currentUserId = req.user?.userId;

    const reviews = db.reviews
      .filter((r) => r.productId === productId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;

    for (const r of reviews) {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating - 1] += 1;
        sum += r.rating;
      }
    }

    const count = reviews.length;
    const rating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    let blocked: 'login' | 'purchase' | 'reviewed' | null = 'login';

    if (currentUserId) {
      const alreadyReviewed = reviews.some((r) => r.userId === currentUserId);
      if (alreadyReviewed) {
        blocked = 'reviewed';
      } else {
        const userOrders = db.orders.filter(
          (o) => o.userId === currentUserId && ['PAID', 'SHIPPED', 'DELIVERED'].includes(o.status),
        );
        const hasPurchased = userOrders.some((order) => {
          const items = db.orderItems.filter((i) => i.orderId === order.id);
          return items.some((i) => i.productId === productId);
        });

        blocked = hasPurchased ? null : 'purchase';
      }
    }

    const formattedReviews = reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAt,
      isMine: r.userId === currentUserId,
    }));

    return res.json({
      success: true,
      ok: true,
      reviews: formattedReviews,
      summary: {
        rating,
        count,
        distribution,
      },
      blocked,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, ok: false, error: 'err.server', message: error.message });
  }
});

router.post('/:productId/reviews', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const productId = req.params.productId;
    const { rating, text } = req.body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.reviewInvalid',
        message: 'Оценка должна быть целым числом от 1 до 5',
      });
    }

    const cleanText = (text || '').trim();
    if (cleanText.length < 3 || cleanText.length > 2000) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.reviewInvalid',
        message: 'Текст отзыва должен содержать от 3 до 2000 символов',
      });
    }

    const product = db.products.find((p) => p.id === productId || p.slug === productId);
    if (!product) {
      return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Товар не найден' });
    }

    const userOrders = db.orders.filter(
      (o) => o.userId === currentUserId && ['PAID', 'SHIPPED', 'DELIVERED'].includes(o.status),
    );
    const hasPurchased = userOrders.some((order) => {
      const items = db.orderItems.filter((i) => i.orderId === order.id);
      return items.some((i) => i.productId === product.id);
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        ok: false,
        error: 'err.reviewNeedsPurchase',
        message: 'Отзыв можно оставить только после покупки товара',
      });
    }

    const existing = db.reviews.find((r) => r.productId === product.id && r.userId === currentUserId);
    if (existing) {
      return res.status(409).json({
        success: false,
        ok: false,
        error: 'err.alreadyReviewed',
        message: 'Вы уже оставили отзыв на этот товар',
      });
    }

    const user = db.users.find((u) => u.id === currentUserId);
    const authorName = user ? `${user.firstName} ${user.lastName ? user.lastName[0] + '.' : ''}` : 'Покупатель';

    const newReview: ReviewEntity = {
      id: 'rev-' + Math.random().toString(36).slice(2, 10),
      productId: product.id,
      userId: currentUserId,
      authorName,
      rating: numRating,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    db.reviews.push(newReview);
    db.save();

    return res.status(201).json({
      success: true,
      ok: true,
      message: 'Отзыв успешно добавлен',
      data: newReview,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, error: 'err.server', message: error.message });
  }
});

// Edit review
router.patch('/:productId/reviews/:reviewId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const reviewId = req.params.reviewId;
    const { rating, text } = req.body;

    const review = db.reviews.find((r) => r.id === reviewId);
    if (!review) {
      return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Отзыв не найден' });
    }

    if (review.userId !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, ok: false, message: 'Можно редактировать только свой отзыв' });
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (numRating >= 1 && numRating <= 5) {
        review.rating = numRating;
      }
    }

    if (text !== undefined) {
      const cleanText = String(text).trim();
      if (cleanText.length >= 3 && cleanText.length <= 2000) {
        review.text = cleanText;
      }
    }

    db.save();
    return res.json({ success: true, ok: true, message: 'Отзыв обновлен', data: review });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

// Delete review
router.delete('/:productId/reviews/:reviewId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const reviewId = req.params.reviewId;

    const idx = db.reviews.findIndex((r) => r.id === reviewId);
    if (idx < 0) {
      return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Отзыв не найден' });
    }

    if (db.reviews[idx].userId !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, ok: false, message: 'Можно удалить только свой отзыв' });
    }

    db.reviews.splice(idx, 1);
    db.save();
    return res.json({ success: true, ok: true, message: 'Отзыв удален' });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

export default router;
