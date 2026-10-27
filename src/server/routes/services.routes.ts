import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import { optionalAuthMiddleware, type AuthenticatedRequest } from '../auth.middleware';

const router = Router();

// 1. Promo Codes
router.get('/promocodes', (_req: Request, res: Response) => {
  const active = db.promoCodes.filter((p) => p.isActive);
  return res.json({ success: true, ok: true, promoCodes: active, data: active });
});

router.post('/promocodes/validate', (req: Request, res: Response) => {
  const { code, cartTotal } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, ok: false, message: 'Введите промокод' });
  }

  const cleanCode = code.trim().toUpperCase();
  const promo = db.promoCodes.find((p) => p.code.toUpperCase() === cleanCode && p.isActive);

  if (!promo) {
    return res.status(404).json({
      success: false,
      ok: false,
      valid: false,
      message: `Промокод "${cleanCode}" не найден или неактивен`,
    });
  }

  const total = Number(cartTotal) || 0;
  if (total > 0 && total < promo.minOrderAmount) {
    return res.status(400).json({
      success: false,
      ok: false,
      valid: false,
      message: `Промокод действует при заказе от ${promo.minOrderAmount} ₽`,
    });
  }

  const discountAmount = total > 0 ? Math.round((total * promo.discountPercent) / 100) : 0;

  return res.json({
    success: true,
    ok: true,
    valid: true,
    code: promo.code,
    discountPercent: promo.discountPercent,
    minOrderAmount: promo.minOrderAmount,
    description: promo.description,
    discountAmount,
    finalTotal: Math.max(0, total - discountAmount),
    message: `Промокод ${promo.code} (-${promo.discountPercent}%) успешно применен`,
  });
});

// 2. Trade-In Valuation Service
router.get('/trade-in', optionalAuthMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    ok: true,
    requests: db.tradeInRequests,
    data: db.tradeInRequests,
  });
});

router.post('/trade-in/estimate', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceCategory = 'smartphones', brand = 'Arc', model = 'Arc Phone', condition = 'good' } = req.body;

    const baseValuations: Record<string, number> = {
      smartphones: 22000,
      laptops: 38000,
      peripherals: 3000,
      accessories: 1000,
    };

    const conditionMultipliers: Record<string, number> = {
      excellent: 1.0,
      good: 0.8,
      working: 0.55,
      damaged: 0.25,
    };

    const base = baseValuations[deviceCategory] || 15000;
    const mult = conditionMultipliers[condition] || 0.75;
    const estimatedDiscount = Math.round((base * mult) / 100) * 100;
    const discountPercent = condition === 'excellent' ? 20 : condition === 'good' ? 15 : 10;
    const generatedCode = 'TRADEIN' + discountPercent;

    // Ensure generated promo code exists in promoCodes table so user can apply it immediately
    if (!db.promoCodes.some((p) => p.code === generatedCode)) {
      db.promoCodes.push({
        id: 'promo-' + Math.random().toString(36).slice(2, 8),
        code: generatedCode,
        discountPercent,
        minOrderAmount: 3000,
        description: `Скидка ${discountPercent}% по программе Trade-In (${brand} ${model})`,
        isActive: true,
      });
    }

    const record = {
      id: 'ti-' + Math.random().toString(36).slice(2, 10),
      userId: req.user?.userId,
      deviceCategory,
      brand,
      model,
      condition: condition as 'excellent' | 'good' | 'working' | 'damaged',
      estimatedDiscount,
      promoCode: generatedCode,
      createdAt: new Date().toISOString(),
    };

    db.tradeInRequests.unshift(record);
    db.save();

    return res.status(201).json({
      success: true,
      ok: true,
      message: `Оценка Trade-In завершена: выгода до ${estimatedDiscount} ₽ (промокод ${generatedCode} на -${discountPercent}%)`,
      estimate: record,
      data: record,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

// 3. B2B Corporate Quotes / Invoices
router.get('/b2b/quotes', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    ok: true,
    quotes: db.b2bQuotes,
    data: db.b2bQuotes,
  });
});

router.post('/b2b/quote', (req: Request, res: Response) => {
  try {
    const { companyName, inn, contactEmail, contactPhone, items } = req.body;

    if (!companyName || !inn || !contactEmail) {
      return res.status(400).json({
        success: false,
        ok: false,
        message: 'Укажите название организации (companyName), ИНН (inn) и контактный email (contactEmail)',
      });
    }

    const rawItems = Array.isArray(items) && items.length > 0
      ? items
      : [{ productId: 'prod-arc-book-15-pro', quantity: 5 }];

    const quoteLines = rawItems.map((line: any) => {
      const prod = db.products.find((p) => p.id === (line.productId || line.id) || p.slug === line.productId);
      const qty = Math.max(Number(line.quantity || line.qty) || 1, 1);
      // 7% wholesale B2B discount for 5+ units
      const unitPrice = prod ? (qty >= 5 ? Math.round(prod.price * 0.93) : prod.price) : 50000;
      return {
        productId: prod?.id || line.productId,
        title: prod?.title || 'Arc Device',
        quantity: qty,
        unitPrice,
      };
    });

    const totalAmount = quoteLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const vatAmount = Math.round((totalAmount * 20) / 120); // 20% VAT included

    const quote = {
      id: 'b2b-' + Math.random().toString(36).slice(2, 9).toUpperCase(),
      companyName: String(companyName).trim(),
      inn: String(inn).trim(),
      contactEmail: String(contactEmail).trim(),
      contactPhone: String(contactPhone || '+7 (800) 555-35-35').trim(),
      items: quoteLines,
      totalAmount,
      vatAmount,
      status: 'GENERATED' as const,
      createdAt: new Date().toISOString(),
    };

    db.b2bQuotes.unshift(quote);
    db.save();

    return res.status(201).json({
      success: true,
      ok: true,
      message: `Коммерческое предложение и счет № ${quote.id} сформированы (в т.ч. НДС 20%: ${vatAmount} ₽)`,
      quote,
      data: quote,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, ok: false, message: error.message });
  }
});

// 4. Support Chat API
router.get('/chat', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.user?.userId || 'guest';
  const history = db.chatMessages.filter((m) => m.sessionId === sessionId);
  return res.json({
    success: true,
    ok: true,
    messages: history,
    data: history,
  });
});

router.post('/chat', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;
  const clean = String(text || '').trim().slice(0, 500);

  if (!clean) {
    return res.status(400).json({ success: false, ok: false, message: 'Сообщение не может быть пустым' });
  }

  const sessionId = req.user?.userId || 'guest';
  const now = new Date().toISOString();

  const userMsg = {
    id: 'msg-' + Math.random().toString(36).slice(2, 9),
    sessionId,
    from: 'me' as const,
    text: clean,
    createdAt: now,
  };
  db.chatMessages.push(userMsg);

  const lower = clean.toLowerCase();
  let replyText = '';

  if (lower.includes('промокод') || lower.includes('скидк') || lower.includes('promo') || lower.includes('sale')) {
    replyText = 'Действующие промокоды ARCSHOP: WELCOME (-5% от 1 000 ₽), ARC2026 (-10% от 5 000 ₽) и PRODEV (-15% от 40 000 ₽). Вы можете применить их прямо в корзине!';
  } else if (lower.includes('доставк') || lower.includes('курьер') || lower.includes('shipping')) {
    replyText = 'Доставка курьером по Москве и СПб осуществляется на следующий день. В регионы отправляем экспресс-доставкой СДЭК за 2–4 дня.';
  } else if (lower.includes('гаранти') || lower.includes('care') || lower.includes('warranty')) {
    replyText = 'На всю технику действует официальная гарантия 12 месяцев. Также при оформлении заказа можно подключить пакет ArcCare+ с экспресс-заменой устройства за 24 часа.';
  } else if (lower.includes('сплит') || lower.includes('рассрочк') || lower.includes('оплат') || lower.includes('payment')) {
    replyText = 'Доступны: оплата картой (МИР/Visa/Mastercard), СБП, оплата частями «Сплит» на 4 платежа без переплат и выставление B2B-счета с НДС.';
  } else if (lower.includes('trade') || lower.includes('трейд')) {
    replyText = 'По программе Trade-In вы можете обменять старый смартфон или ноутбук со скидкой до 20% на новое устройство Arc.';
  } else {
    replyText = 'Консультант ARCSHOP на связи! С радостью помогу подобрать смартфон или ультрабук, расскажу про промокоды (например, ARC2026), условия доставки и гарантии ArcCare+.';
  }

  const supportMsg = {
    id: 'msg-' + Math.random().toString(36).slice(2, 9),
    sessionId,
    from: 'support' as const,
    text: replyText,
    createdAt: new Date(Date.now() + 100).toISOString(),
  };
  db.chatMessages.push(supportMsg);
  db.save();

  return res.status(201).json({
    success: true,
    ok: true,
    userMessage: userMsg,
    reply: supportMsg,
    data: supportMsg,
  });
});

router.delete('/chat', optionalAuthMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.user?.userId || 'guest';
  const remaining = db.chatMessages.filter((m) => m.sessionId !== sessionId);
  db.chatMessages.length = 0;
  db.chatMessages.push(...remaining);
  db.save();

  return res.json({ success: true, ok: true, message: 'История чата очищена' });
});

export default router;
