import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../../model/api';
import type { TranslationKey } from '../../model/i18n';
import type { OrderSummary } from '../../model/types';
import { useAuth } from '../../presenter/auth-context';
import { useCatalog } from '../../presenter/catalog-context';
import { formatMoney } from '../../presenter/format';
import { useI18n } from '../../presenter/i18n-context';
import { useShop } from '../../presenter/shop-context';
import { ProductImage } from '../catalog/ProductImage';
import { Icon } from '../ui/Icon';

export function CheckoutModal() {
  const { checkoutOpen, setCheckoutOpen, cart, cartCount, cartTotal, clearCart } = useShop();
  const { byId, refresh: refreshCatalog } = useCatalog();
  const { user } = useAuth();
  const { lang, t, tf } = useI18n();

  const [recipientName, setRecipientName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'SBP'>('CARD');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number; percent: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [warrantyCare, setWarrantyCare] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutOpen) return;
    if (user) {
      setRecipientName((prev) => prev || `${user.firstName} ${user.lastName}`.trim());
      setContactPhone((prev) => prev || user.phone || '');
    }
  }, [checkoutOpen, user]);

  useEffect(() => {
    if (!checkoutOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('modal-open');
    };
  });

  if (!checkoutOpen) return null;

  const entries = cart
    .map((entry) => ({ product: byId.get(entry.id), qty: entry.qty }))
    .filter((entry): entry is { product: NonNullable<typeof entry.product>; qty: number } => Boolean(entry.product));

  const discountAmount = appliedPromo ? Math.round((cartTotal * appliedPromo.percent) / 100) : 0;
  const warrantyPrice = warrantyCare ? Math.round(cartTotal * 0.08) : 0;
  const finalTotal = Math.max(0, cartTotal - discountAmount + warrantyPrice);

  const handleClose = () => {
    setCheckoutOpen(false);
    setCompletedOrderId(null);
    setError(null);
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoMsg(null);
    const res = await apiPost<{
      valid?: boolean;
      code?: string;
      discountPercent?: number;
      discountAmount?: number;
      message?: string;
    }>('/promo/validate', { code: promoInput.trim(), orderAmount: cartTotal });

    if (res.ok && res.valid && res.code && res.discountPercent) {
      setAppliedPromo({
        code: res.code,
        percent: res.discountPercent,
        discountAmount: res.discountAmount || 0,
      });
      setPromoMsg(res.message || `Скидка -${res.discountPercent}% применена`);
    } else {
      setAppliedPromo(null);
      setPromoMsg((res as any).message || 'Промокод недействителен или сумма заказа недостаточна');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipientName.trim() || !contactPhone.trim() || !deliveryAddress.trim()) {
      setError('err.required');
      return;
    }

    setError(null);
    setSubmitting(true);

    const res = await apiPost<{ order: OrderSummary }>('/orders', {
      items: cart.map((entry) => ({ id: entry.id, productId: entry.id, qty: entry.qty, quantity: entry.qty })),
      recipientName: recipientName.trim(),
      contactPhone: contactPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      comment: comment.trim() || undefined,
      promoCode: appliedPromo?.code || null,
      warrantyCare,
      paymentMethod,
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    clearCart();
    setAppliedPromo(null);
    setPromoInput('');
    setPromoMsg(null);
    setWarrantyCare(false);
    setCompletedOrderId(res.order.id);
    refreshCatalog();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
        <button type="button" className="modal-close" onClick={handleClose} aria-label={t('shop.close')}>
          <Icon name="x" />
        </button>

        {completedOrderId ? (
          <div className="checkout-success">
            <div className="checkout-success-icon">
              <Icon name="check" />
            </div>
            <h2 id="checkout-modal-title">{tf('checkout.successTitle', { id: completedOrderId })}</h2>
            <p className="muted">{t('checkout.successDesc')}</p>
            <div className="checkout-success-actions">
              {user && (
                <Link to="/orders" className="btn" onClick={handleClose}>
                  {t('checkout.goOrders')}
                </Link>
              )}
              <button type="button" className="btn btn-outline" onClick={handleClose}>
                {t('shop.close')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="checkout-header">
              <h2 id="checkout-modal-title">{t('checkout.title')}</h2>
              <p className="muted">{t('checkout.subtitle')}</p>
            </div>

            {entries.length === 0 ? (
              <div className="empty">
                <Icon name="cart" />
                <p>{t('cart.empty')}</p>
              </div>
            ) : (
              <form className="checkout-body" onSubmit={handleSubmit} noValidate>
                <div className="checkout-col-main">
                  <div className="checkout-section">
                    <label className="checkout-label">
                      <span>{t('checkout.recipient')} *</span>
                      <input
                        type="text"
                        className="checkout-input"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Алексей Морозов"
                        required
                      />
                    </label>

                    <label className="checkout-label">
                      <span>{t('checkout.phone')} *</span>
                      <input
                        type="tel"
                        className="checkout-input"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+7 (999) 000-00-00"
                        required
                      />
                    </label>

                    <label className="checkout-label">
                      <span>{t('checkout.address')} *</span>
                      <input
                        type="text"
                        className="checkout-input"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="г. Москва, ул. Тверская, д. 12, кв. 34"
                        required
                      />
                    </label>

                    <label className="checkout-label">
                      <span>{t('checkout.comment')}</span>
                      <textarea
                        className="checkout-textarea"
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Код домофона, удобное время доставки…"
                      />
                    </label>
                  </div>

                  <div className="checkout-section">
                    <span className="checkout-section-title">{t('checkout.payment')}</span>
                    <div className="checkout-pay-methods" role="radiogroup" aria-label={t('checkout.payment')}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentMethod === 'CARD'}
                        className={paymentMethod === 'CARD' ? 'checkout-pay-card active' : 'checkout-pay-card'}
                        onClick={() => setPaymentMethod('CARD')}
                      >
                        <span className="checkout-pay-radio" />
                        <span className="checkout-pay-title">{t('checkout.payCard')}</span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentMethod === 'SBP'}
                        className={paymentMethod === 'SBP' ? 'checkout-pay-card active' : 'checkout-pay-card'}
                        onClick={() => setPaymentMethod('SBP')}
                      >
                        <span className="checkout-pay-radio" />
                        <span className="checkout-pay-title">{t('checkout.paySbp')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="checkout-col-side">
                  <ul className="checkout-items">
                    {entries.map(({ product, qty }) => (
                      <li key={product.id} className="checkout-item">
                        <span className="thumb">
                          <ProductImage product={product} />
                        </span>
                        <div className="checkout-item-info">
                          <span className="checkout-item-name">{product.name}</span>
                          <span className="checkout-item-meta">
                            {qty} × {formatMoney(product.price, lang)}
                          </span>
                        </div>
                        <strong className="checkout-item-sum">{formatMoney(product.price * qty, lang)}</strong>
                      </li>
                    ))}
                  </ul>

                  <div className="checkout-promo">
                    <input
                      type="text"
                      className="checkout-input"
                      placeholder={t('checkout.promoPlaceholder')}
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                    />
                    <button type="button" className="chip-btn" onClick={handleApplyPromo}>
                      {t('checkout.promoApply')}
                    </button>
                  </div>
                  {promoMsg && (
                    <p className="checkout-promo-msg" data-valid={Boolean(appliedPromo)}>
                      {promoMsg}
                    </p>
                  )}

                  <label className="checkout-warranty">
                    <input
                      type="checkbox"
                      checked={warrantyCare}
                      onChange={(e) => setWarrantyCare(e.target.checked)}
                    />
                    <span>
                      {t('checkout.warranty')} (+{formatMoney(Math.round(cartTotal * 0.08), lang)})
                    </span>
                  </label>

                  <div className="checkout-summary">
                    <div className="checkout-summary-row">
                      <span>{tf('checkout.subtotal', { n: cartCount })}</span>
                      <span>{formatMoney(cartTotal, lang)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="checkout-summary-row discount">
                        <span>
                          {t('checkout.discount')} ({appliedPromo?.code})
                        </span>
                        <span>−{formatMoney(discountAmount, lang)}</span>
                      </div>
                    )}
                    {warrantyCare && (
                      <div className="checkout-summary-row">
                        <span>{t('checkout.warrantyRow')}</span>
                        <span>+{formatMoney(warrantyPrice, lang)}</span>
                      </div>
                    )}
                    <div className="checkout-summary-total">
                      <span>{t('cart.total')}</span>
                      <strong>{formatMoney(finalTotal, lang)}</strong>
                    </div>
                  </div>

                  {error && <p className="message">{t(error)}</p>}

                  <button type="submit" className="btn btn-block" disabled={submitting}>
                    {submitting ? t('checkout.submitting') : t('checkout.submit')}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
