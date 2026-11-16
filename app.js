const API = 'https://api.themoviedb.org/3';
    const themeSelect = document.querySelector('#theme-select');
    const themeColorMeta = document.querySelector('#theme-color-meta');
    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(preference, persist = false) {
      const resolvedTheme = preference === 'system' ? (systemThemeQuery.matches ? 'dark' : 'light') : preference;
      document.documentElement.dataset.theme = resolvedTheme;
      themeColorMeta.content = resolvedTheme === 'dark' ? '#101014' : '#f7f5f3';
      if (persist) localStorage.setItem('cinear_theme', preference);
    }
    const savedThemePreference = localStorage.getItem('cinear_theme') || 'system';
    themeSelect.value = ['system', 'light', 'dark'].includes(savedThemePreference) ? savedThemePreference : 'system';
    applyTheme(themeSelect.value);
    themeSelect.addEventListener('change', () => applyTheme(themeSelect.value, true));
    systemThemeQuery.addEventListener?.('change', () => {
      if (themeSelect.value === 'system') applyTheme('system');
    });
    const form = document.querySelector('#search-form');
    const queryInput = document.querySelector('#query');
    const mediaType = document.querySelector('#media-type');
    const status = document.querySelector('#status');
    const results = document.querySelector('#results');
    const searchButton = document.querySelector('#search-button');
    const keyInput = document.querySelector('#api-key');
    const settings = document.querySelector('#settings');
    const resultTools = document.querySelector('#result-tools');
    const resultCount = document.querySelector('#result-count');
    const availabilityFilter = document.querySelector('#availability-filter');
    const sortOrder = document.querySelector('#sort-order');
    let currentMovies = [];
    const diaryDialog = document.querySelector('#diary-dialog');
    const diaryForm = document.querySelector('#diary-form');
    const diaryList = document.querySelector('#diary-list');
    const diaryEmpty = document.querySelector('#diary-empty');
    const diaryFilterEmpty = document.querySelector('#diary-filter-empty');
    const diaryCount = document.querySelector('#diary-count');
    const diaryStats = document.querySelector('#diary-stats');
    const diaryRatingFilter = document.querySelector('#diary-rating-filter');
    const diaryTagFilter = document.querySelector('#diary-tag-filter');
    const diarySortOrder = document.querySelector('#diary-sort-order');
    const watchlistList = document.querySelector('#watchlist-list');
    const watchlistEmpty = document.querySelector('#watchlist-empty');
    const watchlistCount = document.querySelector('#watchlist-count');
    const watchlistTabCount = document.querySelector('#tab-watchlist-count');
    const actionFeedback = document.querySelector('#action-feedback');
    const diaryTabCount = document.querySelector('#tab-diary-count');
    const tabButtons = [...document.querySelectorAll('[role="tab"]')];
    const tabPanels = [...document.querySelectorAll('[role="tabpanel"]')];
    let diaryItem = null;
    let diaryEntries = readDiary();
    let watchlistEntries = readWatchlist();
    function activateTab(tab) {
      tabButtons.forEach(button => {
        const active = button === tab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      tabPanels.forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    }
    tabButtons.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabButtons[(index + direction + tabButtons.length) % tabButtons.length];
        activateTab(next);
        next.focus();
      });
    });
    const configuredToken = window.CINEAR_TMDB_TOKEN?.trim() || '';
    keyInput.value = configuredToken || localStorage.getItem('cinear_tmdb_token') || '';
    document.querySelector('#save-key').addEventListener('click', () => {
      const token = keyInput.value.trim();
      if (token) localStorage.setItem('cinear_tmdb_token', token);
      else localStorage.removeItem('cinear_tmdb_token');
      status.textContent = token ? 'Token guardado en este dispositivo.' : 'Token eliminado.';
      if (token) settings.open = false;
    });
    async function tmdb(path, token) {
      const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
      if (!response.ok) {
        if (response.status === 401) throw new Error('El token no es válido. Revisalo en la configuración.');
        throw new Error(`TMDb respondió con un error (${response.status}). Probá de nuevo en un momento.`);
      }
      return response.json();
    }
    const providerGroups = [
      { key: 'flatrate', label: 'Streaming' }, { key: 'free', label: 'Gratis' },
      { key: 'ads', label: 'Con anuncios' }, { key: 'rent', label: 'Alquiler' }, { key: 'buy', label: 'Compra' }
    ];
    function getRegion(data) { return data.results?.AR || {}; }
    function providerAppUrl(provider) {
      const id = Number(provider.provider_id);
      const homes = {
        2: 'https://tv.apple.com/', 3: 'https://www.youtube.com/', 8: 'https://www.netflix.com/',
        9: 'https://www.primevideo.com/', 11: 'https://mubi.com/', 35: 'https://www.rakuten.tv/',
        73: 'https://tubitv.com/', 167: 'https://www.clarovideo.com/', 189: 'https://play.max.com/',
        191: 'https://qubit.tv/', 192: 'https://www.youtube.com/', 195: 'https://play.cine.ar/',
        230: 'https://www.flow.com.ar/', 283: 'https://www.crunchyroll.com/', 300: 'https://pluto.tv/',
        337: 'https://www.disneyplus.com/', 339: 'https://tv.movistar.com.ar/', 350: 'https://tv.apple.com/',
        531: 'https://www.paramountplus.com/', 538: 'https://www.plex.tv/', 619: 'https://www.disneyplus.com/'
      };
      if (homes[id]) return homes[id];
      const name = provider.provider_name.toLowerCase();
      if (name.includes('netflix')) return homes[8];
      if (name.includes('prime video') || name.includes('amazon')) return homes[9];
      if (name.includes('disney') || name.includes('star+')) return homes[337];
      if (name.includes('max') || name.includes('hbo')) return homes[189];
      if (name.includes('apple tv')) return homes[2];
      if (name.includes('paramount')) return homes[531];
      if (name.includes('mubi')) return homes[11];
      if (name.includes('crunchyroll')) return homes[283];
      if (name.includes('plex')) return homes[538];
      if (name.includes('youtube') || name.includes('google play')) return homes[192];
      if (name.includes('tubi')) return homes[73];
      if (name.includes('pluto')) return homes[300];
      if (name.includes('rakuten')) return homes[35];
      if (name.includes('qubit')) return homes[191];
      if (name.includes('cine.ar') || name.includes('cine ar')) return homes[195];
      if (name.includes('flow')) return homes[230];
      if (name.includes('movistar')) return homes[339];
      if (name.includes('claro')) return homes[167];
      return '';
    }
    function hasAvailability(movie, filter) {
      if (filter === 'all') return true;
      if (filter === 'streaming') return ['flatrate', 'free', 'ads'].some(key => movie.region[key]?.length);
      return Boolean(movie.region[filter]?.length);
    }
    function providerSnapshot(region) {
      const seen = new Set();
      return providerGroups.map(group => ({
        label: group.label,
        providers: (region[group.key] || []).filter(provider => !seen.has(provider.provider_id) && seen.add(provider.provider_id)).map(provider => ({
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          logo_path: provider.logo_path || ''
        }))
      })).filter(group => group.providers.length);
    }
    function providerLinkMarkup(provider, title) {
      const appUrl = providerAppUrl(provider);
      const actionLabel = appUrl ? `Copiar ${title} y abrir ${provider.provider_name}` : `Copiar ${title}; luego abrir ${provider.provider_name}`;
      return `<a class="provider" ${appUrl ? `href="${appUrl}"` : 'href="#" data-unsupported-provider="true"'} data-provider-title="${escapeHTML(title)}" data-provider-name="${escapeHTML(provider.provider_name)}" aria-label="${escapeHTML(actionLabel)}">${provider.logo_path ? `<img src="https://image.tmdb.org/t/p/w92${escapeHTML(provider.logo_path)}" alt="" loading="lazy">` : ''}${escapeHTML(provider.provider_name)}</a>`;
    }
    function savedProviderList(groups, title) {
      if (!Array.isArray(groups)) return '<div class="saved-platforms-empty">Plataformas no guardadas. Volvé a buscar este título para actualizarlas.</div>';
      if (!groups.length) return '<div class="saved-platforms-empty">Sin disponibilidad informada en Argentina.</div>';
      return `<div class="saved-platform-groups">${groups.map(group => `<div class="saved-platform-group"><span>${escapeHTML(group.label)}</span><div class="providers">${group.providers.map(provider => providerLinkMarkup(provider, title)).join('')}</div></div>`).join('')}</div>`;
    }
    function providerList(region, title) {
      const seen = new Set();
      const groupsMarkup = providerGroups.map(group => {
        const providers = (region[group.key] || []).filter(provider => !seen.has(provider.provider_id) && seen.add(provider.provider_id));
        if (!providers.length) return '';
        return `<div class="provider-group"><div class="availability-type">${group.label}</div><div class="providers">${providers.map(p => providerLinkMarkup(p, title)).join('')}</div></div>`;
      }).join('');
      return groupsMarkup || '<span class="empty-providers">Sin disponibilidad informada en Argentina.</span>';
    }
    function escapeHTML(value='') { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
    function readDiary() {
      try {
        const saved = JSON.parse(localStorage.getItem('cinear_diary') || '[]');
        return Array.isArray(saved) ? saved : [];
      } catch { return []; }
    }
    function readWatchlist() {
      try {
        const saved = JSON.parse(localStorage.getItem('cinear_watchlist') || '[]');
        return Array.isArray(saved) ? saved : [];
      } catch { return []; }
    }
    function diaryKey(item) { return `${item.mediaType}:${item.id}`; }
    function watchlistKey(item) { return diaryKey(item); }
    function saveDiary() {
      localStorage.setItem('cinear_diary', JSON.stringify(diaryEntries));
      renderDiary();
    }
    function saveWatchlist() {
      localStorage.setItem('cinear_watchlist', JSON.stringify(watchlistEntries));
      renderWatchlist();
    }
    let feedbackTimeout;
    function showFeedback(message) {
      actionFeedback.textContent = message;
      actionFeedback.hidden = false;
      clearTimeout(feedbackTimeout);
      feedbackTimeout = setTimeout(() => { actionFeedback.hidden = true; }, 4200);
    }
    function legacyCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      try { return document.execCommand('copy'); }
      catch { return false; }
      finally { textarea.remove(); }
    }
    function copyMovieTitle(title, providerName) {
      const copiedFallback = legacyCopy(title);
      if (!navigator.clipboard?.writeText) {
        showFeedback(copiedFallback
          ? `Copiamos “${title}”. Pegalo en ${providerName}.`
          : `Abrí ${providerName} y buscá “${title}”.`);
        return;
      }
      navigator.clipboard.writeText(title).then(() => {
        showFeedback(`Copiamos “${title}”. Pegalo en ${providerName}.`);
      }).catch(() => {
        showFeedback(copiedFallback
          ? `Copiamos “${title}”. Pegalo en ${providerName}.`
          : `Abrí ${providerName} y buscá “${title}”.`);
      });
    }
    function formatRatingDate(value) {
      if (!value) return 'Fecha no disponible';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function renderDiaryStats() {
      diaryStats.hidden = diaryEntries.length === 0;
      if (!diaryEntries.length) { diaryStats.replaceChildren(); return; }
      const average = diaryEntries.reduce((sum, entry) => sum + (Number(entry.rating) || 0), 0) / diaryEntries.length;
      const topRating = Math.max(...diaryEntries.map(entry => Number(entry.rating) || 0));
      const topEntries = diaryEntries.filter(entry => Number(entry.rating) === topRating);
      const bestNames = topEntries.slice(0, 3).map(entry => escapeHTML(entry.title)).join(', ');
      const tags = diaryEntries.flatMap(entry => entry.tags || []).reduce((counts, tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
        return counts;
      }, {});
      const topTags = Object.entries(tags).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 5);
      const maxTagCount = topTags[0]?.[1] || 1;
      const recent = [...diaryEntries].filter(entry => entry.ratedAt).sort((a, b) => b.ratedAt.localeCompare(a.ratedAt))[0];
      diaryStats.innerHTML = `<article class="stat-card stat-total"><span class="stat-label">Vistas</span><strong>${diaryEntries.length}</strong><span class="stat-note">películas y series</span></article>
        <article class="stat-card"><span class="stat-label">Promedio</span><strong>${average.toFixed(1)}<span class="stat-unit"> / 5</span></strong><span class="stat-note">tu calificación media</span></article>
        <article class="stat-card stat-best"><span class="stat-label">Mejor puntuadas · ${topRating}/5</span><strong>${bestNames}</strong><span class="stat-note">${topEntries.length > 3 ? `y ${topEntries.length - 3} más` : `${topEntries.length === 1 ? 'Tu favorita por nota' : 'Empate en el primer puesto'}`}</span></article>
        <article class="stat-card"><span class="stat-label">Última calificación</span><strong>${recent ? formatRatingDate(recent.ratedAt) : '—'}</strong><span class="stat-note">${recent ? escapeHTML(recent.title) : 'Todavía sin fechas registradas'}</span></article>
        <article class="stat-card stat-tags"><span class="stat-label">Emociones y etiquetas</span>${topTags.length ? `<div class="tag-stats">${topTags.map(([tag, count]) => `<div class="tag-stat"><span>${escapeHTML(tag)}</span><span class="tag-stat-track"><i style="--tag-fill:${Math.round(count / maxTagCount * 100)}%"></i></span><b>${count}</b></div>`).join('')}</div>` : '<span class="stat-note">Agregá etiquetas al puntuar para ver tus tendencias.</span>'}</article>`;
    }
    function renderDiary() {
      const selectedTag = diaryTagFilter.value;
      const tags = [...new Set(diaryEntries.flatMap(entry => entry.tags || []))].sort((a, b) => a.localeCompare(b, 'es'));
      diaryTagFilter.innerHTML = '<option value="all">Todas las etiquetas</option>' + tags.map(tag => `<option value="${escapeHTML(tag)}">${escapeHTML(tag)}</option>`).join('');
      diaryTagFilter.value = tags.includes(selectedTag) ? selectedTag : 'all';
      let visibleEntries = diaryEntries.filter(entry => {
        const rating = Number(entry.rating) || 0;
        if (diaryTagFilter.value !== 'all' && !(entry.tags || []).includes(diaryTagFilter.value)) return false;
        if (diaryRatingFilter.value === 'liked') return rating >= 4;
        if (diaryRatingFilter.value === 'neutral') return rating === 3;
        if (diaryRatingFilter.value === 'disliked') return rating <= 2;
        return true;
      });
      if (diarySortOrder.value === 'recent') visibleEntries.sort((a, b) => (b.ratedAt || '').localeCompare(a.ratedAt || ''));
      if (diarySortOrder.value === 'rating-desc') visibleEntries.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (b.ratedAt || '').localeCompare(a.ratedAt || ''));
      if (diarySortOrder.value === 'rating-asc') visibleEntries.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0) || (b.ratedAt || '').localeCompare(a.ratedAt || ''));
      if (diarySortOrder.value === 'title') visibleEntries.sort((a, b) => a.title.localeCompare(b.title, 'es'));
      diaryCount.textContent = visibleEntries.length === diaryEntries.length
        ? `${diaryEntries.length} ${diaryEntries.length === 1 ? 'título' : 'títulos'}`
        : `${visibleEntries.length} de ${diaryEntries.length} títulos`;
      diaryTabCount.textContent = String(diaryEntries.length);
      diaryEmpty.hidden = diaryEntries.length > 0;
      diaryFilterEmpty.hidden = diaryEntries.length === 0 || visibleEntries.length > 0;
      if (diaryEntries.length && !visibleEntries.length) diaryFilterEmpty.textContent = 'No hay títulos que coincidan con esos filtros.';
      renderDiaryStats();
      diaryList.innerHTML = visibleEntries.map(entry => {
        const title = escapeHTML(entry.title);
        const tags = (entry.tags || []).map(tag => `<span class="diary-tag">${escapeHTML(tag)}</span>`).join('');
        const poster = entry.poster ? `<img class="diary-poster" src="${escapeHTML(entry.poster)}" alt="" loading="lazy">` : '<div class="diary-poster" aria-hidden="true"></div>';
        const stars = '★'.repeat(Number(entry.rating) || 0) + '☆'.repeat(5 - (Number(entry.rating) || 0));
        return `<article class="diary-entry">${poster}<div><h3>${title}</h3><div class="diary-meta">${entry.mediaType === 'tv' ? 'Serie' : 'Película'} · ${escapeHTML(entry.year || 'Año desconocido')} <span class="diary-rating" aria-label="${entry.rating} de 5 estrellas">${stars}</span></div><div class="diary-rated-at">Calificada el ${formatRatingDate(entry.ratedAt)}</div>${tags ? `<div class="diary-tags">${tags}</div>` : ''}${savedProviderList(entry.providers, entry.title)}</div><div class="diary-actions"><button class="diary-action" type="button" data-diary-edit="${escapeHTML(diaryKey(entry))}">Editar</button><button class="diary-action" type="button" data-diary-delete="${escapeHTML(diaryKey(entry))}" aria-label="Eliminar ${title}">Eliminar</button></div></article>`;
      }).join('');
    }
    function renderWatchlist() {
      watchlistCount.textContent = `${watchlistEntries.length} ${watchlistEntries.length === 1 ? 'título' : 'títulos'}`;
      watchlistTabCount.textContent = String(watchlistEntries.length);
      watchlistEmpty.hidden = watchlistEntries.length > 0;
      watchlistList.innerHTML = [...watchlistEntries].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '')).map(entry => {
        const title = escapeHTML(entry.title);
        const poster = entry.poster ? `<img class="diary-poster" src="${escapeHTML(entry.poster)}" alt="" loading="lazy">` : '<div class="diary-poster" aria-hidden="true"></div>';
        return `<article class="diary-entry">${poster}<div><h3>${title}</h3><div class="diary-meta">${entry.mediaType === 'tv' ? 'Serie' : 'Película'} · ${escapeHTML(entry.year || 'Año desconocido')}</div>${savedProviderList(entry.providers, entry.title)}</div><div class="diary-actions"><button class="diary-action" type="button" data-watchlist-remove="${escapeHTML(watchlistKey(entry))}" aria-label="Quitar ${title} de Quiero ver">Quitar</button></div></article>`;
      }).join('');
    }
    function openDiary(item) {
      diaryItem = item;
      const key = diaryKey(item);
      const existing = diaryEntries.find(entry => diaryKey(entry) === key);
      const title = item.title || item.name || 'Título sin nombre';
      document.querySelector('#diary-form-title').textContent = existing ? 'Editar registro' : 'La vi';
      document.querySelector('#diary-item-name').textContent = title;
      diaryForm.querySelectorAll('[name="rating"]').forEach(radio => { radio.checked = String(existing?.rating || '') === radio.value; });
      diaryForm.querySelectorAll('[name="tag"]').forEach(box => { box.checked = Boolean(existing?.tags?.includes(box.value)); });
      diaryDialog.showModal();
    }
    function storedDiaryEntry(item, rating, tags) {
      const date = item.release_date || item.first_air_date;
      const currentProviders = providerSnapshot(item.region || {});
      const existing = diaryEntries.find(entry => diaryKey(entry) === diaryKey(item));
      return {
        id: item.id,
        mediaType: item.mediaType,
        title: item.title || item.name || 'Título sin nombre',
        year: date ? date.slice(0, 4) : 'Año desconocido',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : (item.poster || ''),
        providers: item.region && !item.region.providerError ? currentProviders : (item.providers ?? existing?.providers ?? null),
        rating,
        tags,
        ratedAt: new Date().toISOString()
      };
    }
    function storedWatchlistEntry(item) {
      const date = item.release_date || item.first_air_date;
      const currentProviders = providerSnapshot(item.region || {});
      const existing = watchlistEntries.find(entry => watchlistKey(entry) === watchlistKey(item));
      return {
        id: item.id,
        mediaType: item.mediaType,
        title: item.title || item.name || 'Título sin nombre',
        year: date ? date.slice(0, 4) : 'Año desconocido',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : '',
        providers: item.region && !item.region.providerError ? currentProviders : (item.providers ?? existing?.providers ?? null),
        addedAt: new Date().toISOString()
      };
    }
    function validBackupEntry(entry, kind) {
      if (!entry || typeof entry !== 'object') return null;
      const id = Number(entry.id);
      if (!Number.isInteger(id) || id <= 0 || !['movie', 'tv'].includes(entry.mediaType) || typeof entry.title !== 'string' || !entry.title.trim()) return null;
      const poster = typeof entry.poster === 'string' && entry.poster.startsWith('https://image.tmdb.org/') ? entry.poster : '';
      const common = {
        id,
        mediaType: entry.mediaType,
        title: entry.title.trim().slice(0, 300),
        year: typeof entry.year === 'string' ? entry.year.slice(0, 20) : 'Año desconocido',
        poster,
        providers: Array.isArray(entry.providers) ? validBackupProviders(entry.providers) : null
      };
      if (kind === 'watchlist') return { ...common, addedAt: typeof entry.addedAt === 'string' ? entry.addedAt : '' };
      const rating = Number(entry.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
      return {
        ...common,
        rating,
        tags: Array.isArray(entry.tags) ? entry.tags.filter(tag => typeof tag === 'string').map(tag => tag.slice(0, 80)).slice(0, 30) : [],
        ratedAt: typeof entry.ratedAt === 'string' ? entry.ratedAt : ''
      };
    }
    function validBackupProviders(groups) {
      if (!Array.isArray(groups)) return [];
      const allowedLabels = new Set(providerGroups.map(group => group.label));
      return groups.filter(group => group && allowedLabels.has(group.label) && Array.isArray(group.providers)).map(group => ({
        label: group.label,
        providers: group.providers.filter(provider => provider && Number.isInteger(Number(provider.provider_id)) && Number(provider.provider_id) > 0 && typeof provider.provider_name === 'string').map(provider => ({
          provider_id: Number(provider.provider_id),
          provider_name: provider.provider_name.slice(0, 120),
          logo_path: typeof provider.logo_path === 'string' && /^\/[\w./-]*$/.test(provider.logo_path) ? provider.logo_path : ''
        }))
      })).filter(group => group.providers.length);
    }
    function mergeEntries(existing, incoming, keyFunction) {
      const merged = new Map(existing.map(entry => [keyFunction(entry), entry]));
      incoming.forEach(entry => merged.set(keyFunction(entry), entry));
      return [...merged.values()];
    }
    function exportBackup() {
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
      showFeedback('Respaldo de Ya vi y Quiero ver descargado.');
    }
    async function importBackup(file) {
      let backup;
      try { backup = JSON.parse(await file.text()); }
      catch { throw new Error('El archivo no contiene un JSON válido.'); }
      if (backup?.format !== 'cine-ar-backup' || backup.version !== 1 || !Array.isArray(backup.diary) || !Array.isArray(backup.watchlist)) {
        throw new Error('Ese archivo no parece ser un respaldo de Cine AR compatible.');
      }
      const importedDiary = backup.diary.map(entry => validBackupEntry(entry, 'diary')).filter(Boolean);
      const importedWatchlist = backup.watchlist.map(entry => validBackupEntry(entry, 'watchlist')).filter(Boolean);
      if ((backup.diary.length && !importedDiary.length) || (backup.watchlist.length && !importedWatchlist.length)) {
        throw new Error('El respaldo no contiene registros válidos. No se modificaron tus datos.');
      }
      const duplicates = importedDiary.filter(entry => diaryEntries.some(saved => diaryKey(saved) === diaryKey(entry))).length
        + importedWatchlist.filter(entry => watchlistEntries.some(saved => watchlistKey(saved) === watchlistKey(entry))).length;
      const detail = duplicates ? ` Los ${duplicates} registros que coincidan se actualizarán con los del archivo.` : '';
      if (!window.confirm(`Se combinarán ${importedDiary.length} vistos y ${importedWatchlist.length} pendientes con los datos de este dispositivo.${detail} ¿Continuar?`)) return;
      const diaryToImport = importedDiary.map(entry => {
        const saved = diaryEntries.find(current => diaryKey(current) === diaryKey(entry));
        return !Array.isArray(entry.providers) && Array.isArray(saved?.providers) ? { ...entry, providers: saved.providers } : entry;
      });
      const watchlistToImport = importedWatchlist.map(entry => {
        const saved = watchlistEntries.find(current => watchlistKey(current) === watchlistKey(entry));
        return !Array.isArray(entry.providers) && Array.isArray(saved?.providers) ? { ...entry, providers: saved.providers } : entry;
      });
      diaryEntries = mergeEntries(diaryEntries, diaryToImport, diaryKey);
      watchlistEntries = mergeEntries(watchlistEntries, watchlistToImport, watchlistKey);
      localStorage.setItem('cinear_diary', JSON.stringify(diaryEntries));
      localStorage.setItem('cinear_watchlist', JSON.stringify(watchlistEntries));
      renderDiary();
      renderWatchlist();
      updateResults();
      showFeedback(`Respaldo importado: ${importedDiary.length} vistos y ${importedWatchlist.length} pendientes.`);
    }
    async function loadMovie(movie, token, type) {
      let region = {};
      try { region = getRegion(await tmdb(`/${movie.mediaType || type}/${movie.id}/watch/providers`, token)); }
      catch (error) { region.providerError = error.message; }
      return { ...movie, region, mediaType: movie.mediaType || type };
    }
    function refreshSavedProviders(movies) {
      let diaryChanged = false;
      let watchlistChanged = false;
      for (const movie of movies) {
        if (movie.region.providerError) continue;
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
        localStorage.setItem('cinear_diary', JSON.stringify(diaryEntries));
        renderDiary();
      }
      if (watchlistChanged) {
        localStorage.setItem('cinear_watchlist', JSON.stringify(watchlistEntries));
        renderWatchlist();
      }
    }
    function renderMovie(movie) {
      const providersMarkup = movie.region.providerError
        ? `<span class="empty-providers">${escapeHTML(movie.region.providerError)}</span>`
        : providerList(movie.region, movie.title || movie.name || '');
      const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : '';
      const title = escapeHTML(movie.title || movie.name || (movie.mediaType === 'tv' ? 'Serie sin título' : 'Película sin título'));
      const date = movie.release_date || movie.first_air_date;
      const year = date ? date.slice(0,4) : 'Año desconocido';
      const mediaLabel = movie.mediaType === 'tv' ? 'Serie' : 'Película';
      const isWatched = diaryEntries.some(entry => diaryKey(entry) === diaryKey(movie));
      const isOnWatchlist = watchlistEntries.some(entry => watchlistKey(entry) === watchlistKey(movie));
      return `<article class="movie"><img class="poster" src="${poster}" alt="Póster de ${title}" loading="lazy"><div class="movie-info"><h2>${title}</h2><div class="year">${mediaLabel} · ${year}</div><p class="overview">${escapeHTML(movie.overview || 'Todavía no hay sinopsis disponible.')}</p><div class="providers-label">Dónde verla · tocá para copiar el título y abrir la app si tu dispositivo la reconoce</div><div class="providers">${providersMarkup}</div></div><div class="movie-actions"><button class="watch-button" type="button" data-watch-id="${movie.id}" data-watch-type="${movie.mediaType}">${isWatched ? 'Editar en Ya vi' : '＋ Ya la vi'}</button><button class="watchlist-button" type="button" data-watchlist-id="${movie.id}" data-watchlist-type="${movie.mediaType}">${isOnWatchlist ? '✓ En Quiero ver' : '＋ Quiero ver'}</button></div></article>`;
    }
    function updateResults() {
      if (!currentMovies.length) {
        results.replaceChildren();
        resultTools.hidden = true;
        return;
      }
      const filter = availabilityFilter.value;
      const order = sortOrder.value;
      const filtered = currentMovies.filter(movie => hasAvailability(movie, filter));
      if (order === 'year-desc') filtered.sort((a, b) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''));
      if (order === 'year-asc') filtered.sort((a, b) => (a.release_date || a.first_air_date || '9999').localeCompare(b.release_date || b.first_air_date || '9999'));
      if (order === 'popularity') filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      results.innerHTML = filtered.map(renderMovie).join('');
      const countLabel = filtered.length === 1 ? 'resultado' : 'resultados';
      resultCount.textContent = filter === 'all'
        ? `${filtered.length} ${countLabel}`
        : `${filtered.length} de ${currentMovies.length} ${countLabel} disponibles`;
      if (!filtered.length) results.innerHTML = '<p class="empty-providers">No hay títulos con ese tipo de disponibilidad en Argentina.</p>';
    }
    document.addEventListener('click', event => {
      const providerLink = event.target.closest('[data-provider-title]');
      if (providerLink) {
        const title = providerLink.dataset.providerTitle;
        const providerName = providerLink.dataset.providerName;
        if (providerLink.dataset.unsupportedProvider) {
          event.preventDefault();
          copyMovieTitle(title, providerName);
          return;
        }
        copyMovieTitle(title, providerName);
        return;
      }
    });
    results.addEventListener('click', event => {
      const watchlistButton = event.target.closest('[data-watchlist-id]');
      if (watchlistButton) {
        const item = currentMovies.find(movie => String(movie.id) === watchlistButton.dataset.watchlistId && movie.mediaType === watchlistButton.dataset.watchlistType);
        if (!item) return;
        const key = watchlistKey(item);
        const exists = watchlistEntries.some(entry => watchlistKey(entry) === key);
        watchlistEntries = exists ? watchlistEntries.filter(entry => watchlistKey(entry) !== key) : [...watchlistEntries, storedWatchlistEntry(item)];
        saveWatchlist();
        updateResults();
        return;
      }
      const button = event.target.closest('[data-watch-id]');
      if (!button) return;
      const item = currentMovies.find(movie => String(movie.id) === button.dataset.watchId && movie.mediaType === button.dataset.watchType);
      if (item) openDiary(item);
    });
    diaryList.addEventListener('click', event => {
      const editButton = event.target.closest('[data-diary-edit]');
      const deleteButton = event.target.closest('[data-diary-delete]');
      if (deleteButton) {
        diaryEntries = diaryEntries.filter(entry => diaryKey(entry) !== deleteButton.dataset.diaryDelete);
        saveDiary();
        updateResults();
      } else if (editButton) {
        const entry = diaryEntries.find(item => diaryKey(item) === editButton.dataset.diaryEdit);
        if (entry) openDiary({ ...entry, title: entry.title, mediaType: entry.mediaType });
      }
    });
    watchlistList.addEventListener('click', event => {
      const removeButton = event.target.closest('[data-watchlist-remove]');
      if (!removeButton) return;
      watchlistEntries = watchlistEntries.filter(entry => watchlistKey(entry) !== removeButton.dataset.watchlistRemove);
      saveWatchlist();
      updateResults();
    });
    diaryForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!diaryItem) return;
      const rating = Number(diaryForm.querySelector('[name="rating"]:checked')?.value);
      if (!rating) return;
      const tags = [...diaryForm.querySelectorAll('[name="tag"]:checked')].map(box => box.value);
      const entry = storedDiaryEntry(diaryItem, rating, tags);
      diaryEntries = diaryEntries.filter(item => diaryKey(item) !== diaryKey(entry));
      diaryEntries.push(entry);
      watchlistEntries = watchlistEntries.filter(item => watchlistKey(item) !== watchlistKey(entry));
      saveDiary();
      saveWatchlist();
      diaryDialog.close();
      updateResults();
    });
    document.querySelectorAll('#diary-close, #diary-cancel').forEach(button => button.addEventListener('click', () => diaryDialog.close()));
    diaryDialog.addEventListener('click', event => {
      if (event.target === diaryDialog) diaryDialog.close();
    });
    renderDiary();
    renderWatchlist();
    diaryRatingFilter.addEventListener('change', renderDiary);
    diaryTagFilter.addEventListener('change', renderDiary);
    diarySortOrder.addEventListener('change', renderDiary);
    document.querySelector('#export-backup').addEventListener('click', exportBackup);
    const backupFileInput = document.querySelector('#import-backup-file');
    document.querySelector('#import-backup-button').addEventListener('click', () => backupFileInput.click());
    backupFileInput.addEventListener('change', async () => {
      const file = backupFileInput.files?.[0];
      if (!file) return;
      try { await importBackup(file); }
      catch (error) { showFeedback(error.message || 'No se pudo importar el respaldo.'); }
      finally { backupFileInput.value = ''; }
    });
    availabilityFilter.addEventListener('change', updateResults);
    sortOrder.addEventListener('change', updateResults);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const token = configuredToken || localStorage.getItem('cinear_tmdb_token');
      if (!token) { settings.open = true; status.textContent = 'Agregá tu token gratuito de TMDb para empezar a buscar.'; keyInput.focus(); return; }
      const query = queryInput.value.trim();
      if (!query) return;
      searchButton.disabled = true;
      searchButton.textContent = 'Buscando…';
      results.replaceChildren();
      currentMovies = [];
      resultTools.hidden = true;
      const type = mediaType.value;
      status.textContent = type === 'both' ? 'Buscando películas y series…' : `Buscando ${type === 'tv' ? 'series' : 'películas'}…`;
      try {
        const searchParams = `query=${encodeURIComponent(query)}&language=es-AR${type !== 'tv' ? '&include_adult=false' : ''}`;
        const endpoint = type === 'both' ? 'multi' : type;
        const data = await tmdb(`/search/${endpoint}?${searchParams}`, token);
        const movies = data.results
          .filter(item => type !== 'both' || item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 8)
          .map(item => ({ ...item, mediaType: type === 'both' ? item.media_type : type }));
        if (!movies.length) { status.textContent = `No encontramos resultados para “${query}”.`; return; }
        status.textContent = `Resultados para “${query}”`;
        currentMovies = await Promise.all(movies.map(movie => loadMovie(movie, token, type)));
        refreshSavedProviders(currentMovies);
        resultTools.hidden = false;
        updateResults();
      } catch (error) { status.textContent = error.message || 'No se pudo conectar con TMDb. Revisá tu conexión.'; }
      finally { searchButton.disabled = false; searchButton.textContent = 'Buscar'; }
    });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
