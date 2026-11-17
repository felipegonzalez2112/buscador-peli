/**
 * Capa de persistencia en localStorage para el diario ("Ya vi"),
 * la lista de pendientes ("Quiero ver") y las credenciales de TMDb.
 */

import { providerSnapshot } from './providers.js';

const DIARY_KEY = 'cinear_diary';
const WATCHLIST_KEY = 'cinear_watchlist';
const TOKEN_KEY = 'cinear_tmdb_token';
const MY_SERVICES_KEY = 'cinear_my_services';

let diaryEntries = readFromStorage(DIARY_KEY);
let watchlistEntries = readFromStorage(WATCHLIST_KEY);
let userServices = readServicesFromStorage();
const subscribers = new Set();

/**
 * Lee y parsea de forma segura un array almacenado en localStorage.
 * @param {string} key
 * @returns {Array<object>}
 */
function readFromStorage(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/**
 * Lee los servicios de streaming configurados por el usuario.
 * @returns {Array<string>}
 */
function readServicesFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(MY_SERVICES_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(s => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Notifica a todos los suscriptores cuando cambian los datos de la colección o configuración.
 */
function notifySubscribers() {
  const state = {
    diary: [...diaryEntries],
    watchlist: [...watchlistEntries],
    myServices: [...userServices]
  };
  subscribers.forEach(callback => {
    try {
      callback(state);
    } catch (error) {
      console.error('Error en listener de storage:', error);
    }
  });
}

/**
 * Genera la clave unívoca para un título (ej. "movie:550" o "tv:1399").
 * @param {{ mediaType?: string, id: number|string }} item
 * @returns {string}
 */
export function diaryKey(item) {
  return `${item.mediaType}:${item.id}`;
}

export function watchlistKey(item) {
  return diaryKey(item);
}

/**
 * Suscribe una función para escuchar cambios en Ya vi y Quiero ver.
 * @param {(state: { diary: Array<object>, watchlist: Array<object> }) => void} callback
 * @returns {() => void} Función para desuscribirse
 */
export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Retorna las entradas actuales del diario.
 * @returns {Array<object>}
 */
export function getDiary() {
  return [...diaryEntries];
}

/**
 * Retorna las entradas actuales de Quiero ver.
 * @returns {Array<object>}
 */
export function getWatchlist() {
  return [...watchlistEntries];
}

/**
 * Guarda y reemplaza la lista completa de Ya vi.
 * @param {Array<object>} entries
 */
export function setDiary(entries) {
  diaryEntries = [...entries];
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(diaryEntries));
  } catch (error) {
    console.error('Error al guardar el diario:', error);
  }
  notifySubscribers();
}

/**
 * Guarda y reemplaza la lista completa de Quiero ver.
 * @param {Array<object>} entries
 */
export function setWatchlist(entries) {
  watchlistEntries = [...entries];
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlistEntries));
  } catch (error) {
    console.error('Error al guardar la watchlist:', error);
  }
  notifySubscribers();
}

/**
 * Retorna los servicios de streaming configurados por el usuario.
 * @returns {Array<string>}
 */
export function getMyServices() {
  return [...userServices];
}

/**
 * Guarda y actualiza la lista de servicios de streaming del usuario.
 * @param {Array<string>} services
 */
export function setMyServices(services) {
  userServices = Array.isArray(services)
    ? [...new Set(services.filter(s => typeof s === 'string'))]
    : [];
  try {
    localStorage.setItem(MY_SERVICES_KEY, JSON.stringify(userServices));
  } catch (error) {
    console.error('Error al guardar mis servicios:', error);
  }
  notifySubscribers();
}

/**
 * Activa o desactiva un servicio de streaming para el usuario.
 * @param {string} serviceId
 * @returns {boolean} True si quedó activo, false si fue removido
 */
export function toggleMyService(serviceId) {
  const exists = userServices.includes(serviceId);
  const updated = exists
    ? userServices.filter(id => id !== serviceId)
    : [...userServices, serviceId];
  setMyServices(updated);
  return !exists;
}

/**
 * Genera el objeto normalizado para almacenar en el diario.
 * @param {object} item
 * @param {number} rating
 * @param {string[]} tags
 * @returns {object}
 */
export function createStoredDiaryEntry(item, rating, tags) {
  const date = item.release_date || item.first_air_date;
  const currentProviders = providerSnapshot(item.region || {});
  const existing = diaryEntries.find(entry => diaryKey(entry) === diaryKey(item));

  return {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title || item.name || 'Título sin nombre',
    year: date ? date.slice(0, 4) : (item.year || 'Año desconocido'),
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : (item.poster || ''),
    providers: item.region && !item.region.providerError ? currentProviders : (item.providers ?? existing?.providers ?? null),
    rating,
    tags,
    ratedAt: new Date().toISOString()
  };
}

/**
 * Genera el objeto normalizado para almacenar en Quiero ver.
 * @param {object} item
 * @returns {object}
 */
export function createStoredWatchlistEntry(item) {
  const date = item.release_date || item.first_air_date;
  const currentProviders = providerSnapshot(item.region || {});
  const existing = watchlistEntries.find(entry => watchlistKey(entry) === watchlistKey(item));

  return {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title || item.name || 'Título sin nombre',
    year: date ? date.slice(0, 4) : (item.year || 'Año desconocido'),
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : (item.poster || ''),
    providers: item.region && !item.region.providerError ? currentProviders : (item.providers ?? existing?.providers ?? null),
    addedAt: new Date().toISOString()
  };
}

/**
 * Guarda o actualiza un registro en Ya vi y lo remueve de Quiero ver si estaba presente.
 * @param {object} item
 * @param {number} rating
 * @param {string[]} tags
 */
export function upsertDiary(item, rating, tags) {
  const newEntry = createStoredDiaryEntry(item, rating, tags);
  const targetKey = diaryKey(newEntry);

  diaryEntries = diaryEntries.filter(entry => diaryKey(entry) !== targetKey);
  diaryEntries.push(newEntry);

  watchlistEntries = watchlistEntries.filter(entry => watchlistKey(entry) !== targetKey);

  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(diaryEntries));
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlistEntries));
  } catch (error) {
    console.error('Error al guardar en almacenamiento local:', error);
  }

  notifySubscribers();
}

/**
 * Elimina una entrada del diario por su clave.
 * @param {string} key
 */
export function deleteFromDiary(key) {
  diaryEntries = diaryEntries.filter(entry => diaryKey(entry) !== key);
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(diaryEntries));
  } catch (error) {
    console.error('Error al eliminar del diario:', error);
  }
  notifySubscribers();
}

/**
 * Alterna un item en Quiero ver (lo agrega si no está, lo quita si ya está).
 * @param {object} item
 * @returns {boolean} True si fue agregado, false si fue quitado
 */
export function toggleWatchlist(item) {
  const key = watchlistKey(item);
  const exists = watchlistEntries.some(entry => watchlistKey(entry) === key);

  if (exists) {
    watchlistEntries = watchlistEntries.filter(entry => watchlistKey(entry) !== key);
  } else {
    watchlistEntries = [...watchlistEntries, createStoredWatchlistEntry(item)];
  }

  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlistEntries));
  } catch (error) {
    console.error('Error al actualizar Quiero ver:', error);
  }

  notifySubscribers();
  return !exists;
}

/**
 * Remueve un item de Quiero ver por su clave.
 * @param {string} key
 */
export function removeFromWatchlist(key) {
  watchlistEntries = watchlistEntries.filter(entry => watchlistKey(entry) !== key);
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlistEntries));
  } catch (error) {
    console.error('Error al remover de Quiero ver:', error);
  }
  notifySubscribers();
}

/**
 * Actualiza los proveedores guardados en Ya vi y Quiero ver a partir de resultados frescos de búsqueda.
 * @param {Array<object>} movies
 */
export function refreshSavedProviders(movies = []) {
  let diaryChanged = false;
  let watchlistChanged = false;

  for (const movie of movies) {
    if (!movie.region || movie.region.providerError) continue;
    const providers = providerSnapshot(movie.region);
    const key = diaryKey(movie);

    const diaryEntry = diaryEntries.find(entry => diaryKey(entry) === key);
    if (diaryEntry && JSON.stringify(diaryEntry.providers ?? null) !== JSON.stringify(providers)) {
      diaryEntry.providers = providers;
      diaryChanged = true;
    }

    const watchlistEntry = watchlistEntries.find(entry => watchlistKey(entry) === key);
    if (watchlistEntry && JSON.stringify(watchlistEntry.providers ?? null) !== JSON.stringify(providers)) {
      watchlistEntry.providers = providers;
      watchlistChanged = true;
    }
  }

  if (diaryChanged) {
    try {
      localStorage.setItem(DIARY_KEY, JSON.stringify(diaryEntries));
    } catch {}
  }
  if (watchlistChanged) {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlistEntries));
    } catch {}
  }
  if (diaryChanged || watchlistChanged) {
    notifySubscribers();
  }
}

/**
 * Obtiene el token de TMDb guardado o configurado en config.js.
 * @returns {string}
 */
export function getTmdbToken() {
  const configured = window.CINEAR_TMDB_TOKEN?.trim();
  if (configured) return configured;
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Guarda o elimina el token de TMDb en localStorage.
 * @param {string} token
 */
export function setTmdbToken(token) {
  try {
    const trimmed = (token || '').trim();
    if (trimmed) {
      localStorage.setItem(TOKEN_KEY, trimmed);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error al guardar el token:', error);
  }
}
