import { useId, useState } from 'react';
import { useI18n } from '../../presenter/i18n-context';

export function Stars({ value }: { value: number }) {
  const clipId = useId();
  const clamped = Math.max(0, Math.min(5, value));
  const widthPct = (clamped / 5) * 120;

  return (
    <svg className="stars-svg" viewBox="0 0 120 24" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={widthPct} height="24" />
        </clipPath>
        <g id={`${clipId}-row`}>
          {[0, 24, 48, 72, 96].map((offset) => (
            <path
              key={offset}
              transform={`translate(${offset}, 0)`}
              d="M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3 6.1 20.4l1.2-6.5-4.8-4.6 6.6-.9z"
            />
          ))}
        </g>
      </defs>
      <use href={`#${clipId}-row`} className="stars-bg" />
      <use href={`#${clipId}-row`} className="stars-fg" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="star-picker" role="radiogroup" aria-label={t('rev.yourRating')} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} / 5`}
          className={n <= shown ? 'on' : ''}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3 6.1 20.4l1.2-6.5-4.8-4.6 6.6-.9z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
