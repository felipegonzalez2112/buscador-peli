/**
 * Cliente de la API de The Movie Database (TMDb v3).
 */

import { getRegion } from '../services/providers.js';

const API_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Realiza una petición autenticada a la API de TMDb.
 * @param {string} path
 * @param {string} token
 * @returns {Promise<any>}
 */
export async function fetchFromTmdb(path, token) {
  if (!token) {
    throw new Error('No se ha proporcionado un token de TMDb.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('El token no es válido. Revisalo en la configuración.');
    }
    throw new Error(`TMDb respondió con un error (${response.status}). Probá de nuevo en un momento.`);
  }

  return response.json();
}

/**
 * Retorna la fecha actual en formato YYYY-MM-DD según la zona horaria local.
 * @returns {string}
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Comprueba si un título ya fue estrenado (excluye estrenos futuros o fechas no confirmadas).
 * @param {object} item
 * @param {string} [today]
 * @returns {boolean}
 */
export function isReleased(item, today = getTodayDateString()) {
  const date = item.release_date || item.first_air_date;
  return Boolean(date && date <= today);
}

/**
 * Busca películas, series o ambos en TMDb.
 * Filtra automáticamente producciones que aún no han sido estrenadas.
 * @param {object} options
 * @param {string} options.query
 * @param {'both'|'movie'|'tv'} options.type
 * @param {string} options.token
 * @param {number} [options.limit=8]
 * @returns {Promise<Array<object>>}
 */
export async function searchMedia({ query, type = 'both', token, limit = 8 }) {
  const endpoint = type === 'both' ? 'multi' : type;
  const searchParams = new URLSearchParams({
    query,
    language: 'es-AR'
  });

  if (type !== 'tv') {
    searchParams.set('include_adult', 'false');
  }

  const data = await fetchFromTmdb(`/search/${endpoint}?${searchParams.toString()}`, token);
  const results = data.results || [];
  const today = getTodayDateString();

  return results
    .filter(item => {
      // Filtrar tipos en búsqueda múltiple
      if (type === 'both' && item.media_type !== 'movie' && item.media_type !== 'tv') {
        return false;
      }
      // Filtrar películas o series no estrenadas
      return isReleased(item, today);
    })
    .slice(0, limit)
    .map(item => ({
      ...item,
      mediaType: type === 'both' ? item.media_type : type
    }));
}

/**
 * Obtiene los detalles completos de una película o serie, incluyendo créditos y videos.
 * @param {number|string} id
 * @param {'movie'|'tv'} mediaType
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getMediaDetails(id, mediaType, token) {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  return fetchFromTmdb(
    `/${type}/${id}?language=es-AR&append_to_response=credits,videos`,
    token
  );
}

/**
 * Carga los proveedores de disponibilidad para una película o serie.
 * @param {object} movie
 * @param {string} token
 * @param {'both'|'movie'|'tv'} [fallbackType='movie']
 * @returns {Promise<object>}
 */
export async function loadMovieWithProviders(movie, token, fallbackType = 'movie') {
  const mediaType = movie.mediaType || fallbackType;
  let region = {};

  try {
    const rawProviders = await fetchFromTmdb(`/${mediaType}/${movie.id}/watch/providers`, token);
    region = getRegion(rawProviders);
  } catch (error) {
    region.providerError = error.message;
  }

  return {
    ...movie,
    region,
    mediaType
  };
}
