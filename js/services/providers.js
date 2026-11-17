/**
 * Catálogo de plataformas de streaming en Argentina, resolución de enlaces y generación de markup.
 */

import { escapeHTML } from '../utils/formatters.js';

export const PROVIDER_GROUPS = [
  { key: 'flatrate', label: 'Streaming' },
  { key: 'free', label: 'Gratis' },
  { key: 'ads', label: 'Con anuncios' },
  { key: 'rent', label: 'Alquiler' },
  { key: 'buy', label: 'Compra' }
];

const PROVIDER_HOMES_BY_ID = {
  2: 'https://tv.apple.com/',
  3: 'https://www.youtube.com/',
  8: 'https://www.netflix.com/',
  9: 'https://www.primevideo.com/',
  11: 'https://mubi.com/',
  35: 'https://www.rakuten.tv/',
  73: 'https://tubitv.com/',
  167: 'https://www.clarovideo.com/',
  189: 'https://play.max.com/',
  191: 'https://qubit.tv/',
  192: 'https://www.youtube.com/',
  195: 'https://play.cine.ar/',
  230: 'https://www.flow.com.ar/',
  283: 'https://www.crunchyroll.com/',
  300: 'https://pluto.tv/',
  337: 'https://www.disneyplus.com/',
  339: 'https://tv.movistar.com.ar/',
  350: 'https://tv.apple.com/',
  531: 'https://www.paramountplus.com/',
  538: 'https://www.plex.tv/',
  619: 'https://www.disneyplus.com/'
};

/**
 * Obtiene los proveedores correspondientes a Argentina (código AR) del payload de TMDb.
 * @param {object} data
 * @returns {object}
 */
export function getRegion(data) {
  return data?.results?.AR || {};
}

/**
 * Retorna la URL web o deep-link principal para un proveedor de streaming.
 * @param {{ provider_id: number|string, provider_name: string }} provider
 * @returns {string}
 */
export function providerAppUrl(provider) {
  const id = Number(provider?.provider_id);
  if (PROVIDER_HOMES_BY_ID[id]) return PROVIDER_HOMES_BY_ID[id];

  const name = (provider?.provider_name || '').toLowerCase();
  if (name.includes('netflix')) return PROVIDER_HOMES_BY_ID[8];
  if (name.includes('prime video') || name.includes('amazon')) return PROVIDER_HOMES_BY_ID[9];
  if (name.includes('disney') || name.includes('star+')) return PROVIDER_HOMES_BY_ID[337];
  if (name.includes('max') || name.includes('hbo')) return PROVIDER_HOMES_BY_ID[189];
  if (name.includes('apple tv')) return PROVIDER_HOMES_BY_ID[2];
  if (name.includes('paramount')) return PROVIDER_HOMES_BY_ID[531];
  if (name.includes('mubi')) return PROVIDER_HOMES_BY_ID[11];
  if (name.includes('crunchyroll')) return PROVIDER_HOMES_BY_ID[283];
  if (name.includes('plex')) return PROVIDER_HOMES_BY_ID[538];
  if (name.includes('youtube') || name.includes('google play')) return PROVIDER_HOMES_BY_ID[192];
  if (name.includes('tubi')) return PROVIDER_HOMES_BY_ID[73];
  if (name.includes('pluto')) return PROVIDER_HOMES_BY_ID[300];
  if (name.includes('rakuten')) return PROVIDER_HOMES_BY_ID[35];
  if (name.includes('qubit')) return PROVIDER_HOMES_BY_ID[191];
  if (name.includes('cine.ar') || name.includes('cine ar')) return PROVIDER_HOMES_BY_ID[195];
  if (name.includes('flow')) return PROVIDER_HOMES_BY_ID[230];
  if (name.includes('movistar')) return PROVIDER_HOMES_BY_ID[339];
  if (name.includes('claro')) return PROVIDER_HOMES_BY_ID[167];

  return '';
}

/**
 * Determina si una película o serie cumple con el filtro de disponibilidad.
 * @param {object} movie
 * @param {'all'|'streaming'|'rent'|'buy'} filter
 * @returns {boolean}
 */
export function hasAvailability(movie, filter) {
  if (filter === 'all') return true;
  if (!movie?.region) return false;
  if (filter === 'streaming') {
    return ['flatrate', 'free', 'ads'].some(key => Boolean(movie.region[key]?.length));
  }
  return Boolean(movie.region[filter]?.length);
}

/**
 * Genera una instantánea normalizada de proveedores agrupados para almacenar en Ya vi / Quiero ver.
 * @param {object} region
 * @returns {Array<{ label: string, providers: Array<{ provider_id: number, provider_name: string, logo_path: string }> }>}
 */
export function providerSnapshot(region = {}) {
  const seen = new Set();
  return PROVIDER_GROUPS.map(group => ({
    label: group.label,
    providers: (region[group.key] || [])
      .filter(provider => !seen.has(provider.provider_id) && seen.add(provider.provider_id))
      .map(provider => ({
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        logo_path: provider.logo_path || ''
      }))
  })).filter(group => group.providers.length > 0);
}

/**
 * Genera el markup HTML para un enlace a proveedor con soporte para copiar el título.
 * @param {object} provider
 * @param {string} title
 * @returns {string}
 */
export function providerLinkMarkup(provider, title) {
  const appUrl = providerAppUrl(provider);
  const actionLabel = appUrl
    ? `Copiar ${title} y abrir ${provider.provider_name}`
    : `Copiar ${title}; luego abrir ${provider.provider_name}`;

  const hrefAttr = appUrl ? `href="${appUrl}"` : 'href="#" data-unsupported-provider="true"';
  const logo = provider.logo_path
    ? `<img src="https://image.tmdb.org/t/p/w92${escapeHTML(provider.logo_path)}" alt="" loading="lazy">`
    : '';

  return `<a class="provider" ${hrefAttr} data-provider-title="${escapeHTML(title)}" data-provider-name="${escapeHTML(provider.provider_name)}" aria-label="${escapeHTML(actionLabel)}">${logo}${escapeHTML(provider.provider_name)}</a>`;
}

/**
 * Renderiza la lista de plataformas guardadas para los items de la colección.
 * @param {Array|null} groups
 * @param {string} title
 * @returns {string}
 */
export function savedProviderList(groups, title) {
  if (!Array.isArray(groups)) {
    return '<div class="saved-platforms-empty">Plataformas no guardadas. Volvé a buscar este título para actualizarlas.</div>';
  }
  if (!groups.length) {
    return '<div class="saved-platforms-empty">Sin disponibilidad informada en Argentina.</div>';
  }
  return `<div class="saved-platform-groups">${groups.map(group => `
    <div class="saved-platform-group">
      <span>${escapeHTML(group.label)}</span>
      <div class="providers">${group.providers.map(provider => providerLinkMarkup(provider, title)).join('')}</div>
    </div>
  `).join('')}</div>`;
}

/**
 * Renderiza la disponibilidad actual consultada a TMDb para la vista de búsqueda.
 * @param {object} region
 * @param {string} title
 * @returns {string}
 */
export function providerList(region = {}, title) {
  const seen = new Set();
  const groupsMarkup = PROVIDER_GROUPS.map(group => {
    const providers = (region[group.key] || []).filter(provider => !seen.has(provider.provider_id) && seen.add(provider.provider_id));
    if (!providers.length) return '';
    return `<div class="provider-group"><div class="availability-type">${group.label}</div><div class="providers">${providers.map(p => providerLinkMarkup(p, title)).join('')}</div></div>`;
  }).join('');

  return groupsMarkup || '<span class="empty-providers">Sin disponibilidad informada en Argentina.</span>';
}
