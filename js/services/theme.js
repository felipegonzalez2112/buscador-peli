/**
 * Gestión del tema visual (Claro, Oscuro o Sistema).
 */

const STORAGE_KEY = 'cinear_theme';
const THEMES = ['system', 'light', 'dark'];

let themePreference = 'system';
let themeButtons = [];
let themeColorMeta = null;
let systemThemeQuery = null;

/**
 * Aplica el tema seleccionado al documento y actualiza la UI.
 * @param {'system'|'light'|'dark'} preference
 * @param {boolean} [persist=false]
 */
export function applyTheme(preference, persist = false) {
  if (!THEMES.includes(preference)) preference = 'system';
  themePreference = preference;

  const isDark = preference === 'system'
    ? Boolean(systemThemeQuery?.matches)
    : preference === 'dark';

  const resolvedTheme = isDark ? 'dark' : 'light';

  document.documentElement.dataset.theme = resolvedTheme;

  if (themeColorMeta) {
    themeColorMeta.content = isDark ? '#101014' : '#f7f5f3';
  }

  themeButtons.forEach(button => {
    const active = button.dataset.themeChoice === preference;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {}
  }
}

/**
 * Obtiene la preferencia de tema actual.
 * @returns {'system'|'light'|'dark'}
 */
export function getThemePreference() {
  return themePreference;
}

/**
 * Inicializa los observadores de tema y listeners de botones.
 */
export function initTheme() {
  themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
  themeColorMeta = document.querySelector('#theme-color-meta');
  systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  let saved = 'system';
  try {
    saved = localStorage.getItem(STORAGE_KEY) || 'system';
  } catch {}

  applyTheme(THEMES.includes(saved) ? saved : 'system');

  themeButtons.forEach(button => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.themeChoice, true);
    });
  });

  systemThemeQuery.addEventListener?.('change', () => {
    if (themePreference === 'system') {
      applyTheme('system');
    }
  });
}
