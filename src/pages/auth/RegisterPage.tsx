import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../presenter/auth-context';
import { Field, PasswordField } from '../../components/ui/Form';
import { useI18n } from '../../presenter/i18n-context';
import type { TranslationKey } from '../../model/i18n';
import { AuthLayout } from './LoginPage';

export function RegisterPage() {
  const { user, register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    login: '',
    email: '',
    password: '',
    password2: '',
  });
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);
    if (!result.ok) {
      setErrorKey(result.error);
      return;
    }
    navigate('/');
  };

  return (
    <AuthLayout title={t('reg.title')} subtitle={t('reg.subtitle')}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field
            label={t('reg.firstName')}
            name="firstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={update('firstName')}
            required
          />
          <Field
            label={t('reg.lastName')}
            name="lastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={update('lastName')}
            required
          />
          <Field
            label={t('reg.phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update('phone')}
            required
          />
          <Field
            label={t('reg.login')}
            name="login"
            autoComplete="username"
            value={form.login}
            onChange={update('login')}
            required
          />
          <Field
            label={t('reg.email')}
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            span2
            required
          />
          <PasswordField
            label={t('reg.password')}
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            required
          />
          <PasswordField
            label={t('reg.password2')}
            name="password2"
            autoComplete="new-password"
            value={form.password2}
            onChange={update('password2')}
            required
          />
        </div>

        {errorKey && (
          <p className="message" role="alert">
            {t(errorKey)}
          </p>
        )}

        <button type="submit" className="btn btn-block" disabled={submitting}>
          {t('reg.submit')}
        </button>

        <p className="form-hint">
          {t('reg.haveAccount')} <Link to="/login">{t('reg.goLogin')}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
