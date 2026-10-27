import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../../presenter/catalog-context';
import { useI18n } from '../../presenter/i18n-context';
import { apiGet, apiPost } from '../../model/api';
import { formatMoney } from '../../presenter/format';
import { useProductLink } from '../../presenter/use-product-link';
import { useShop } from '../../presenter/shop-context';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import { ProductImage } from '../catalog/ProductImage';

interface ChatMessage {
  id: string;
  from: 'me' | 'support';
  text: string;
}

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void apiGet<{ data?: ChatMessage[] }>('/chat').then((res) => {
      if (cancelled || !res.ok || !Array.isArray(res.data)) return;
      if (res.data.length > 0) {
        setMessages(res.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setText('');

    const optimisticId = `temp-${Date.now()}`;
    setMessages((list) => [...list, { id: optimisticId, from: 'me', text: clean }]);

    const res = await apiPost<{ userMessage?: ChatMessage; supportReply?: ChatMessage }>('/chat', { text: clean });
    if (res.ok && res.supportReply) {
      setMessages((list) => [
        ...list.filter((m) => m.id !== optimisticId),
        ...(res.userMessage ? [res.userMessage] : [{ id: optimisticId, from: 'me' as const, text: clean }]),
        res.supportReply!,
      ]);
    } else {
      window.setTimeout(() => {
        setMessages((list) => [...list, { id: `s-${Date.now()}`, from: 'support', text: t('support.autoReply') }]);
      }, 450);
    }
  };

  return (
    <Popover open={open} onClose={() => setOpen(false)}>
      <button
        type="button"
        className="round-btn"
        aria-label={t('shell.support')}
        aria-expanded={open}
        title={t('shell.support')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="chat" />
      </button>
      {open && (
        <div className="pop-panel" role="dialog" aria-label={t('support.title')}>
          <div className="pop-header">
            <h2>{t('support.title')}</h2>
            <span className="status">{t('support.online')}</span>
          </div>
          <div className="pop-body chat-log" ref={logRef}>
            <p className="msg">{t('support.greeting')}</p>
            {messages.map((m) => (
              <p key={m.id} className={m.from === 'me' ? 'msg msg-me' : 'msg'}>
                {m.text}
              </p>
            ))}
          </div>
          <form className="chat-form" onSubmit={send}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('support.placeholder')}
              aria-label={t('support.placeholder')}
            />
            <button type="submit" className="send-btn" aria-label={t('support.send')} disabled={!text.trim()}>
              <Icon name="send" />
            </button>
          </form>
        </div>
      )}
    </Popover>
  );
}

export function FavoritesButton() {
  const [open, setOpen] = useState(false);
  const { lang, t } = useI18n();
  const { favorites, toggleFavorite, clearFavorites, addToCart } = useShop();
  const { byId } = useCatalog();
  const linkTo = useProductLink();
  const items = favorites.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <Popover open={open} onClose={() => setOpen(false)}>
      <button
        type="button"
        className="round-btn"
        aria-label={t('shell.favorites')}
        aria-expanded={open}
        title={t('shell.favorites')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="heart" />
        {items.length > 0 && <span className="badge">{items.length}</span>}
      </button>
      {open && (
        <div className="pop-panel" role="dialog" aria-label={t('fav.title')}>
          <div className="pop-header">
            <h2>{t('fav.title')}</h2>
            {items.length > 0 && (
              <button type="button" className="link-btn" onClick={clearFavorites}>
                {t('fav.clear')}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="empty">
              <Icon name="heart" />
              <p>{t('fav.empty')}</p>
            </div>
          ) : (
            <ul className="pop-body list">
              {items.map((item) => (
                <li key={item.id} className="row">
                  <span className="thumb">
                    <ProductImage product={item} />
                  </span>
                  <div className="row-info">
                    <Link to={linkTo(item.id)} className="row-name" onClick={() => setOpen(false)}>
                      {item.name}
                    </Link>
                    <span className="row-price">{formatMoney(item.price, lang)}</span>
                  </div>
                  <button type="button" className="chip-btn" onClick={() => addToCart(item.id)}>
                    {t('fav.toCart')}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('fav.remove')}
                    title={t('fav.remove')}
                    onClick={() => toggleFavorite(item.id)}
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}

export function CartButton() {
  const [open, setOpen] = useState(false);
  const { lang, t, tf } = useI18n();
  const navigate = useNavigate();
  const {
    cart,
    cartCount,
    cartTotal,
    changeQty,
    removeFromCart,
    clearCart,
    compareIds,
    toggleCompare,
    setCompareIds,
    setCheckoutOpen,
  } = useShop();
  const { byId } = useCatalog();
  const linkTo = useProductLink();

  const entries = cart
    .map((entry) => ({ product: byId.get(entry.id), qty: entry.qty }))
    .filter((entry): entry is { product: NonNullable<typeof entry.product>; qty: number } => Boolean(entry.product));

  const selectedInCart = entries
    .map((e) => e.product)
    .filter((p) => compareIds.includes(p.id));
  const sameCategory =
    selectedInCart.length >= 2 && selectedInCart.every((p) => p.category === selectedInCart[0].category);

  const goCompare = () => {
    setCompareIds(selectedInCart.map((p) => p.id));
    setOpen(false);
    navigate('/compare');
  };

  const openCheckoutModal = () => {
    setOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <Popover open={open} onClose={() => setOpen(false)}>
      <button
        type="button"
        className="round-btn"
        aria-label={t('shell.cart')}
        aria-expanded={open}
        title={t('shell.cart')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="cart" />
        {cartCount > 0 && <span className="badge">{cartCount}</span>}
      </button>
      {open && (
        <div className="pop-panel" role="dialog" aria-label={t('cart.title')}>
          <div className="pop-header">
            <h2>{t('cart.title')}</h2>
            {entries.length > 0 && (
              <button type="button" className="link-btn" onClick={clearCart}>
                {t('cart.clear')}
              </button>
            )}
          </div>
          {entries.length === 0 ? (
            <div className="empty">
              <Icon name="cart" />
              <p>{t('cart.empty')}</p>
            </div>
          ) : (
            <>
              <ul className="pop-body list">
                {entries.map(({ product, qty }) => {
                  const checked = compareIds.includes(product.id);
                  return (
                    <li key={product.id} className="row">
                      <span className="thumb">
                        <ProductImage product={product} />
                      </span>
                      <div className="row-info">
                        <Link to={linkTo(product.id)} className="row-name" onClick={() => setOpen(false)}>
                          {product.name}
                        </Link>
                        <span className="row-price">{formatMoney(product.price * qty, lang)}</span>
                        <label className="cmp-check">
                          <input type="checkbox" checked={checked} onChange={() => toggleCompare(product.id)} />
                          <span>{t('cart.compareSelect')}</span>
                        </label>
                      </div>
                      <div className="stepper">
                        <button type="button" aria-label={t('cart.less')} onClick={() => changeQty(product.id, -1)}>
                          <Icon name="minus" />
                        </button>
                        <output>{qty}</output>
                        <button type="button" aria-label={t('cart.more')} onClick={() => changeQty(product.id, +1)}>
                          <Icon name="plus" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t('cart.remove')}
                        title={t('cart.remove')}
                        onClick={() => removeFromCart(product.id)}
                      >
                        <Icon name="trash" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="pop-footer">
                {selectedInCart.length > 0 &&
                  (sameCategory ? (
                    <button type="button" className="btn btn-outline btn-block" onClick={goCompare}>
                      {tf('cart.compareBtn', { n: selectedInCart.length })}
                    </button>
                  ) : (
                    <p className="cmp-hint">{t('cart.compareSameCat')}</p>
                  ))}

                <p className="total">
                  <span>{t('cart.total')}</span>
                  <strong>{formatMoney(cartTotal, lang)}</strong>
                </p>

                <button type="button" className="btn btn-block" onClick={openCheckoutModal}>
                  {t('cart.checkout')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}
