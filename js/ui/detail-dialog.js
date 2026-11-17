/**
 * Modal de detalle expandido de una película o serie: sinopsis completa,
 * duración, reparto, trailer y proveedores de streaming.
 */

import { escapeHTML } from '../utils/formatters.js';
import { providerList, getMatchingUserServices } from '../services/providers.js';
import { getMediaDetails } from '../api/tmdb.js';
import { diaryKey, watchlistKey, getMyServices } from '../services/storage.js';

let dialog = null;
let currentMovie = null;
let onWatchClick = null;
let onToggleWatchlist = null;

/**
 * Inicializa el diálogo de detalle y registra eventos internos.
 * @param {object} [opts]
 * @param {(movie: object) => void} [opts.onWatch]
 * @param {(movie: object) => void} [opts.onWatchlist]
 */
export function initDetailDialog({ onWatch, onWatchlist } = {}) {
  dialog = document.querySelector('#detail-dialog');
  onWatchClick = onWatch;
  onToggleWatchlist = onWatchlist;

  if (!dialog) return;

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
    if (event.target.closest('.detail-close')) dialog.close();

    if (event.target.closest('.detail-watch-btn') && currentMovie) {
      dialog.close();
      if (typeof onWatchClick === 'function') onWatchClick(currentMovie);
    }

    if (event.target.closest('.detail-watchlist-btn') && currentMovie) {
      dialog.close();
      if (typeof onToggleWatchlist === 'function') onToggleWatchlist(currentMovie);
    }
  });
}

// ── Helpers internos ────────────────────────────────────────────────────────

function formatRuntime(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}

function findTrailer(videos) {
  if (!videos?.results?.length) return null;
  const trailers = videos.results.filter(
    v => v.type === 'Trailer' && v.site === 'YouTube'
  );
  return trailers.find(t => t.iso_639_1 === 'es') || trailers[0] || null;
}

// ── Render del detalle ──────────────────────────────────────────────────────

function renderDetail(details, movie, diary, watchlist) {
  const title = escapeHTML(details.title || details.name || '');
  const mediaType = movie.mediaType || 'movie';

  const poster = details.poster_path
    ? `<img class="detail-poster" src="https://image.tmdb.org/t/p/w342${details.poster_path}" alt="Póster de ${title}">`
    : '<div class="detail-poster detail-poster-empty" aria-hidden="true"></div>';

  const date = details.release_date || details.first_air_date;
  const year = date ? date.slice(0, 4) : '';
  const mediaLabel = mediaType === 'tv' ? 'Serie' : 'Película';

  let duration = '';
  if (mediaType === 'movie' && details.runtime) {
    duration = formatRuntime(details.runtime);
  } else if (mediaType === 'tv' && details.number_of_seasons) {
    const s = details.number_of_seasons;
    duration = `${s} temporada${s > 1 ? 's' : ''}`;
  }

  const subtitle = [mediaLabel, year, duration].filter(Boolean).join(' · ');
  const genres = (details.genres || []).map(g => escapeHTML(g.name)).join(', ');
  const tmdbRating = details.vote_average
    ? `★ ${details.vote_average.toFixed(1)} en TMDb`
    : '';
  const tagline = details.tagline
    ? `<p class="detail-tagline">${escapeHTML(details.tagline)}</p>`
    : '';
  const overview = details.overview || 'Sinopsis no disponible.';

  // Trailer
  const trailer = findTrailer(details.videos);
  const trailerMarkup = trailer
    ? `<a class="detail-trailer" href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" rel="noreferrer">▶ Ver trailer</a>`
    : '';

  // Reparto (hasta 10 actores)
  const cast = (details.credits?.cast || []).slice(0, 10);
  const castMarkup = cast.length
    ? `<div class="detail-section"><h3>Reparto</h3><div class="detail-cast">${cast
        .map(actor => {
          const photo = actor.profile_path
            ? `<img src="https://image.tmdb.org/t/p/w185${actor.profile_path}" alt="" loading="lazy">`
            : '<div class="cast-photo-empty"></div>';
          return `<div class="cast-member">${photo}<span class="cast-name">${escapeHTML(actor.name)}</span><span class="cast-character">${escapeHTML(actor.character || '')}</span></div>`;
        })
        .join('')}</div></div>`
    : '';

  // Proveedores (desde los datos ya cargados en la búsqueda)
  const userServices = getMyServices();
  const matching = getMatchingUserServices(movie.region, userServices);
  const badgeMarkup = matching.length > 0
    ? `<span class="user-service-badge" title="Disponible en ${escapeHTML(matching.join(', '))}"><span class="badge-icon" aria-hidden="true">✨</span> En tus servicios: ${escapeHTML(matching.join(', '))}</span>`
    : '';

  const rawTitle = details.title || details.name || '';
  const providersMarkup = movie.region?.providerError
    ? `<span class="empty-providers">${escapeHTML(movie.region.providerError)}</span>`
    : providerList(movie.region, rawTitle, userServices);

  // Estado de colección
  const isWatched = diary.some(e => diaryKey(e) === diaryKey(movie));
  const isOnWatchlist = watchlist.some(e => watchlistKey(e) === watchlistKey(movie));

  return `
    <div class="detail-content">
      <button type="button" class="detail-close" aria-label="Cerrar">×</button>
      <div class="detail-hero">
        ${poster}
        <div class="detail-meta">
          <h2>${title}</h2>
          ${badgeMarkup}
          <div class="detail-subtitle">${subtitle}</div>
          ${genres ? `<div class="detail-genres">${genres}</div>` : ''}
          ${tmdbRating ? `<div class="detail-rating">${tmdbRating}</div>` : ''}
          ${trailerMarkup}
        </div>
      </div>
      ${tagline}
      <div class="detail-section">
        <h3>Sinopsis</h3>
        <p class="detail-overview">${escapeHTML(overview)}</p>
      </div>
      ${castMarkup}
      <div class="detail-section">
        <div class="providers-label">Dónde verla</div>
        <div class="providers">${providersMarkup}</div>
      </div>
      <div class="detail-actions">
        <button class="watch-button detail-watch-btn" type="button">${isWatched ? 'Editar en Ya vi' : '＋ Ya la vi'}</button>
        <button class="watchlist-button detail-watchlist-btn" type="button">${isOnWatchlist ? '✓ En Quiero ver' : '＋ Quiero ver'}</button>
      </div>
    </div>
  `;
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Abre el modal de detalle para una película o serie, cargando sus datos completos.
 * @param {object} movie     Resultado de búsqueda con providers ya resueltos
 * @param {string} token     Token de TMDb
 * @param {Array}  diary     Entradas actuales de "Ya vi"
 * @param {Array}  watchlist Entradas actuales de "Quiero ver"
 */
export async function openDetailDialog(movie, token, diary = [], watchlist = []) {
  if (!dialog) return;

  currentMovie = movie;

  dialog.innerHTML = `
    <div class="detail-content">
      <button type="button" class="detail-close" aria-label="Cerrar">×</button>
      <div class="detail-loading">Cargando detalles…</div>
    </div>
  `;
  dialog.showModal();

  try {
    const details = await getMediaDetails(movie.id, movie.mediaType, token);
    dialog.innerHTML = renderDetail(details, movie, diary, watchlist);
  } catch (error) {
    dialog.innerHTML = `
      <div class="detail-content">
        <button type="button" class="detail-close" aria-label="Cerrar">×</button>
        <p class="detail-error">${escapeHTML(error.message || 'No se pudieron cargar los detalles.')}</p>
      </div>
    `;
  }
}
