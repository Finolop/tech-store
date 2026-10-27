export type ThemeMode = 'system' | 'dark' | 'light';
const STORAGE_KEY = 'arcshop:theme';

export function getTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

/** system → атрибут убирается и работает prefers-color-scheme */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
}

export function setTheme(mode: ThemeMode): void {
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage unavailable */
  }
  applyTheme(mode);
}
