import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../presenter/i18n-context';
import { formatMoney } from '../../presenter/format';
import { useProductLink } from '../../presenter/use-product-link';
import { useShop } from '../../presenter/shop-context';
import type { Product } from '../../model/types';
import { Icon } from '../ui/Icon';
import { ProductImage } from './ProductImage';
import { Stars } from '../ui/Stars';

export function ProductCard({ product }: { product: Product }) {
  const { lang, t, tf } = useI18n();
  const { isFavorite, toggleFavorite, addToCart } = useShop();
  const linkTo = useProductLink();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<number | null>(null);
  const fav = isFavorite(product.id);

  const handleBuy = () => {
    addToCart(product.id);
    setJustAdded(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <article className="pcard">
      <div className="pcard-stage">
        <ProductImage product={product} />
        {product.badge && <span className={`pbadge pbadge-${product.badge}`}>{t(`shop.badge.${product.badge}`)}</span>}
        <button
          type="button"
          className={fav ? 'pfav on' : 'pfav'}
          aria-pressed={fav}
          aria-label={fav ? t('shop.inFav') : t('shop.addFav')}
          title={fav ? t('shop.inFav') : t('shop.addFav')}
          onClick={() => toggleFavorite(product.id)}
        >
          <Icon name="heart" />
        </button>
      </div>

      <div className="pcard-body">
        <span className="pbrand">{product.brand}</span>
        <h3 className="pname">
          <Link to={linkTo(product.id)} className="pname-link">
            {product.name}
          </Link>
        </h3>

        <p className="prating">
          <Stars value={product.rating} />
          <span>{product.reviewCount > 0 ? tf('shop.reviewsCount', { n: product.reviewCount }) : t('shop.noReviews')}</span>
        </p>

        <div className="pprice">
          <strong>{formatMoney(product.price, lang)}</strong>
          {product.oldPrice && <s>{formatMoney(product.oldPrice, lang)}</s>}
        </div>

        <button type="button" className="pbuy" data-added={justAdded || undefined} onClick={handleBuy}>
          <span className="pbuy-idle">
            <Icon name="cart" />
            <span>{t('shop.buy')}</span>
          </span>
          <span className="pbuy-done" aria-hidden={!justAdded}>
            <Icon name="check" />
            <span>{t('shop.added')}</span>
          </span>
        </button>
      </div>
    </article>
  );
}
