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
    keyInput.value = localStorage.getItem('cinear_tmdb_token') || window.CINEAR_TMDB_TOKEN || '';
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
    function hasAvailability(movie, filter) {
      if (filter === 'all') return true;
      if (filter === 'streaming') return ['flatrate', 'free', 'ads'].some(key => movie.region[key]?.length);
      return Boolean(movie.region[filter]?.length);
    }
    function providerList(region) {
      const seen = new Set();
      const groupsMarkup = providerGroups.map(group => {
        const providers = (region[group.key] || []).filter(provider => !seen.has(provider.provider_id) && seen.add(provider.provider_id));
        if (!providers.length) return '';
        return `<div class="provider-group"><div class="availability-type">${group.label}</div><div class="providers">${providers.map(p => `<span class="provider">${p.logo_path ? `<img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="" loading="lazy">` : ''}${escapeHTML(p.provider_name)}</span>`).join('')}</div></div>`;
      }).join('');
      return groupsMarkup || '<span class="empty-providers">Sin disponibilidad informada en Argentina.</span>';
    }
    function escapeHTML(value='') { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
    async function loadMovie(movie, token, type) {
      let region = {};
      try { region = getRegion(await tmdb(`/${movie.mediaType || type}/${movie.id}/watch/providers`, token)); }
      catch (error) { region.providerError = error.message; }
      return { ...movie, region, mediaType: movie.mediaType || type };
    }
    function renderMovie(movie) {
      const providersMarkup = movie.region.providerError
        ? `<span class="empty-providers">${escapeHTML(movie.region.providerError)}</span>`
        : providerList(movie.region);
      const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : '';
      const title = escapeHTML(movie.title || movie.name || (movie.mediaType === 'tv' ? 'Serie sin título' : 'Película sin título'));
      const date = movie.release_date || movie.first_air_date;
      const year = date ? date.slice(0,4) : 'Año desconocido';
      const mediaLabel = movie.mediaType === 'tv' ? 'Serie' : 'Película';
      return `<article class="movie"><img class="poster" src="${poster}" alt="Póster de ${title}" loading="lazy"><div class="movie-info"><h2>${title}</h2><div class="year">${mediaLabel} · ${year}</div><p class="overview">${escapeHTML(movie.overview || 'Todavía no hay sinopsis disponible.')}</p><div class="providers-label">Dónde verla</div><div class="providers">${providersMarkup}</div></div></article>`;
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
    availabilityFilter.addEventListener('change', updateResults);
    sortOrder.addEventListener('change', updateResults);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const token = localStorage.getItem('cinear_tmdb_token') || window.CINEAR_TMDB_TOKEN;
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
