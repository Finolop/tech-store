import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../presenter/auth-context';
import { Deco, Field, PasswordField } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { useI18n } from '../../presenter/i18n-context';
import type { Lang, TranslationKey } from '../../model/i18n';
import { useTheme } from '../../presenter/theme-context';
import type { ThemeMode } from '../../model/theme';

const THEME_OPTIONS: Array<{ value: ThemeMode; key: TranslationKey }> = [
  { value: 'system', key: 'theme.system' },
  { value: 'dark', key: 'theme.dark' },
  { value: 'light', key: 'theme.light' },
];

const LANG_OPTIONS: Array<{ value: Lang; key: TranslationKey }> = [
  { value: 'ru', key: 'lang.ru' },
  { value: 'en', key: 'lang.en' },
];

export function SettingsPage() {
  const { user, ready, signedOut, logout, updateProfile, changePassword } = useAuth();
  const { mode, setMode } = useTheme();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  if (ready && !user) return <Navigate to={signedOut ? '/' : '/login'} replace />;

  return (
    <main className="auth-screen">
      <Deco />
      <div className="auth-top">
        <Link to="/" className="back-btn">
          <Icon name="arrow-left" />
          <span>{t('auth.backToShop')}</span>
        </Link>
      </div>

      <div className="auth-card auth-single">
        <section className="auth-main">
          <div className="auth-inner">
            <h1>{t('settings.title')}</h1>

            <div className="settings-section">
              <h2>{t('settings.account')}</h2>
              <p className="account-line">
                <strong>
                  {user?.firstName} {user?.lastName}
                </strong>{' '}
                ({user?.login}) · {user?.email}
                {user?.role && <span className="account-role-badge">{user.role}</span>}
              </p>
            </div>

            {user && (
              <ProfileSection
                key={`${user.login}:${user.email}:${user.firstName}:${user.lastName}:${user.phone ?? ''}`}
                initial={{
                  firstName: user.firstName,
                  lastName: user.lastName,
                  phone: user.phone ?? '',
                  login: user.login,
                  email: user.email,
                }}
                onSave={updateProfile}
              />
            )}

            <PasswordSection onChangePassword={changePassword} />

            <div className="settings-section">
              <h2>{t('menu.theme')}</h2>
              <div className="segmented" role="radiogroup" aria-label={t('menu.theme')}>
                {THEME_OPTIONS.map((opt) => (
                  <label key={opt.value} className="segment">
                    <input
                      type="radio"
                      name="theme"
                      value={opt.value}
                      checked={mode === opt.value}
                      onChange={() => setMode(opt.value)}
                    />
                    <span>{t(opt.key)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h2>{t('menu.lang')}</h2>
              <div className="segmented" role="radiogroup" aria-label={t('menu.lang')}>
                {LANG_OPTIONS.map((opt) => (
                  <label key={opt.value} className="segment">
                    <input
                      type="radio"
                      name="lang"
                      value={opt.value}
                      checked={lang === opt.value}
                      onChange={() => setLang(opt.value)}
                    />
                    <span>{t(opt.key)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="logout-row">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                {t('settings.logout')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  login: string;
  email: string;
}

function ProfileSection({
  initial,
  onSave,
}: {
  initial: ProfileData;
  onSave: (data: ProfileData) => Promise<{ ok: boolean; error?: TranslationKey }>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; key: TranslationKey } | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setNotice(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const res = await onSave(form);
    setBusy(false);
    setNotice(res.ok ? { kind: 'success', key: 'settings.profileSaved' } : { kind: 'error', key: res.error ?? 'err.server' });
  };

  return (
    <form className="settings-section form" onSubmit={submit} noValidate>
      <h2>{t('settings.profile')}</h2>
      <div className="form-grid">
        <Field label={t('reg.firstName')} value={form.firstName} onChange={update('firstName')} required />
        <Field label={t('reg.lastName')} value={form.lastName} onChange={update('lastName')} required />
        <Field label={t('reg.phone')} type="tel" value={form.phone} onChange={update('phone')} required />
        <Field label={t('reg.login')} value={form.login} onChange={update('login')} required />
        <Field label={t('reg.email')} type="email" value={form.email} onChange={update('email')} span2 required />
      </div>
      {notice && (
        <p className="message" data-kind={notice.kind === 'success' ? 'success' : undefined} role="status">
          {t(notice.key)}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={busy}>
          {t('settings.saveProfile')}
        </button>
      </div>
    </form>
  );
}

function PasswordSection({
  onChangePassword,
}: {
  onChangePassword: (current: string, next: string, next2: string) => Promise<{ ok: boolean; error?: TranslationKey }>;
}) {
  const { t } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; key: TranslationKey } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const res = await onChangePassword(current, next, next2);
    setBusy(false);
    if (res.ok) {
      setCurrent('');
      setNext('');
      setNext2('');
      setNotice({ kind: 'success', key: 'settings.passwordChanged' });
    } else {
      setNotice({ kind: 'error', key: res.error ?? 'err.server' });
    }
  };

  return (
    <form className="settings-section form" onSubmit={submit} noValidate>
      <h2>{t('settings.passwordSection')}</h2>
      <div className="form-grid">
        <PasswordField
          label={t('settings.currentPassword')}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          span2
          required
        />
        <PasswordField
          label={t('settings.newPassword')}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <PasswordField
          label={t('settings.newPassword2')}
          autoComplete="new-password"
          value={next2}
          onChange={(e) => setNext2(e.target.value)}
          required
        />
      </div>
      {notice && (
        <p className="message" data-kind={notice.kind === 'success' ? 'success' : undefined} role="status">
          {t(notice.key)}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={busy}>
          {t('settings.changePassword')}
        </button>
      </div>
    </form>
  );
}
