import { useMemo, useState } from 'react';
import { useCatalog } from '../../presenter/catalog-context';
import { useI18n } from '../../presenter/i18n-context';
import type { TranslationKey } from '../../model/i18n';
import { CATEGORIES } from '../../model/specs';
import type { Category } from '../../model/specs';
import type { Product } from '../../model/types';
import { ProductCard } from '../../components/catalog/ProductCard';
import { Shell } from '../../components/layout/Shell';

type Sort = 'popular' | 'priceAsc' | 'priceDesc' | 'rating';

const CATEGORY_TITLE: Record<Category, TranslationKey> = {
  smartphones: 'nav.smartphones',
  laptops: 'nav.laptops',
  peripherals: 'nav.peripherals',
  accessories: 'nav.accessories',
  software: 'nav.software',
};

function sortProducts(list: Product[], sort: Sort): Product[] {
  const copy = [...list];
  if (sort === 'priceAsc') return copy.sort((a, b) => a.price - b.price);
  if (sort === 'priceDesc') return copy.sort((a, b) => b.price - a.price);
  if (sort === 'rating') return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  return copy.sort((a, b) => Number(b.badge === 'hit') - Number(a.badge === 'hit') || b.reviewCount - a.reviewCount);
}

function matchesSearch(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const specStrings = Object.values(product.specs || {}).map((val) => {
    if (typeof val === 'object' && val !== null) {
      return `${val.ru || ''} ${val.en || ''}`;
    }
    return String(val ?? '');
  });
  const haystack = [
    product.name,
    product.title || '',
    product.brand,
    product.category,
    product.description?.ru || '',
    product.description?.en || '',
    ...specStrings,
  ]
    .join(' ')
    .toLowerCase();

  const words = q.split(/\s+/).filter(Boolean);
  return words.every((word) => haystack.includes(word));
}

function Skeletons() {
  return (
    <div className="pgrid" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="pcard-skel" />
      ))}
    </div>
  );
}

export function CatalogPage({ category }: { category?: Category }) {
  const { products, status, searchQuery, setSearchQuery, refresh } = useCatalog();
  const { t, tf } = useI18n();
  const [sort, setSort] = useState<Sort>('popular');
  const q = searchQuery.trim();

  const filtered = useMemo(() => {
    const byCat = category ? products.filter((p) => p.category === category) : products;
    const matched = q ? byCat.filter((p) => matchesSearch(p, q)) : byCat;
    if (q && matched.length === 0 && category) {
      return sortProducts(
        products.filter((p) => matchesSearch(p, q)),
        sort,
      );
    }
    return sortProducts(matched, sort);
  }, [products, category, sort, q]);

  const popular = useMemo(
    () =>
      sortProducts(
        products.filter((p) => p.badge === 'hit'),
        'popular',
      ).slice(0, 4),
    [products],
  );

  return (
    <Shell>
      <main className="catalog">
        {status === 'loading' && <Skeletons />}

        {status === 'error' && (
          <div className="catalog-state">
            <p>{t('err.network')}</p>
            <button type="button" className="btn" onClick={refresh}>
              OK
            </button>
          </div>
        )}

        {status === 'ready' && !category && !q && (
          <>
            <section className="hero">
              <div className="hero-text">
                <h1>{t('shop.heroTitle')}</h1>
                <p>{t('shop.heroSub')}</p>
                <a href="#popular" className="hero-cta">
                  {t('shop.heroCta')}
                </a>
              </div>
            </section>

            <section id="popular" className="catalog-section">
              <header className="shead">
                <h2>{t('shop.popular')}</h2>
              </header>
              <div className="pgrid">
                {popular.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>

            {CATEGORIES.map((cat) => {
              const items = sortProducts(
                products.filter((p) => p.category === cat),
                sort,
              );
              if (items.length === 0) return null;
              return (
                <section key={cat} className="catalog-section">
                  <header className="shead">
                    <h2>{t(CATEGORY_TITLE[cat])}</h2>
                    <small>{tf('shop.foundCount', { n: items.length })}</small>
                  </header>
                  <div className="pgrid">
                    {items.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}

        {status === 'ready' && (category || q) && (
          <section className="catalog-section">
            <header className="shead">
              <div>
                <h1>{q ? tf('shop.searchResults', { q }) : category ? t(CATEGORY_TITLE[category]) : t('nav.catalog')}</h1>
                <small>{tf('shop.foundCount', { n: filtered.length })}</small>
              </div>
              <div className="shead-controls">
                {q && (
                  <button type="button" className="chip-btn" onClick={() => setSearchQuery('')}>
                    {t('shop.searchReset')}
                  </button>
                )}
                <label className="sort">
                  <span>{t('shop.sort')}</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                    <option value="popular">{t('shop.sortPopular')}</option>
                    <option value="priceAsc">{t('shop.sortPriceAsc')}</option>
                    <option value="priceDesc">{t('shop.sortPriceDesc')}</option>
                    <option value="rating">{t('shop.sortRating')}</option>
                  </select>
                </label>
              </div>
            </header>

            {filtered.length === 0 ? (
              <div className="catalog-state">
                <p>{t('shop.empty')}</p>
                {q && (
                  <button type="button" className="btn btn-outline" onClick={() => setSearchQuery('')}>
                    {t('shop.searchReset')}
                  </button>
                )}
              </div>
            ) : (
              <div className="pgrid">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </Shell>
  );
}
