import { Router } from 'express';
import type { Response } from 'express';
import { db, type QuestionEntity, type AnswerEntity } from '../db';
import { authMiddleware, optionalAuthMiddleware, type AuthenticatedRequest } from '../auth.middleware';

const router = Router();

router.get('/products/:productId/questions', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawId = req.params.productId;
    const currentUserId = req.user?.userId;

    const product = db.products.find((p) => p.id === rawId || p.slug === rawId);
    const productId = product ? product.id : rawId;

    const questions = db.questions
      .filter((q) => q.productId === productId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Check which users have bought this product
    const purchasers = new Set<string>();
    const paidOrders = db.orders.filter((o) => ['PAID', 'SHIPPED', 'DELIVERED'].includes(o.status));
    for (const order of paidOrders) {
      const items = db.orderItems.filter((i) => i.orderId === order.id && i.productId === productId);
      if (items.length > 0) {
        purchasers.add(order.userId);
      }
    }

    const formattedQuestions = questions.map((q) => {
      const answers = db.answers
        .filter((a) => a.questionId === q.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((a) => {
          const answeringUser = db.users.find((u) => u.id === a.userId);
          const isShop = answeringUser?.role === 'ADMIN' || a.authorName.includes('ARCSHOP');
          const isBuyer = purchasers.has(a.userId);

          return {
            id: a.id,
            authorName: a.authorName,
            text: a.text,
            createdAt: a.createdAt,
            isMine: a.userId === currentUserId,
            isBuyer,
            isShop,
          };
        });

      return {
        id: q.id,
        authorName: q.authorName,
        text: q.text,
        createdAt: q.createdAt,
        isMine: q.userId === currentUserId,
        answers,
      };
    });

    return res.json({ success: true, ok: true, questions: formattedQuestions });
  } catch (error: any) {
    return res.status(500).json({ success: false, ok: false, error: 'err.server', message: error.message });
  }
});

router.post('/products/:productId/questions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const rawId = req.params.productId;
    const { text } = req.body;

    const product = db.products.find((p) => p.id === rawId || p.slug === rawId);
    const productId = product ? product.id : rawId;

    const cleanText = (text || '').trim();
    if (cleanText.length < 5 || cleanText.length > 500) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.questionInvalid',
        message: 'Текст вопроса должен быть от 5 до 500 символов',
      });
    }

    const user = db.users.find((u) => u.id === currentUserId);
    const authorName = user ? `${user.firstName} ${user.lastName ? user.lastName[0] + '.' : ''}` : 'Покупатель';

    const newQuestion: QuestionEntity = {
      id: 'q-' + Math.random().toString(36).slice(2, 10),
      productId,
      userId: currentUserId,
      authorName,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    db.questions.push(newQuestion);
    db.save();

    return res.status(201).json({
      success: true,
      ok: true,
      message: 'Вопрос опубликован',
      data: newQuestion,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, error: 'err.server', message: error.message });
  }
});

router.post('/questions/:questionId/answers', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const questionId = req.params.questionId;
    const { text } = req.body;

    const question = db.questions.find((q) => q.id === questionId);
    if (!question) {
      return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Вопрос не найден' });
    }

    const cleanText = (text || '').trim();
    if (cleanText.length < 2 || cleanText.length > 500) {
      return res.status(400).json({
        success: false,
        ok: false,
        error: 'err.questionInvalid',
        message: 'Текст ответа должен быть от 2 до 500 символов',
      });
    }

    const user = db.users.find((u) => u.id === currentUserId);
    const authorName =
      user?.role === 'ADMIN'
        ? 'Магазин ARCSHOP'
        : user
        ? `${user.firstName} ${user.lastName ? user.lastName[0] + '.' : ''}`
        : 'Покупатель';

    const newAnswer: AnswerEntity = {
      id: 'ans-' + Math.random().toString(36).slice(2, 10),
      questionId,
      userId: currentUserId,
      authorName,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    db.answers.push(newAnswer);
    db.save();

    return res.status(201).json({
      success: true,
      ok: true,
      message: 'Ответ опубликован',
      data: newAnswer,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, error: 'err.server', message: error.message });
  }
});

// Delete question (author or Admin)
router.delete('/questions/:questionId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const questionId = req.params.questionId;

    const idx = db.questions.findIndex((q) => q.id === questionId);
    if (idx < 0) {
      return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Вопрос не найден' });
    }

    if (db.questions[idx].userId !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, ok: false, message: 'Можно удалить только свой вопрос' });
    }

    db.questions.splice(idx, 1);
    const remainingAnswers = db.answers.filter((a) => a.questionId !== questionId);
    db.answers.length = 0;
    db.answers.push(...remainingAnswers);
    db.save();

    return res.json({ success: true, ok: true, message: 'Вопрос удален' });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

// Delete answer (author or Admin)
router.delete('/answers/:answerId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const answerId = req.params.answerId;

    const idx = db.answers.findIndex((a) => a.id === answerId);
    if (idx < 0) {
      return res.status(404).json({ success: false, ok: false, error: 'err.notFound', message: 'Ответ не найден' });
    }

    if (db.answers[idx].userId !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, ok: false, message: 'Можно удалить только свой ответ' });
    }

    db.answers.splice(idx, 1);
    db.save();

    return res.json({ success: true, ok: true, message: 'Ответ удален' });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

// Direct review edit/delete aliases (/api/v1/reviews/:reviewId)
router.patch('/reviews/:reviewId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
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
      if (numRating >= 1 && numRating <= 5) review.rating = numRating;
    }

    if (text !== undefined) {
      const cleanText = String(text).trim();
      if (cleanText.length >= 3 && cleanText.length <= 2000) review.text = cleanText;
    }

    db.save();
    return res.json({ success: true, ok: true, message: 'Отзыв обновлен', data: review });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

router.delete('/reviews/:reviewId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
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
