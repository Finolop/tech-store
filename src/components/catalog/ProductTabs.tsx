import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../presenter/auth-context';
import { useCatalog } from '../../presenter/catalog-context';
import { useI18n } from '../../presenter/i18n-context';
import type { TranslationKey } from '../../model/i18n';
import { apiPost } from '../../model/api';
import { formatDate, pick, specText } from '../../presenter/format';
import { SPEC_DEFS } from '../../model/specs';
import type { Product, Question, Review, ReviewBlock, ReviewSummary } from '../../model/types';
import { Icon } from '../ui/Icon';
import { StarPicker, Stars } from '../ui/Stars';

export function SpecsTab({ product }: { product: Product }) {
  const { lang, t } = useI18n();
  const defs = SPEC_DEFS[product.category] || [];
  return (
    <dl className="specs">
      {defs.map((def) => (
        <div key={def.key} className="spec-row">
          <dt>{pick(def.label, lang)}</dt>
          <dd>{specText(def, product.specs[def.key], lang, t)}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ReviewsProps {
  productId: string;
  reviews: Review[];
  summary: ReviewSummary;
  canReview: boolean;
  reason: ReviewBlock;
  onReload: () => void;
}

const REASON_TEXT: Record<Exclude<ReviewBlock, null>, TranslationKey> = {
  login: 'rev.needLogin',
  purchase: 'rev.needPurchase',
  reviewed: 'rev.alreadyLeft',
};

export function ReviewsTab({ productId, reviews, summary, canReview, reason, onReload }: ReviewsProps) {
  const { lang, t, tf } = useI18n();
  const { refresh: refreshCatalog } = useCatalog();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const res = await apiPost<{ review: Review }>(`/products/${productId}/reviews`, { rating, text });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setText('');
    onReload();
    refreshCatalog();
  };

  return (
    <div className="reviews">
      {summary.count > 0 && (
        <div className="rv-summary">
          <div className="rv-score">
            <strong>{summary.rating.toFixed(1)}</strong>
            <Stars value={summary.rating} />
            <small>{tf('rev.based', { n: summary.count })}</small>
          </div>
          <ul className="rv-bars">
            {[5, 4, 3, 2, 1].map((n) => {
              const pct = ((summary.distribution?.[n - 1] || 0) / summary.count) * 100;
              return (
                <li key={n}>
                  <span>{n}</span>
                  <svg className="rv-bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                    <rect x="0" y="0" width={pct} height="8" rx="4" />
                  </svg>
                  <small>{summary.distribution?.[n - 1] || 0}</small>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canReview ? (
        <form className="rv-form" onSubmit={submit}>
          <h4>{t('rev.writeTitle')}</h4>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('rev.placeholder')}
            required
            minLength={5}
          />
          {error && <p className="message">{t(error)}</p>}
          <button type="submit" className="btn btn-gradient" disabled={busy}>
            {t('rev.submit')}
          </button>
        </form>
      ) : (
        reason && (
          <p className="tab-note">
            <Icon name="shield" />
            <span>{t(REASON_TEXT[reason])}</span>
            {reason === 'login' && <Link to="/login">{t('shell.login')}</Link>}
          </p>
        )
      )}

      {reviews.length === 0 ? (
        <p className="tab-muted">{t('rev.empty')}</p>
      ) : (
        <ul className="rv-list">
          {reviews.map((r) => (
            <li key={r.id} className={r.isMine ? 'rv-item mine' : 'rv-item'}>
              <span className="avatar-sm" aria-hidden="true">
                {r.authorName[0]?.toUpperCase() || '•'}
              </span>
              <div>
                <p className="rv-head">
                  <strong>{r.authorName}</strong>
                  {r.isMine && <em className="tag tag-me">{t('rev.you')}</em>}
                  <em className="tag tag-ok">
                    <Icon name="check" /> {t('rev.verified')}
                  </em>
                  <small>{formatDate(r.createdAt, lang)}</small>
                </p>
                <Stars value={r.rating} />
                <p className="rv-text">{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface QuestionsProps {
  productId: string;
  questions: Question[];
  onReload: () => void;
}

export function QuestionsTab({ productId, questions, onReload }: QuestionsProps) {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const { refresh: refreshCatalog } = useCatalog();
  const [text, setText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [error, setError] = useState<TranslationKey | null>(null);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const res = await apiPost<{ question: Question }>(`/products/${productId}/questions`, { text });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setText('');
    onReload();
    refreshCatalog();
  };

  const reply = async (questionId: string, event: FormEvent) => {
    event.preventDefault();
    const body = (replyText[questionId] || '').trim();
    if (!body) return;
    const res = await apiPost(`/questions/${questionId}/answers`, { text: body });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReplyText((prev) => ({ ...prev, [questionId]: '' }));
    onReload();
  };

  return (
    <div className="questions">
      {user ? (
        <form className="qa-form" onSubmit={ask}>
          <h4>{t('qa.askTitle')}</h4>
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('qa.placeholder')}
            required
            minLength={5}
          />
          {error && <p className="message">{t(error)}</p>}
          <button type="submit" className="btn btn-gradient">
            {t('qa.submit')}
          </button>
        </form>
      ) : (
        <p className="tab-note">
          <Icon name="chat" />
          <span>{t('qa.needLogin')}</span>
          <Link to="/login">{t('shell.login')}</Link>
        </p>
      )}

      {questions.length === 0 ? (
        <p className="tab-muted">{t('qa.empty')}</p>
      ) : (
        <ul className="qa-list">
          {questions.map((q) => (
            <li key={q.id} className="qa-item">
              <div className="qa-q">
                <span className="qa-mark">?</span>
                <div>
                  <p className="rv-head">
                    <strong>{q.authorName}</strong>
                    {q.isMine && <em className="tag tag-me">{t('rev.you')}</em>}
                    <small>{formatDate(q.createdAt, lang)}</small>
                  </p>
                  <p className="rv-text">{q.text}</p>
                </div>
              </div>

              {q.answers.map((a) => (
                <div key={a.id} className="qa-a">
                  <p className="rv-head">
                    <strong>{a.authorName}</strong>
                    {a.isShop && <em className="tag tag-shop">{t('qa.shopBadge')}</em>}
                    {a.isBuyer && <em className="tag tag-ok">{t('qa.buyerBadge')}</em>}
                    <small>{formatDate(a.createdAt, lang)}</small>
                  </p>
                  <p className="rv-text">{a.text}</p>
                </div>
              ))}

              {user && (
                <form className="qa-reply" onSubmit={(e) => reply(q.id, e)}>
                  <input
                    value={replyText[q.id] || ''}
                    onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={t('qa.replyPlaceholder')}
                    minLength={2}
                  />
                  <button type="submit" className="chip-btn">
                    {t('qa.replySubmit')}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
