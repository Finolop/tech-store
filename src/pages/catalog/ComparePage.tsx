import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../../presenter/catalog-context';
import { useI18n } from '../../presenter/i18n-context';
import { compareProducts } from '../../presenter/compare';
import { formatMoney, pick, specText } from '../../presenter/format';
import { useProductLink } from '../../presenter/use-product-link';
import { useShop } from '../../presenter/shop-context';
import { Icon } from '../../components/ui/Icon';
import { ProductImage } from '../../components/catalog/ProductImage';
import { Shell } from '../../components/layout/Shell';
import { Stars } from '../../components/ui/Stars';

export function ComparePage() {
  const { byId } = useCatalog();
  const { compareIds, toggleCompare } = useShop();
  const { lang, t, tf } = useI18n();
  const linkTo = useProductLink();
  const [diffOnly, setDiffOnly] = useState(false);

  const items = useMemo(
    () => compareIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [compareIds, byId],
  );

  const sameCategory = items.length >= 2 && items.every((p) => p.category === items[0].category);
  const result = useMemo(() => (sameCategory ? compareProducts(items) : null), [items, sameCategory]);

  const scoreOf = (id: string) => result?.scores.find((s) => s.id === id);
  const nameOf = (id: string) => byId.get(id)?.name ?? '';

  const minPrice = items.length ? Math.min(...items.map((p) => p.price)) : 0;
  const maxPrice = items.length ? Math.max(...items.map((p) => p.price)) : 0;
  const maxRating = items.length ? Math.max(...items.map((p) => p.rating)) : 0;

  return (
    <Shell>
      <main className="cmp-page">
        <header className="shead">
          <h1>{t('cmp.title')}</h1>
        </header>

        {!result ? (
          <div className="catalog-state cmp-empty">
            <Icon name="scale" />
            <p>{t('cmp.empty')}</p>
            <Link to="/" className="btn">
              {t('cmp.goCatalog')}
            </Link>
          </div>
        ) : (
          <>
            <section className="cmp-verdict" aria-label={t('cmp.verdictTitle')}>
              {(
                [
                  ['cmp.bestOverall', result.bestOverall],
                  ['cmp.bestValue', result.bestValue],
                  ['cmp.cheapest', result.cheapest],
                ] as const
              ).map(([label, id]) => (
                <div key={label} className="vcard">
                  <small>{t(label)}</small>
                  <strong>{nameOf(id)}</strong>
                </div>
              ))}
            </section>

            <ul className="cmp-text">
              {result.scores
                .filter((s) => s.wins.length > 0)
                .map((s) => (
                  <li key={s.id}>
                    <strong>{nameOf(s.id)}</strong>{' '}
                    {tf('cmp.winsIn', {
                      list: s.wins
                        .slice(0, 4)
                        .map((d) => pick(d.label, lang).toLowerCase())
                        .join(', '),
                    })}
                    .
                  </li>
                ))}
              {maxPrice > minPrice && (
                <li>
                  {tf('cmp.priceDiff', {
                    cheap: nameOf(result.cheapest),
                    dear: nameOf(result.priciest),
                    diff: formatMoney(maxPrice - minPrice, lang),
                    pct: Math.round(((maxPrice - minPrice) / minPrice) * 100),
                  })}
                </li>
              )}
            </ul>

            <label className="checkbox cmp-toggle">
              <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} />
              <span>{t('cmp.diffOnly')}</span>
            </label>

            {diffOnly && result.identical && <p className="cmp-note">{t('cmp.noDiff')}</p>}

            <div className="cmp-scroll">
              <table className="cmp">
                <thead>
                  <tr>
                    <th />
                    {items.map((p) => (
                      <th key={p.id} className="cmp-prod">
                        <button
                          type="button"
                          className="icon-btn cmp-remove"
                          title={t('cmp.remove')}
                          aria-label={t('cmp.remove')}
                          onClick={() => toggleCompare(p.id)}
                        >
                          <Icon name="x" />
                        </button>
                        <ProductImage product={p} className="pimg cmp-art" />
                        <Link to={linkTo(p.id)} className="cmp-name">
                          {p.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>{t('cmp.score')}</th>
                    {items.map((p) => {
                      const sc = scoreOf(p.id);
                      const isBest = result.bestOverall === p.id;
                      return (
                        <td key={p.id} className={isBest ? 'best' : ''}>
                          <div className="cmp-score">
                            <b>{sc?.score ?? 0}</b>
                            <svg className="cmp-bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                              <rect x="0" y="0" width={sc?.score ?? 0} height="8" rx="4" />
                            </svg>
                          </div>
                          {sc && sc.wins.length > 0 && (
                            <small className="cmp-leads">
                              {sc.wins
                                .slice(0, 3)
                                .map((d) => pick(d.label, lang))
                                .join(' · ')}
                            </small>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <th>{t('cmp.price')}</th>
                    {items.map((p) => (
                      <td key={p.id} className={maxPrice !== minPrice && p.price === minPrice ? 'best' : ''}>
                        <strong>{formatMoney(p.price, lang)}</strong>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <th>{t('cmp.rating')}</th>
                    {items.map((p) => (
                      <td key={p.id} className={maxRating > 0 && p.rating === maxRating ? 'best' : ''}>
                        <span className="cmp-rating">
                          <Stars value={p.rating} />
                          <span>{p.rating > 0 ? p.rating.toFixed(1) : '—'}</span>
                        </span>
                      </td>
                    ))}
                  </tr>

                  {result.rows
                    .filter((row) => !diffOnly || row.differs)
                    .map((row) => (
                      <tr key={row.def.key}>
                        <th>{pick(row.def.label, lang)}</th>
                        {row.values.map((val, idx) => {
                          const isBest = row.best.includes(idx);
                          return (
                            <td key={items[idx].id} className={isBest ? 'best' : ''}>
                              <span>{specText(row.def, val, lang, t)}</span>
                              {isBest && (
                                <em className="best-mark">
                                  <Icon name="check" /> {t('cmp.bestMark')}
                                </em>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}
