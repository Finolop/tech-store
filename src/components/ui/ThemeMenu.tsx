import { useState } from 'react';
import { useI18n } from '../../presenter/i18n-context';
import type { Lang, TranslationKey } from '../../model/i18n';
import { useTheme } from '../../presenter/theme-context';
import type { ThemeMode } from '../../model/theme';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Popover } from './Popover';

const THEMES: Array<{ value: ThemeMode; key: TranslationKey; icon: IconName }> = [
  { value: 'system', key: 'theme.system', icon: 'monitor' },
  { value: 'dark', key: 'theme.dark', icon: 'moon' },
  { value: 'light', key: 'theme.light', icon: 'sun' },
];

const LANGS: Array<{ value: Lang; key: TranslationKey; code: string }> = [
  { value: 'ru', key: 'lang.ru', code: 'RU' },
  { value: 'en', key: 'lang.en', code: 'EN' },
];

export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const { mode, setMode } = useTheme();
  const { lang, setLang, t } = useI18n();
  const label = `${t('menu.theme')} · ${t('menu.lang')}`;

  return (
    <Popover open={open} onClose={() => setOpen(false)}>
      <button
        type="button"
        className="round-btn"
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="globe" />
      </button>
      {open && (
        <div className="pop-panel" role="menu">
          <div className="pop-body">
            <div className="menu-title">{t('menu.theme')}</div>
            {THEMES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={mode === opt.value}
                className="menu-item"
                onClick={() => setMode(opt.value)}
              >
                <Icon name={opt.icon} />
                <span>{t(opt.key)}</span>
                {mode === opt.value && <Icon name="check" />}
              </button>
            ))}

            <div className="menu-title">{t('menu.lang')}</div>
            {LANGS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={lang === opt.value}
                className="menu-item"
                onClick={() => setLang(opt.value)}
              >
                <span className="menu-lang">{opt.code}</span>
                <span>{t(opt.key)}</span>
                {lang === opt.value && <Icon name="check" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}
