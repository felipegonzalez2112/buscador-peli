/**
 * Vista de la sección "Quiero ver": listado de títulos pendientes y acciones para remover.
 */

import { escapeHTML } from '../utils/formatters.js';
import { savedProviderList } from '../services/providers.js';
import { watchlistKey } from '../services/storage.js';

let watchlistList = null;
let watchlistEmpty = null;
let watchlistCount = null;

let currentWatchlistEntries = [];
let onRemoveCallback = null;

/**
 * Renderiza la lista de títulos de Quiero ver.
 * @param {Array<object>} [entries]
 */
export function renderWatchlist(entries = currentWatchlistEntries) {
  currentWatchlistEntries = entries;
  if (!watchlistList) return;

  const countLabel = entries.length === 1 ? 'título' : 'títulos';
  if (watchlistCount) {
    watchlistCount.textContent = `${entries.length} ${countLabel}`;
  }

  if (watchlistEmpty) {
    watchlistEmpty.hidden = entries.length > 0;
  }

  const sorted = [...entries].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));

  watchlistList.innerHTML = sorted.map(entry => {
    const title = escapeHTML(entry.title);
    const poster = entry.poster
      ? `<img class="diary-poster" src="${escapeHTML(entry.poster)}" alt="" loading="lazy">`
      : '<div class="diary-poster" aria-hidden="true"></div>';
    const key = escapeHTML(watchlistKey(entry));

    return `
      <article class="diary-entry">
        ${poster}
        <div>
          <h3>${title}</h3>
          <div class="diary-meta">${entry.mediaType === 'tv' ? 'Serie' : 'Película'} · ${escapeHTML(entry.year || 'Año desconocido')}</div>
          ${savedProviderList(entry.providers, entry.title)}
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
  watchlistCount = document.querySelector('#watchlist-count');

  onRemoveCallback = onRemove;

  if (watchlistList) {
    watchlistList.addEventListener('click', event => {
      const removeButton = event.target.closest('[data-watchlist-remove]');
      if (removeButton && typeof onRemoveCallback === 'function') {
        onRemoveCallback(removeButton.dataset.watchlistRemove);
      }
    });
  }
}
