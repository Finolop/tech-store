import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useI18n } from '../../presenter/i18n-context';
import { Icon } from './Icon';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  span2?: boolean;
}

export function Field({ label, span2, ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className={span2 ? 'field span-2' : 'field'}>
      <input id={id} className="input" placeholder=" " {...rest} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function PasswordField({ label, span2, ...rest }: Omit<FieldProps, 'type'>) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();
  const toggleLabel = visible ? t('pw.hide') : t('pw.show');

  return (
    <div className={span2 ? 'field span-2' : 'field'}>
      <input id={id} className="input has-toggle" type={visible ? 'text' : 'password'} placeholder=" " {...rest} />
      <label htmlFor={id}>{label}</label>
      <button
        type="button"
        className="field-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        <Icon name={visible ? 'eye-off' : 'eye'} />
      </button>
    </div>
  );
}

export function Deco() {
  return (
    <svg className="deco" viewBox="0 0 960 750" aria-hidden="true">
      <defs>
        <linearGradient id="deco-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--deco-dark-from)" />
          <stop offset="100%" stopColor="var(--deco-dark-to)" />
        </linearGradient>
      </defs>
      <polygon className="deco-accent" points="960,0 960,210 210,750 0,750" />
      <polygon className="deco-light" points="960,210 960,400 475,750 210,750" />
      <polygon className="deco-dark" points="960,400 960,750 475,750" />
    </svg>
  );
}
