import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../presenter/auth-context';
import { Deco, Field, PasswordField } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { ThemeMenu } from '../../components/ui/ThemeMenu';
import { useI18n } from '../../presenter/i18n-context';
import type { TranslationKey } from '../../model/i18n';

export function LoginPage() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    const result = await login(identifier, password, remember);
    setSubmitting(false);
    if (!result.ok) {
      setErrorKey(result.error);
      return;
    }
    navigate('/');
  };

  return (
    <AuthLayout title={t('login.title')} subtitle={t('login.subtitle')}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          label={t('login.identifier')}
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <PasswordField
          label={t('login.password')}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className="checkbox">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>{t('login.remember')}</span>
        </label>

        {errorKey && (
          <p className="message" role="alert">
            {t(errorKey)}
          </p>
        )}

        <button type="submit" className="btn btn-block" disabled={submitting}>
          {t('login.submit')}
        </button>

        <p className="form-hint">
          {t('login.noAccount')} <Link to="/register">{t('login.goRegister')}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { t } = useI18n();
  return (
    <main className="auth-screen">
      <Deco />
      <div className="auth-top">
        <Link to="/" className="back-btn">
          <Icon name="arrow-left" />
          <span>{t('auth.backToShop')}</span>
        </Link>
        <ThemeMenu />
      </div>

      <div className="auth-card auth-split">
        <aside className="auth-aside">
          <Link to="/" className="logo">
            <span>ARC</span>SHOP
          </Link>
          <div className="auth-pitch">
            <h2>{t('auth.pitchTitle')}</h2>
            <ul>
              <li>
                <Icon name="truck" />
                <span>{t('auth.pitch1')}</span>
              </li>
              <li>
                <Icon name="shield" />
                <span>{t('auth.pitch2')}</span>
              </li>
              <li>
                <Icon name="chat" />
                <span>{t('auth.pitch3')}</span>
              </li>
            </ul>
          </div>
        </aside>

        <section className="auth-main">
          <div className="auth-inner">
            <h1>{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
