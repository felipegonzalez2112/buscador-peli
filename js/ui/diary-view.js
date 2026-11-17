/**
 * Vista de la sección "Ya vi": listado de películas vistas, filtros, ordenamiento y estadísticas.
 */

import { escapeHTML, formatRatingDate } from '../utils/formatters.js';
import { savedProviderList } from '../services/providers.js';
import { diaryKey } from '../services/storage.js';

let diaryList = null;
let diaryEmpty = null;
let diaryFilterEmpty = null;
let diaryCount = null;
let diaryStats = null;
let diaryRatingFilter = null;
let diaryTagFilter = null;
let diarySortOrder = null;

let currentDiaryEntries = [];
let onEditCallback = null;
let onDeleteCallback = null;

/**
 * Renderiza las tarjetas estadísticas de la colección vista.
 * @param {Array<object>} entries
 */
export function renderDiaryStats(entries) {
  if (!diaryStats) return;

  diaryStats.hidden = entries.length === 0;
  if (!entries.length) {
    diaryStats.replaceChildren();
    return;
  }

  const average = entries.reduce((sum, entry) => sum + (Number(entry.rating) || 0), 0) / entries.length;
  const topRating = Math.max(...entries.map(entry => Number(entry.rating) || 0));
  const topEntries = entries.filter(entry => Number(entry.rating) === topRating);
  const bestNames = topEntries.slice(0, 3).map(entry => escapeHTML(entry.title)).join(', ');

  const tags = entries.flatMap(entry => entry.tags || []).reduce((counts, tag) => {
    counts[tag] = (counts[tag] || 0) + 1;
    return counts;
  }, {});

  const topTags = Object.entries(tags)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, 5);

  const maxTagCount = topTags[0]?.[1] || 1;
  const recent = [...entries].filter(entry => entry.ratedAt).sort((a, b) => b.ratedAt.localeCompare(a.ratedAt))[0];

  const topNote = topEntries.length > 3
    ? `y ${topEntries.length - 3} más`
    : (topEntries.length === 1 ? 'Tu favorita por nota' : 'Empate en el primer puesto');

  const tagsMarkup = topTags.length
    ? `<div class="tag-stats">${topTags.map(([tag, count]) => `
        <div class="tag-stat">
          <span>${escapeHTML(tag)}</span>
          <span class="tag-stat-track"><i style="--tag-fill:${Math.round(count / maxTagCount * 100)}%"></i></span>
          <b>${count}</b>
        </div>
      `).join('')}</div>`
    : '<span class="stat-note">Agregá etiquetas al puntuar para ver tus tendencias.</span>';

  diaryStats.innerHTML = `
    <article class="stat-card stat-total">
      <span class="stat-label">Vistas</span>
      <strong>${entries.length}</strong>
      <span class="stat-note">películas y series</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">Promedio</span>
      <strong>${average.toFixed(1)}<span class="stat-unit"> / 5</span></strong>
      <span class="stat-note">tu calificación media</span>
    </article>
    <article class="stat-card stat-best">
      <span class="stat-label">Mejor puntuadas · ${topRating}/5</span>
      <strong>${bestNames}</strong>
      <span class="stat-note">${topNote}</span>
    </article>
    <article class="stat-card">
      <span class="stat-label">Última calificación</span>
      <strong>${recent ? formatRatingDate(recent.ratedAt) : '—'}</strong>
      <span class="stat-note">${recent ? escapeHTML(recent.title) : 'Todavía sin fechas registradas'}</span>
    </article>
    <article class="stat-card stat-tags">
      <span class="stat-label">Emociones y etiquetas</span>
      ${tagsMarkup}
    </article>
  `;
}

/**
 * Renderiza la lista de películas vistas de acuerdo a los filtros activos.
 * @param {Array<object>} [entries]
 */
export function renderDiary(entries = currentDiaryEntries) {
  currentDiaryEntries = entries;
  if (!diaryList) return;

  const selectedTag = diaryTagFilter.value;
  const tags = [...new Set(entries.flatMap(entry => entry.tags || []))].sort((a, b) => a.localeCompare(b, 'es'));

  diaryTagFilter.innerHTML = '<option value="all">Todas las etiquetas</option>' +
    tags.map(tag => `<option value="${escapeHTML(tag)}">${escapeHTML(tag)}</option>`).join('');
  diaryTagFilter.value = tags.includes(selectedTag) ? selectedTag : 'all';

  let visibleEntries = entries.filter(entry => {
    const rating = Number(entry.rating) || 0;
    if (diaryTagFilter.value !== 'all' && !(entry.tags || []).includes(diaryTagFilter.value)) return false;
    if (diaryRatingFilter.value === 'liked') return rating >= 4;
    if (diaryRatingFilter.value === 'neutral') return rating === 3;
    if (diaryRatingFilter.value === 'disliked') return rating <= 2;
    return true;
  });

  if (diarySortOrder.value === 'recent') {
    visibleEntries.sort((a, b) => (b.ratedAt || '').localeCompare(a.ratedAt || ''));
  } else if (diarySortOrder.value === 'rating-desc') {
    visibleEntries.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (b.ratedAt || '').localeCompare(a.ratedAt || ''));
  } else if (diarySortOrder.value === 'rating-asc') {
    visibleEntries.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0) || (b.ratedAt || '').localeCompare(a.ratedAt || ''));
  } else if (diarySortOrder.value === 'title') {
    visibleEntries.sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }

  diaryCount.textContent = visibleEntries.length === entries.length
    ? `${entries.length} ${entries.length === 1 ? 'título' : 'títulos'}`
    : `${visibleEntries.length} de ${entries.length} títulos`;

  diaryEmpty.hidden = entries.length > 0;
  diaryFilterEmpty.hidden = entries.length === 0 || visibleEntries.length > 0;
  if (entries.length && !visibleEntries.length) {
    diaryFilterEmpty.textContent = 'No hay títulos que coincidan con esos filtros.';
  }

  renderDiaryStats(entries);

  diaryList.innerHTML = visibleEntries.map(entry => {
    const title = escapeHTML(entry.title);
    const tagsMarkup = (entry.tags || []).map(tag => `<span class="diary-tag">${escapeHTML(tag)}</span>`).join('');
    const poster = entry.poster
      ? `<img class="diary-poster" src="${escapeHTML(entry.poster)}" alt="" loading="lazy">`
      : '<div class="diary-poster" aria-hidden="true"></div>';
    const stars = '★'.repeat(Number(entry.rating) || 0) + '☆'.repeat(5 - (Number(entry.rating) || 0));
    const key = escapeHTML(diaryKey(entry));

    return `
      <article class="diary-entry">
        ${poster}
        <div>
          <h3>${title}</h3>
          <div class="diary-meta">
            ${entry.mediaType === 'tv' ? 'Serie' : 'Película'} · ${escapeHTML(entry.year || 'Año desconocido')}
            <span class="diary-rating" aria-label="${entry.rating} de 5 estrellas">${stars}</span>
          </div>
          <div class="diary-rated-at">Calificada el ${formatRatingDate(entry.ratedAt)}</div>
          ${tagsMarkup ? `<div class="diary-tags">${tagsMarkup}</div>` : ''}
          ${savedProviderList(entry.providers, entry.title)}
        </div>
        <div class="diary-actions">
          <button class="diary-action" type="button" data-diary-edit="${key}">Editar</button>
          <button class="diary-action" type="button" data-diary-delete="${key}" aria-label="Eliminar ${title}">Eliminar</button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Inicializa los elementos y eventos de la vista de "Ya vi".
 * @param {object} options
 * @param {(entry: object) => void} options.onEdit
 * @param {(key: string) => void} options.onDelete
 */
export function initDiaryView({ onEdit, onDelete }) {
  diaryList = document.querySelector('#diary-list');
  diaryEmpty = document.querySelector('#diary-empty');
  diaryFilterEmpty = document.querySelector('#diary-filter-empty');
  diaryCount = document.querySelector('#diary-count');
  diaryStats = document.querySelector('#diary-stats');
  diaryRatingFilter = document.querySelector('#diary-rating-filter');
  diaryTagFilter = document.querySelector('#diary-tag-filter');
  diarySortOrder = document.querySelector('#diary-sort-order');

  onEditCallback = onEdit;
  onDeleteCallback = onDelete;

  if (diaryRatingFilter) diaryRatingFilter.addEventListener('change', () => renderDiary());
  if (diaryTagFilter) diaryTagFilter.addEventListener('change', () => renderDiary());
  if (diarySortOrder) diarySortOrder.addEventListener('change', () => renderDiary());

  if (diaryList) {
    diaryList.addEventListener('click', event => {
      const deleteButton = event.target.closest('[data-diary-delete]');
      const editButton = event.target.closest('[data-diary-edit]');

      if (deleteButton && typeof onDeleteCallback === 'function') {
        onDeleteCallback(deleteButton.dataset.diaryDelete);
      } else if (editButton && typeof onEditCallback === 'function') {
        const key = editButton.dataset.diaryEdit;
        const entry = currentDiaryEntries.find(item => diaryKey(item) === key);
        if (entry) {
          onEditCallback(entry);
        }
      }
    });
  }
}
