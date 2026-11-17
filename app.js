/**
 * Cine AR — Punto de entrada principal y orquestador de la aplicación.
 * Conecta los servicios de API, almacenamiento, tema y vistas de la interfaz.
 */

import { initTheme } from './js/services/theme.js';
import { initTabs, updateTabCounts } from './js/ui/tabs.js';
import { showFeedback } from './js/ui/feedback.js';
import { copyMovieTitle } from './js/utils/clipboard.js';
import { initDiaryDialog, openDiaryDialog } from './js/ui/diary-dialog.js';
import { initDetailDialog, openDetailDialog } from './js/ui/detail-dialog.js';
import { initDiaryView, renderDiary } from './js/ui/diary-view.js';
import { initWatchlistView, renderWatchlist } from './js/ui/watchlist-view.js';
import { initServicesSelector, renderServicesSelector } from './js/ui/services-selector.js';
import {
  initSearchView,
  setSearching,
  setStatus,
  setResults,
  openSettings,
  getCurrentMovies
} from './js/ui/search-view.js';
import { searchMedia, loadMovieWithProviders } from './js/api/tmdb.js';
import { POPULAR_SERVICES } from './js/services/providers.js';
import {
  getDiary,
  getWatchlist,
  getMyServices,
  setMyServices,
  toggleMyService,
  upsertDiary,
  deleteFromDiary,
  toggleWatchlist,
  removeFromWatchlist,
  refreshSavedProviders,
  subscribe,
  getTmdbToken,
  setTmdbToken,
  setDiary,
  setWatchlist,
  diaryKey
} from './js/services/storage.js';
import { exportBackup, processBackupFile } from './js/services/backup.js';

// ── Inicialización de componentes ───────────────────────────────────────────

initTheme();
initTabs();
initDiaryDialog();
initServicesSelector({
  initialServices: getMyServices(),
  onToggle: serviceId => {
    const added = toggleMyService(serviceId);
    const service = POPULAR_SERVICES.find(s => s.id === serviceId);
    const name = service ? service.name : serviceId;
    showFeedback(added ? `${name} agregada a tus servicios.` : `${name} removida de tus servicios.`);
  }
});
initDetailDialog({
  onWatch: movie => {
    const existing = getDiary().find(entry => diaryKey(entry) === diaryKey(movie));
    openDiaryDialog(movie, existing, (item, rating, tags) => {
      upsertDiary(item, rating, tags);
    });
  },
  onWatchlist: movie => {
    toggleWatchlist(movie);
  }
});

// ── Sincronización reactiva del almacenamiento ──────────────────────────────

subscribe(({ diary, watchlist, myServices }) => {
  renderDiary(diary);
  renderWatchlist(watchlist, myServices);
  updateTabCounts(diary.length, watchlist.length);
  renderServicesSelector(myServices);
  setResults(getCurrentMovies(), diary, watchlist, myServices);
});

// ── Configuración de vistas ─────────────────────────────────────────────────

// Vista "Ya vi"
initDiaryView({
  onEdit: entry => {
    openDiaryDialog(entry, entry, (item, rating, tags) => {
      upsertDiary(item, rating, tags);
    });
  },
  onDelete: key => {
    deleteFromDiary(key);
  }
});

// Vista "Quiero ver"
initWatchlistView({
  onRemove: key => {
    removeFromWatchlist(key);
  }
});

// Render inicial después de conectar las vistas al DOM.
const initialDiary = getDiary();
const initialWatchlist = getWatchlist();
const initialServices = getMyServices();
renderDiary(initialDiary);
renderWatchlist(initialWatchlist, initialServices);
renderServicesSelector(initialServices);
updateTabCounts(initialDiary.length, initialWatchlist.length);

// Vista de Búsqueda
initSearchView({
  initialToken: getTmdbToken(),
  onSaveToken: token => {
    setTmdbToken(token);
  },
  onDetailClick: movie => {
    const token = getTmdbToken();
    if (!token) {
      openSettings('Agregá tu token gratuito de TMDb para ver los detalles.');
      return;
    }
    openDetailDialog(movie, token, getDiary(), getWatchlist());
  },
  onWatchClick: movie => {
    const existing = getDiary().find(entry => diaryKey(entry) === diaryKey(movie));
    openDiaryDialog(movie, existing, (item, rating, tags) => {
      upsertDiary(item, rating, tags);
    });
  },
  onToggleWatchlist: movie => {
    toggleWatchlist(movie);
  },
  onSearch: async (query, type) => {
    const token = getTmdbToken();
    if (!token) {
      openSettings('Agregá tu token gratuito de TMDb para empezar a buscar.');
      return;
    }

    setSearching(true);
    setResults([]);
    setStatus(type === 'both' ? 'Buscando películas y series…' : `Buscando ${type === 'tv' ? 'series' : 'películas'}…`);

    try {
      const movies = await searchMedia({ query, type, token });

      if (!movies.length) {
        setStatus(`No encontramos resultados para “${query}”.`);
        return;
      }

      setStatus(`Resultados para “${query}”`);
      const loadedMovies = await Promise.all(
        movies.map(movie => loadMovieWithProviders(movie, token, type))
      );

      refreshSavedProviders(loadedMovies);
      setResults(loadedMovies, getDiary(), getWatchlist(), getMyServices());
    } catch (error) {
      setStatus(error.message || 'No se pudo conectar con TMDb. Revisá tu conexión.');
    } finally {
      setSearching(false);
    }
  }
});

// ── Delegación global de enlaces a proveedores de streaming ─────────────────

document.addEventListener('click', event => {
  const providerLink = event.target.closest('[data-provider-title]');
  if (!providerLink) return;

  const title = providerLink.dataset.providerTitle;
  const providerName = providerLink.dataset.providerName;

  if (providerLink.dataset.unsupportedProvider) {
    event.preventDefault();
  }

  copyMovieTitle(title, providerName, showFeedback);
});

// ── Herramientas de respaldo (Exportar / Importar) ───────────────────────────

const exportButton = document.querySelector('#export-backup');
if (exportButton) {
  exportButton.addEventListener('click', () => {
    exportBackup(getDiary(), getWatchlist(), getMyServices());
    showFeedback('Respaldo de Ya vi, Quiero ver y tus plataformas descargado.');
  });
}

const importButton = document.querySelector('#import-backup-button');
const importFileInput = document.querySelector('#import-backup-file');

if (importButton && importFileInput) {
  importButton.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files?.[0];
    if (!file) return;

    try {
      const result = await processBackupFile(file, getDiary(), getWatchlist());
      if (result) {
        setDiary(result.mergedDiary);
        setWatchlist(result.mergedWatchlist);
        if (result.importedServices && result.importedServices.length) {
          setMyServices(result.importedServices);
        }
        showFeedback(
          `Respaldo importado: ${result.importedCount.diary} vistos y ${result.importedCount.watchlist} pendientes.`
        );
      }
    } catch (error) {
      showFeedback(error.message || 'No se pudo importar el respaldo.');
    } finally {
      importFileInput.value = '';
    }
  });
}

// ── Service Worker PWA ──────────────────────────────────────────────────────

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
