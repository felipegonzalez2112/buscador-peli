/**
 * Vista de la sección "Quiero ver": listado de títulos pendientes, filtros y acciones para remover.
 */

import { escapeHTML } from '../utils/formatters.js';
import { savedProviderList, isAvailableInUserServices, getMatchingUserServices } from '../services/providers.js';
import { watchlistKey, getMyServices } from '../services/storage.js';

let watchlistList = null;
let watchlistEmpty = null;
let watchlistFilterEmpty = null;
let watchlistCount = null;
let watchlistTools = null;
let watchlistServiceFilter = null;

let currentWatchlistEntries = [];
let currentUserServices = [];
let onRemoveCallback = null;

/**
 * Renderiza la lista de títulos de Quiero ver.
 * @param {Array<object>} [entries=currentWatchlistEntries]
 * @param {Array<string>} [services=currentUserServices]
 */
export function renderWatchlist(entries = currentWatchlistEntries, services = currentUserServices) {
  currentWatchlistEntries = entries;
  currentUserServices = services?.length ? services : getMyServices();
  if (!watchlistList) return;

  const countLabel = entries.length === 1 ? 'título' : 'títulos';
  if (watchlistCount) {
    watchlistCount.textContent = `${entries.length} ${countLabel}`;
  }

  if (watchlistEmpty) {
    watchlistEmpty.hidden = entries.length > 0;
  }

  if (watchlistTools) {
    watchlistTools.hidden = entries.length === 0;
  }

  const sorted = [...entries].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  const filter = watchlistServiceFilter?.value || 'all';

  const filtered = filter === 'my-services'
    ? sorted.filter(entry => isAvailableInUserServices(entry, currentUserServices))
    : sorted;

  if (watchlistFilterEmpty) {
    watchlistFilterEmpty.hidden = !(entries.length > 0 && filtered.length === 0);
  }

  watchlistList.innerHTML = filtered.map(entry => {
    const title = escapeHTML(entry.title);
    const poster = entry.poster
      ? `<img class="diary-poster" src="${escapeHTML(entry.poster)}" alt="" loading="lazy">`
      : '<div class="diary-poster" aria-hidden="true"></div>';
    const key = escapeHTML(watchlistKey(entry));

    const matching = getMatchingUserServices(entry.providers, currentUserServices);
    const badgeMarkup = matching.length > 0
      ? `<span class="user-service-badge" title="Disponible en ${escapeHTML(matching.join(', '))}"><span class="badge-icon" aria-hidden="true">✨</span> En tus servicios: ${escapeHTML(matching.join(', '))}</span>`
      : '';

    return `
      <article class="diary-entry">
        ${poster}
        <div>
          <div class="movie-header">
            <h3>${title}</h3>
            ${badgeMarkup}
          </div>
          <div class="diary-meta">${entry.mediaType === 'tv' ? 'Serie' : 'Película'} · ${escapeHTML(entry.year || 'Año desconocido')}</div>
          ${savedProviderList(entry.providers, entry.title, currentUserServices)}
        </div>
        <div class="diary-actions">
          <button class="diary-action" type="button" data-watchlist-remove="${key}" aria-label="Quitar ${title} de Quiero ver">Quitar</button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Inicializa los elementos y eventos de la vista de "Quiero ver".
 * @param {object} options
 * @param {(key: string) => void} options.onRemove
 */
export function initWatchlistView({ onRemove }) {
  watchlistList = document.querySelector('#watchlist-list');
  watchlistEmpty = document.querySelector('#watchlist-empty');
  watchlistFilterEmpty = document.querySelector('#watchlist-filter-empty');
  watchlistCount = document.querySelector('#watchlist-count');
  watchlistTools = document.querySelector('#watchlist-tools');
  watchlistServiceFilter = document.querySelector('#watchlist-service-filter');

  onRemoveCallback = onRemove;

  if (watchlistServiceFilter) {
    watchlistServiceFilter.addEventListener('change', () => {
      renderWatchlist();
    });
  }

  if (watchlistList) {
    watchlistList.addEventListener('click', event => {
      const removeButton = event.target.closest('[data-watchlist-remove]');
      if (removeButton && typeof onRemoveCallback === 'function') {
        onRemoveCallback(removeButton.dataset.watchlistRemove);
      }
    });
  }
}
