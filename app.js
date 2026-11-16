const API = 'https://api.themoviedb.org/3';
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
    const diaryTabCount = document.querySelector('#tab-diary-count');
    const tabButtons = [...document.querySelectorAll('[role="tab"]')];
    const tabPanels = [...document.querySelectorAll('[role="tabpanel"]')];
    let diaryItem = null;
    let diaryEntries = readDiary();
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
    function providerSearchUrl(provider, title) {
      const query = encodeURIComponent(title);
      const searchUrls = {
        2: `https://tv.apple.com/search?term=${query}`,
        8: `https://www.netflix.com/search?q=${query}`,
        9: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`,
        11: `https://mubi.com/search?query=${query}`,
        337: `https://www.disneyplus.com/search/${query}`,
        350: `https://tv.apple.com/search?term=${query}`,
        531: `https://www.paramountplus.com/search/?query=${query}`,
        1899: `https://play.max.com/search?q=${query}`
      };
      if (searchUrls[Number(provider.provider_id)]) return searchUrls[Number(provider.provider_id)];
      return `https://www.google.com/search?q=${encodeURIComponent(`site:${provider.provider_name} ${title}`)}`;
    }
    function hasAvailability(movie, filter) {
      if (filter === 'all') return true;
      if (filter === 'streaming') return ['flatrate', 'free', 'ads'].some(key => movie.region[key]?.length);
      return Boolean(movie.region[filter]?.length);
    }
    function providerList(region, title) {
      const seen = new Set();
      const groupsMarkup = providerGroups.map(group => {
        const providers = (region[group.key] || []).filter(provider => !seen.has(provider.provider_id) && seen.add(provider.provider_id));
        if (!providers.length) return '';
        return `<div class="provider-group"><div class="availability-type">${group.label}</div><div class="providers">${providers.map(p => `<a class="provider" href="${providerSearchUrl(p, title)}" target="_blank" rel="noreferrer" aria-label="Buscar ${escapeHTML(title)} en ${escapeHTML(p.provider_name)}">${p.logo_path ? `<img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="" loading="lazy">` : ''}${escapeHTML(p.provider_name)}</a>`).join('')}</div></div>`;
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
    function diaryKey(item) { return `${item.mediaType}:${item.id}`; }
    function saveDiary() {
      localStorage.setItem('cinear_diary', JSON.stringify(diaryEntries));
      renderDiary();
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
        return `<article class="diary-entry">${poster}<div><h3>${title}</h3><div class="diary-meta">${entry.mediaType === 'tv' ? 'Serie' : 'Película'} · ${escapeHTML(entry.year || 'Año desconocido')} <span class="diary-rating" aria-label="${entry.rating} de 5 estrellas">${stars}</span></div><div class="diary-rated-at">Calificada el ${formatRatingDate(entry.ratedAt)}</div>${tags ? `<div class="diary-tags">${tags}</div>` : ''}</div><div class="diary-actions"><button class="diary-action" type="button" data-diary-edit="${escapeHTML(diaryKey(entry))}">Editar</button><button class="diary-action" type="button" data-diary-delete="${escapeHTML(diaryKey(entry))}" aria-label="Eliminar ${title}">Eliminar</button></div></article>`;
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
      return {
        id: item.id,
        mediaType: item.mediaType,
        title: item.title || item.name || 'Título sin nombre',
        year: date ? date.slice(0, 4) : 'Año desconocido',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : (item.poster || ''),
        rating,
        tags,
        ratedAt: new Date().toISOString()
      };
    }
    async function loadMovie(movie, token, type) {
      let region = {};
      try { region = getRegion(await tmdb(`/${movie.mediaType || type}/${movie.id}/watch/providers`, token)); }
      catch (error) { region.providerError = error.message; }
      return { ...movie, region, mediaType: movie.mediaType || type };
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
      return `<article class="movie"><img class="poster" src="${poster}" alt="Póster de ${title}" loading="lazy"><div class="movie-info"><h2>${title}</h2><div class="year">${mediaLabel} · ${year}</div><p class="overview">${escapeHTML(movie.overview || 'Todavía no hay sinopsis disponible.')}</p><div class="providers-label">Dónde verla</div><div class="providers">${providersMarkup}</div></div><div class="movie-actions"><button class="watch-button" type="button" data-watch-id="${movie.id}" data-watch-type="${movie.mediaType}">${isWatched ? 'Editar en Ya vi' : '＋ Ya la vi'}</button></div></article>`;
    }
    function updateResults() {
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
    results.addEventListener('click', event => {
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
    diaryForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!diaryItem) return;
      const rating = Number(diaryForm.querySelector('[name="rating"]:checked')?.value);
      if (!rating) return;
      const tags = [...diaryForm.querySelectorAll('[name="tag"]:checked')].map(box => box.value);
      const entry = storedDiaryEntry(diaryItem, rating, tags);
      diaryEntries = diaryEntries.filter(item => diaryKey(item) !== diaryKey(entry));
      diaryEntries.push(entry);
      saveDiary();
      diaryDialog.close();
      updateResults();
    });
    document.querySelectorAll('#diary-close, #diary-cancel').forEach(button => button.addEventListener('click', () => diaryDialog.close()));
    diaryDialog.addEventListener('click', event => {
      if (event.target === diaryDialog) diaryDialog.close();
    });
    renderDiary();
    diaryRatingFilter.addEventListener('change', renderDiary);
    diaryTagFilter.addEventListener('change', renderDiary);
    diarySortOrder.addEventListener('change', renderDiary);
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
        resultTools.hidden = false;
        updateResults();
      } catch (error) { status.textContent = error.message || 'No se pudo conectar con TMDb. Revisá tu conexión.'; }
      finally { searchButton.disabled = false; searchButton.textContent = 'Buscar'; }
    });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
