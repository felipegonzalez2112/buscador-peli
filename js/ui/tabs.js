/**
 * Control de navegación por pestañas y accesibilidad de teclado.
 */

let tabButtons = [];
let tabPanels = [];
let diaryTabCount = null;
let watchlistTabCount = null;

/**
 * Activa la pestaña especificada y muestra su panel correspondiente.
 * @param {HTMLElement} tab
 */
export function activateTab(tab) {
  tabButtons.forEach(button => {
    const active = button === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });

  const controlsId = tab.getAttribute('aria-controls');
  tabPanels.forEach(panel => {
    panel.hidden = panel.id !== controlsId;
  });
}

/**
 * Actualiza los contadores numéricos en las pestañas "Ya vi" y "Quiero ver".
 * @param {number} diaryTotal
 * @param {number} watchlistTotal
 */
export function updateTabCounts(diaryTotal, watchlistTotal) {
  if (diaryTabCount) diaryTabCount.textContent = String(diaryTotal);
  if (watchlistTabCount) watchlistTabCount.textContent = String(watchlistTotal);
}

/**
 * Inicializa los eventos de click y navegación accesible por teclado (flechas izquierda/derecha).
 */
export function initTabs() {
  tabButtons = [...document.querySelectorAll('[role="tab"]')];
  tabPanels = [...document.querySelectorAll('[role="tabpanel"]')];
  diaryTabCount = document.querySelector('#tab-diary-count');
  watchlistTabCount = document.querySelector('#tab-watchlist-count');

  tabButtons.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabButtons[(index + direction + tabButtons.length) % tabButtons.length];
      activateTab(next);
      next.focus();
    });
  });
}
