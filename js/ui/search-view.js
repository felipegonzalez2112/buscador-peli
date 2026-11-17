/**
 * Vista de búsqueda de títulos, listado de resultados, filtros de disponibilidad y ordenamiento.
 */

import { escapeHTML } from '../utils/formatters.js';
import { hasAvailability, providerList, getMatchingUserServices } from '../services/providers.js';
import { diaryKey, watchlistKey, getMyServices } from '../services/storage.js';

let form = null;
let queryInput = null;
let mediaType = null;
let statusElement = null;
let results = null;
let searchButton = null;
let keyInput = null;
let settings = null;
let saveKeyButton = null;
let resultTools = null;
let resultCount = null;
let availabilityFilter = null;
let sortOrder = null;

let currentMovies = [];
let currentDiary = [];
let currentWatchlist = [];
let currentUserServices = [];

let onSearchCallback = null;
let onWatchClickCallback = null;
let onToggleWatchlistCallback = null;
let onSaveTokenCallback = null;
let onDetailClickCallback = null;

/**
 * Retorna las películas cargadas actualmente en los resultados de búsqueda.
 * @returns {Array<object>}
 */
export function getCurrentMovies() {
  return currentMovies;
}

/**
 * Actualiza el estado visual de carga durante una búsqueda.
 * @param {boolean} isSearching
 */
export function setSearching(isSearching) {
  if (!searchButton) return;
  searchButton.disabled = isSearching;
  searchButton.textContent = isSearching ? 'Buscando…' : 'Buscar';
}

/**
 * Muestra un mensaje en el área de estado accesible.
 * @param {string} message
 */
export function setStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * Abre el panel de configuración de clave TMDb con foco en el input.
 * @param {string} [message]
 */
export function openSettings(message) {
  if (settings) settings.open = true;
  if (message) setStatus(message);
  if (keyInput) keyInput.focus();
}

/**
 * Genera el markup HTML para una tarjeta de película o serie en los resultados.
 * @param {object} movie
 * @returns {string}
 */
function renderMovieCard(movie) {
  const title = escapeHTML(movie.title || movie.name || (movie.mediaType === 'tv' ? 'Serie sin título' : 'Película sin título'));
  const userServices = currentUserServices?.length ? currentUserServices : getMyServices();
  const matching = getMatchingUserServices(movie.region, userServices);

  const badgeMarkup = matching.length > 0
    ? `<span class="user-service-badge" title="Disponible en ${escapeHTML(matching.join(', '))}"><span class="badge-icon" aria-hidden="true">✨</span> En tus servicios: ${escapeHTML(matching.join(', '))}</span>`
    : '';

  const providersMarkup = movie.region?.providerError
    ? `<span class="empty-providers">${escapeHTML(movie.region.providerError)}</span>`
    : providerList(movie.region, movie.title || movie.name || '', userServices);

  const poster = movie.poster_path
    ? `<img class="poster" src="https://image.tmdb.org/t/p/w185${movie.poster_path}" alt="Póster de ${title}" loading="lazy">`
    : '<div class="poster poster-empty" aria-hidden="true"></div>';
  const date = movie.release_date || movie.first_air_date;
  const year = date ? date.slice(0, 4) : 'Año desconocido';
  const mediaLabel = movie.mediaType === 'tv' ? 'Serie' : 'Película';

  const isWatched = currentDiary.some(entry => diaryKey(entry) === diaryKey(movie));
  const isOnWatchlist = currentWatchlist.some(entry => watchlistKey(entry) === watchlistKey(movie));

  return `
    <article class="movie" data-movie-id="${movie.id}" data-movie-type="${movie.mediaType}">
      ${poster}
      <div class="movie-info">
        <div class="movie-header">
          <h2 class="movie-title">${title}</h2>
          ${badgeMarkup}
        </div>
        <div class="year">${mediaLabel} · ${year}</div>
        <p class="overview">${escapeHTML(movie.overview || 'Todavía no hay sinopsis disponible.')}</p>
        <div class="providers-label">Dónde verla · tocá para copiar el título y abrir la app si tu dispositivo la reconoce</div>
        <div class="providers">${providersMarkup}</div>
      </div>
      <div class="movie-actions">
        <button class="watch-button" type="button" data-watch-id="${movie.id}" data-watch-type="${movie.mediaType}">
          ${isWatched ? 'Editar en Ya vi' : '＋ Ya la vi'}
        </button>
        <button class="watchlist-button" type="button" data-watchlist-id="${movie.id}" data-watchlist-type="${movie.mediaType}">
          ${isOnWatchlist ? '✓ En Quiero ver' : '＋ Quiero ver'}
        </button>
      </div>
    </article>
  `;
}

/**
 * Re-renderiza y filtra la lista de resultados según la disponibilidad y el orden seleccionados.
 */
export function updateResults() {
  if (!results || !resultTools) return;

  if (!currentMovies.length) {
    results.replaceChildren();
    resultTools.hidden = true;
    return;
  }

  const filter = availabilityFilter.value;
  const order = sortOrder.value;
  const userServices = currentUserServices?.length ? currentUserServices : getMyServices();

  if (filter === 'my-services' && userServices.length === 0) {
    results.innerHTML = `
      <div class="empty-state-notice">
        <p>Todavía no seleccionaste tus plataformas de streaming.</p>
        <button class="diary-action open-services-config" type="button">Configurar mis servicios</button>
      </div>
    `;
    if (resultCount) {
      resultCount.textContent = '0 resultados';
    }
    return;
  }

  const filtered = currentMovies.filter(movie => hasAvailability(movie, filter, userServices));

  if (order === 'year-desc') {
    filtered.sort((a, b) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''));
  } else if (order === 'year-asc') {
    filtered.sort((a, b) => (a.release_date || a.first_air_date || '9999').localeCompare(b.release_date || b.first_air_date || '9999'));
  } else if (order === 'popularity') {
    filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  results.innerHTML = filtered.map(renderMovieCard).join('');
  const countLabel = filtered.length === 1 ? 'resultado' : 'resultados';

  if (resultCount) {
    resultCount.textContent = filter === 'all'
      ? `${filtered.length} ${countLabel}`
      : `${filtered.length} de ${currentMovies.length} ${countLabel} disponibles`;
  }

  if (!filtered.length) {
    const emptyMsg = filter === 'my-services'
      ? 'Ninguno de estos títulos está disponible en tus plataformas de streaming.'
      : 'No hay títulos con ese tipo de disponibilidad en Argentina.';
    results.innerHTML = `<p class="empty-providers">${emptyMsg}</p>`;
  }
}

/**
 * Actualiza los datos de resultados de búsqueda y sincroniza con el estado de la colección.
 * @param {Array<object>} movies
 * @param {Array<object>} diary
 * @param {Array<object>} watchlist
 * @param {Array<string>} [myServices]
 */
export function setResults(movies, diary = currentDiary, watchlist = currentWatchlist, myServices = currentUserServices) {
  currentMovies = movies;
  currentDiary = diary;
  currentWatchlist = watchlist;
  currentUserServices = myServices || getMyServices();

  if (resultTools) {
    resultTools.hidden = !movies.length;
  }

  updateResults();
}

/**
 * Inicializa los eventos del formulario de búsqueda, filtros y delegación de eventos.
 * @param {object} options
 * @param {(query: string, type: 'both'|'movie'|'tv') => void} options.onSearch
 * @param {(movie: object) => void} options.onWatchClick
 * @param {(movie: object) => void} options.onToggleWatchlist
 * @param {(movie: object) => void} [options.onDetailClick]
 * @param {(token: string) => void} options.onSaveToken
 * @param {string} options.initialToken
 */
export function initSearchView({ onSearch, onWatchClick, onToggleWatchlist, onDetailClick, onSaveToken, initialToken }) {
  form = document.querySelector('#search-form');
  queryInput = document.querySelector('#query');
  mediaType = document.querySelector('#media-type');
  statusElement = document.querySelector('#status');
  results = document.querySelector('#results');
  searchButton = document.querySelector('#search-button');
  keyInput = document.querySelector('#api-key');
  settings = document.querySelector('#settings');
  saveKeyButton = document.querySelector('#save-key');
  resultTools = document.querySelector('#result-tools');
  resultCount = document.querySelector('#result-count');
  availabilityFilter = document.querySelector('#availability-filter');
  sortOrder = document.querySelector('#sort-order');

  onSearchCallback = onSearch;
  onWatchClickCallback = onWatchClick;
  onToggleWatchlistCallback = onToggleWatchlist;
  onDetailClickCallback = onDetailClick;
  onSaveTokenCallback = onSaveToken;

  if (keyInput && initialToken) {
    keyInput.value = initialToken;
  }

  if (saveKeyButton) {
    saveKeyButton.addEventListener('click', () => {
      const token = keyInput?.value.trim() || '';
      if (typeof onSaveTokenCallback === 'function') {
        onSaveTokenCallback(token);
      }
      setStatus(token ? 'Token guardado en este dispositivo.' : 'Token eliminado.');
      if (token && settings) settings.open = false;
    });
  }

  if (availabilityFilter) availabilityFilter.addEventListener('change', updateResults);
  if (sortOrder) sortOrder.addEventListener('change', updateResults);

  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const query = queryInput?.value.trim();
      const type = mediaType?.value || 'both';
      if (!query) return;

      if (typeof onSearchCallback === 'function') {
        onSearchCallback(query, type);
      }
    });
  }

  if (results) {
    results.addEventListener('click', event => {
      // Si hizo clic en un proveedor de streaming, dejamos que la delegación global actúe
      if (event.target.closest('[data-provider-title]')) return;

      const openServicesBtn = event.target.closest('.open-services-config');
      if (openServicesBtn) {
        openSettings();
        return;
      }

      const watchlistButton = event.target.closest('[data-watchlist-id]');
      if (watchlistButton) {
        const id = watchlistButton.dataset.watchlistId;
        const type = watchlistButton.dataset.watchlistType;
        const movie = currentMovies.find(m => String(m.id) === id && m.mediaType === type);
        if (movie && typeof onToggleWatchlistCallback === 'function') {
          onToggleWatchlistCallback(movie);
        }
        return;
      }

      const watchButton = event.target.closest('[data-watch-id]');
      if (watchButton) {
        const id = watchButton.dataset.watchId;
        const type = watchButton.dataset.watchType;
        const movie = currentMovies.find(m => String(m.id) === id && m.mediaType === type);
        if (movie && typeof onWatchClickCallback === 'function') {
          onWatchClickCallback(movie);
        }
        return;
      }

      // Clic en la tarjeta, póster o título para abrir el detalle expandido
      const card = event.target.closest('.movie');
      if (card && typeof onDetailClickCallback === 'function') {
        const id = card.dataset.movieId;
        const type = card.dataset.movieType;
        const movie = currentMovies.find(m => String(m.id) === id && m.mediaType === type);
        if (movie) {
          onDetailClickCallback(movie);
        }
      }
    });
  }
}
