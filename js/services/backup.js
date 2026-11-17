/**
 * Servicio de importación y exportación de respaldos de la colección (Ya vi y Quiero ver).
 */

import { PROVIDER_GROUPS } from './providers.js';
import { diaryKey, watchlistKey } from './storage.js';

/**
 * Valida la estructura de proveedores dentro de un respaldo.
 * @param {any} groups
 * @returns {Array<object>}
 */
export function validBackupProviders(groups) {
  if (!Array.isArray(groups)) return [];
  const allowedLabels = new Set(PROVIDER_GROUPS.map(group => group.label));

  return groups
    .filter(group => group && allowedLabels.has(group.label) && Array.isArray(group.providers))
    .map(group => ({
      label: group.label,
      providers: group.providers
        .filter(provider => (
          provider &&
          Number.isInteger(Number(provider.provider_id)) &&
          Number(provider.provider_id) > 0 &&
          typeof provider.provider_name === 'string'
        ))
        .map(provider => ({
          provider_id: Number(provider.provider_id),
          provider_name: provider.provider_name.slice(0, 120),
          logo_path: typeof provider.logo_path === 'string' && /^\/[\w./-]*$/.test(provider.logo_path)
            ? provider.logo_path
            : ''
        }))
    }))
    .filter(group => group.providers.length > 0);
}

/**
 * Valida un item de respaldo según su tipo ('diary' o 'watchlist').
 * @param {any} entry
 * @param {'diary'|'watchlist'} kind
 * @returns {object|null}
 */
export function validBackupEntry(entry, kind) {
  if (!entry || typeof entry !== 'object') return null;

  const id = Number(entry.id);
  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !['movie', 'tv'].includes(entry.mediaType) ||
    typeof entry.title !== 'string' ||
    !entry.title.trim()
  ) {
    return null;
  }

  const poster = typeof entry.poster === 'string' && entry.poster.startsWith('https://image.tmdb.org/')
    ? entry.poster
    : '';

  const common = {
    id,
    mediaType: entry.mediaType,
    title: entry.title.trim().slice(0, 300),
    year: typeof entry.year === 'string' ? entry.year.slice(0, 20) : 'Año desconocido',
    poster,
    providers: Array.isArray(entry.providers) ? validBackupProviders(entry.providers) : null
  };

  if (kind === 'watchlist') {
    return {
      ...common,
      addedAt: typeof entry.addedAt === 'string' ? entry.addedAt : ''
    };
  }

  const rating = Number(entry.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;

  return {
    ...common,
    rating,
    tags: Array.isArray(entry.tags)
      ? entry.tags.filter(tag => typeof tag === 'string').map(tag => tag.slice(0, 80)).slice(0, 30)
      : [],
    ratedAt: typeof entry.ratedAt === 'string' ? entry.ratedAt : ''
  };
}

/**
 * Combina listas existentes con entrantes sobreescribiendo por clave unívoca.
 * @param {Array<object>} existing
 * @param {Array<object>} incoming
 * @param {(entry: object) => string} keyFunction
 * @returns {Array<object>}
 */
export function mergeEntries(existing, incoming, keyFunction) {
  const merged = new Map(existing.map(entry => [keyFunction(entry), entry]));
  incoming.forEach(entry => merged.set(keyFunction(entry), entry));
  return [...merged.values()];
}

/**
 * Genera y descarga un archivo JSON con el respaldo de Ya vi y Quiero ver.
 * @param {Array<object>} diaryEntries
 * @param {Array<object>} watchlistEntries
 */
export function exportBackup(diaryEntries, watchlistEntries) {
  const backup = {
    format: 'cine-ar-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    diary: diaryEntries,
    watchlist: watchlistEntries
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cine-ar-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Procesa un archivo JSON subido para importar su contenido en la colección.
 * @param {File} file
 * @param {Array<object>} currentDiary
 * @param {Array<object>} currentWatchlist
 * @returns {Promise<{ mergedDiary: Array<object>, mergedWatchlist: Array<object>, importedCount: { diary: number, watchlist: number } } | null>}
 */
export async function processBackupFile(file, currentDiary, currentWatchlist) {
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    throw new Error('El archivo no contiene un JSON válido.');
  }

  if (
    backup?.format !== 'cine-ar-backup' ||
    backup.version !== 1 ||
    !Array.isArray(backup.diary) ||
    !Array.isArray(backup.watchlist)
  ) {
    throw new Error('Ese archivo no parece ser un respaldo de Cine AR compatible.');
  }

  const importedDiary = backup.diary.map(entry => validBackupEntry(entry, 'diary')).filter(Boolean);
  const importedWatchlist = backup.watchlist.map(entry => validBackupEntry(entry, 'watchlist')).filter(Boolean);

  if ((backup.diary.length && !importedDiary.length) || (backup.watchlist.length && !importedWatchlist.length)) {
    throw new Error('El respaldo no contiene registros válidos. No se modificaron tus datos.');
  }

  const duplicates = importedDiary.filter(entry => currentDiary.some(saved => diaryKey(saved) === diaryKey(entry))).length
    + importedWatchlist.filter(entry => currentWatchlist.some(saved => watchlistKey(saved) === watchlistKey(entry))).length;

  const detail = duplicates ? ` Los ${duplicates} registros que coincidan se actualizarán con los del archivo.` : '';
  const confirmed = window.confirm(
    `Se combinarán ${importedDiary.length} vistos y ${importedWatchlist.length} pendientes con los datos de este dispositivo.${detail} ¿Continuar?`
  );

  if (!confirmed) return null;

  const diaryToImport = importedDiary.map(entry => {
    const saved = currentDiary.find(current => diaryKey(current) === diaryKey(entry));
    return !Array.isArray(entry.providers) && Array.isArray(saved?.providers)
      ? { ...entry, providers: saved.providers }
      : entry;
  });

  const watchlistToImport = importedWatchlist.map(entry => {
    const saved = currentWatchlist.find(current => watchlistKey(current) === watchlistKey(entry));
    return !Array.isArray(entry.providers) && Array.isArray(saved?.providers)
      ? { ...entry, providers: saved.providers }
      : entry;
  });

  const mergedDiary = mergeEntries(currentDiary, diaryToImport, diaryKey);
  const mergedWatchlist = mergeEntries(currentWatchlist, watchlistToImport, watchlistKey);

  return {
    mergedDiary,
    mergedWatchlist,
    importedCount: {
      diary: importedDiary.length,
      watchlist: importedWatchlist.length
    }
  };
}
