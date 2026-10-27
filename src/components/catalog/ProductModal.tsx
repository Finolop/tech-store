import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../presenter/auth-context';
import { useCatalog } from '../../presenter/catalog-context';
import { useI18n } from '../../presenter/i18n-context';
import type { TranslationKey } from '../../model/i18n';
import { apiGet } from '../../model/api';
import { formatMoney, pick, specText } from '../../presenter/format';
import { CATEGORY_ROUTE, SPEC_DEFS } from '../../model/specs';
import type { Category } from '../../model/specs';
import { useShop } from '../../presenter/shop-context';
import type { Product, Question, Review, ReviewBlock, ReviewSummary } from '../../model/types';
import { Icon } from '../ui/Icon';
import { ProductImage } from './ProductImage';
import { QuestionsTab, ReviewsTab, SpecsTab } from './ProductTabs';
import { Stars } from '../ui/Stars';

type Tab = 'specs' | 'reviews' | 'questions';
const TABS: Tab[] = ['specs', 'reviews', 'questions'];

const CATEGORY_LABEL: Record<Category, TranslationKey> = {
  smartphones: 'nav.smartphones',
  laptops: 'nav.laptops',
  peripherals: 'nav.peripherals',
  accessories: 'nav.accessories',
  software: 'nav.software',
};

interface Details {
  reviews: Review[];
  summary: ReviewSummary;
  canReview: boolean;
  reason: ReviewBlock;
  questions: Question[];
}

export function ProductModal() {
  const [params, setParams] = useSearchParams();
  const productId = params.get('product');
  const { byId } = useCatalog();
  const product = productId ? byId.get(productId) ?? null : null;

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('product');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (!product) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('modal-open');
    };
  });

  if (!product) return null;
  return <ModalBody key={product.id} product={product} onClose={close} />;
}

function ModalBody({ product, onClose }: { product: Product; onClose: () => void }) {
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, addToCart } = useShop();
  const [tab, setTab] = useState<Tab>('specs');
  const [added, setAdded] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [details, setDetails] = useState<Details>({
    reviews: [],
    summary: { rating: product.rating, count: product.reviewCount, distribution: [0, 0, 0, 0, 0] },
    canReview: false,
    reason: 'login',
    questions: [],
  });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      apiGet<{ reviews: Review[]; summary: ReviewSummary; canReview: boolean; reason: ReviewBlock }>(
        `/products/${product.id}/reviews`,
      ),
      apiGet<{ questions: Question[] }>(`/products/${product.id}/questions`),
    ]).then(([rv, qa]) => {
      if (cancelled) return;
      setDetails({
        reviews: rv.ok ? rv.reviews : [],
        summary: rv.ok ? rv.summary : { rating: product.rating, count: product.reviewCount, distribution: [0, 0, 0, 0, 0] },
        canReview: rv.ok ? rv.canReview : false,
        reason: rv.ok ? rv.reason : 'login',
        questions: qa.ok ? qa.questions : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, product.rating, product.reviewCount, user, reloadTick]);

  const highlights = (SPEC_DEFS[product.category] || []).filter((d) => d.highlight);
  const fav = isFavorite(product.id);

  const onTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const idx = TABS.indexOf(tab);
    const next = TABS[(idx + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next);
    tabRefs.current[TABS.indexOf(next)]?.focus();
  };

  const handleBuy = () => {
    addToCart(product.id);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1100);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('shop.close')}>
          <Icon name="x" />
        </button>

        <div className="modal-top">
          <div className="modal-stage">
            <ProductImage product={product} />
            {product.badge && <span className={`pbadge pbadge-${product.badge}`}>{t(`shop.badge.${product.badge}`)}</span>}
          </div>

          <div className="modal-info">
            <Link to={CATEGORY_ROUTE[product.category]} className="modal-crumb" onClick={onClose}>
              {t(CATEGORY_LABEL[product.category])} · {product.brand}
            </Link>

            <div className="modal-titlerow">
              <h2 id="modal-title">{product.name}</h2>
              <button
                type="button"
                className="ask-btn"
                title={t('shop.askQuick')}
                aria-label={t('shop.askQuick')}
                onClick={() => setTab('questions')}
              >
                <Icon name="chat" />
                {details.questions.length > 0 && <span className="badge">{details.questions.length}</span>}
              </button>
            </div>

            <button type="button" className="modal-rating" onClick={() => setTab('reviews')}>
              <Stars value={details.summary.rating} />
              <span>
                {details.summary.count > 0
                  ? `${details.summary.rating.toFixed(1)} · ${details.summary.count}`
                  : t('shop.noReviews')}
              </span>
            </button>

            <div className="pprice modal-price">
              <strong>{formatMoney(product.price, lang)}</strong>
              {product.oldPrice && <s>{formatMoney(product.oldPrice, lang)}</s>}
            </div>

            <p className="modal-desc">{pick(product.description, lang)}</p>

            {highlights.length > 0 && (
              <ul className="chips">
                {highlights.map((def) => (
                  <li key={def.key} className="chip">
                    <small>{pick(def.label, lang)}</small>
                    <span>{specText(def, product.specs[def.key], lang, t)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="modal-actions">
              <button type="button" className="pbuy modal-buy" data-added={added || undefined} onClick={handleBuy}>
                <span className="pbuy-idle">
                  <Icon name="cart" />
                  <span>{t('shop.buy')}</span>
                </span>
                <span className="pbuy-done" aria-hidden={!added}>
                  <Icon name="check" />
                  <span>{t('shop.added')}</span>
                </span>
              </button>
              <button
                type="button"
                className={fav ? 'pfav pfav-lg on' : 'pfav pfav-lg'}
                aria-pressed={fav}
                aria-label={fav ? t('shop.inFav') : t('shop.addFav')}
                onClick={() => toggleFavorite(product.id)}
              >
                <Icon name="heart" />
              </button>
            </div>
          </div>
        </div>

        <div className="modal-tabs">
          <div className="tablist" role="tablist" onKeyDown={onTabKey}>
            {TABS.map((key, idx) => {
              const count = key === 'reviews' ? details.summary.count : key === 'questions' ? details.questions.length : null;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  tabIndex={tab === key ? 0 : -1}
                  className={tab === key ? 'tab on' : 'tab'}
                  onClick={() => setTab(key)}
                >
                  <span>{t(`tab.${key}`)}</span>
                  {count !== null && <span className="tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="tabpanel" role="tabpanel">
            {tab === 'specs' && <SpecsTab product={product} />}
            {tab === 'reviews' && (
              <ReviewsTab
                productId={product.id}
                reviews={details.reviews}
                summary={details.summary}
                canReview={details.canReview}
                reason={details.reason}
                onReload={() => setReloadTick((v) => v + 1)}
              />
            )}
            {tab === 'questions' && (
              <QuestionsTab
                productId={product.id}
                questions={details.questions}
                onReload={() => setReloadTick((v) => v + 1)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
