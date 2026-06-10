/**
 * Home Dashboard Page
 * Features "Continue Watching" and "Recently Added" content
 */
class HomePage {
  constructor(app) {
    this.app = app;
    this.container = null; // Will be set in renderLayout
    this.isLoading = false;
    this.playLaunchInProgress = false;
  }

  async init() {
    // Initialization if needed
  }

  async show() {
    this.renderLayout();
    await this.loadDashboardData();
  }

  hide() {
    // Cleanup if needed
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  tr(key, params = {}) {
    return window.I18n?.t ? window.I18n.t(key, params) : key;
  }

  getTimeBasedKicker() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return this.tr("home.kickerMorning");
    if (hour >= 11 && hour < 14) return this.tr("home.kickerNoon");
    if (hour >= 14 && hour < 18) return this.tr("home.kickerAfternoon");
    if (hour >= 18 && hour < 23) return this.tr("home.kickerEvening");
    return this.tr("home.kickerNight");
  }

  reportStartupProgress(message, percent) {
    window.dispatchEvent(
      new CustomEvent("streamnet:dashboard-progress", {
        detail: { message, percent },
      }),
    );
  }

  renderLayout() {
    const pageHome = document.getElementById("page-home");
    if (!pageHome) return;

    pageHome.innerHTML = `
            <div class="dashboard-content" id="home-content">
                <section class="dashboard-hero">
                    <div class="dashboard-hero-main">
              <div class="dashboard-kicker">${this.getTimeBasedKicker()}</div>
              <h1 class="dashboard-title">${this.tr("home.title")}</h1>
              <p class="dashboard-subtitle" id="dashboard-subtitle">${this.tr("home.subtitleLoading")}</p>
                        <div class="dashboard-actions">
                <button class="hero-action-btn" data-page="live">${this.tr("home.watchLive")}</button>
                <button class="hero-action-btn" data-page="movies">${this.tr("home.exploreMovies")}</button>
                <button class="hero-action-btn" data-page="series">${this.tr("home.browseSeries")}</button>
                <button class="hero-action-btn" data-page="guide">${this.tr("home.openGuide")}</button>
                        </div>
                    </div>
                    <div class="dashboard-hero-stats">
                        <div class="dashboard-stat-card">
                <div class="dashboard-stat-label">${this.tr("common.favorites")}</div>
                            <div class="dashboard-stat-value" id="dashboard-stat-favorites">0</div>
                        </div>
                        <div class="dashboard-stat-card">
                <div class="dashboard-stat-label">${this.tr("home.continueWatching")}</div>
                            <div class="dashboard-stat-value" id="dashboard-stat-history">0</div>
                        </div>
                        <div class="dashboard-stat-card">
                <div class="dashboard-stat-label">${this.tr("nav.movies")}</div>
                            <div class="dashboard-stat-value" id="dashboard-stat-movies">0</div>
                        </div>
                        <div class="dashboard-stat-card">
                <div class="dashboard-stat-label">${this.tr("nav.series")}</div>
                            <div class="dashboard-stat-value" id="dashboard-stat-series">0</div>
                        </div>
                    </div>
                </section>

                <section class="dashboard-section" id="favorite-channels-section">
                    <div class="section-header">
              <h2>${this.tr("home.favoriteChannels")}</h2>
            <span class="section-chip" id="favorite-channels-count">${this.tr("home.savedCount", { count: 0 })}</span>
                    </div>
                    <div class="scroll-wrapper">
                        <button class="scroll-arrow scroll-left" aria-label="Scroll left">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        </button>
                        <div class="horizontal-scroll channel-tiles" id="favorite-channels-list">
                            <div class="loading-state">
                                <div class="loading"></div>
                  <span>${this.tr("home.loadingFavorites")}</span>
                            </div>
                        </div>
                        <button class="scroll-arrow scroll-right" aria-label="Scroll right">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                        </button>
                    </div>
                </section>

                <section class="dashboard-section" id="continue-watching-section">
                    <div class="section-header">
                    <h2>${this.tr("home.continueWatching")}</h2>
                    </div>
                    <div class="scroll-wrapper">
                        <button class="scroll-arrow scroll-left" aria-label="Scroll left">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        </button>
                        <div class="horizontal-scroll" id="continue-watching-list">
                            <div class="loading-state">
                                <div class="loading"></div>
                            <span>${this.tr("home.loadingHistory")}</span>
                            </div>
                        </div>
                        <button class="scroll-arrow scroll-right" aria-label="Scroll right">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                        </button>
                    </div>
                </section>

                <section class="dashboard-section">
                    <div class="section-header">
                    <h2>${this.tr("home.recentMovies")}</h2>
                    </div>
                    <div class="scroll-wrapper">
                        <button class="scroll-arrow scroll-left" aria-label="Scroll left">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        </button>
                        <div class="horizontal-scroll" id="recent-movies-list">
                            <div class="loading-state">
                                <div class="loading"></div>
                            <span>${this.tr("home.loadingRecent")}</span>
                            </div>
                        </div>
                        <button class="scroll-arrow scroll-right" aria-label="Scroll right">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                        </button>
                    </div>
                </section>

                <section class="dashboard-section">
                    <div class="section-header">
                    <h2>${this.tr("home.recentSeries")}</h2>
                    </div>
                    <div class="scroll-wrapper">
                        <button class="scroll-arrow scroll-left" aria-label="Scroll left">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        </button>
                        <div class="horizontal-scroll" id="recent-series-list">
                            <div class="loading-state">
                                <div class="loading"></div>
                            <span>${this.tr("home.loadingRecent")}</span>
                            </div>
                        </div>
                        <button class="scroll-arrow scroll-right" aria-label="Scroll right">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                        </button>
                    </div>
                </section>
            </div>
        `;
    this.container = document.getElementById("home-content");

    // Attach scroll arrow handlers
    this.initScrollArrows();
    this.initHeroActions();
  }

  initScrollArrows() {
    this.container.querySelectorAll(".scroll-wrapper").forEach((wrapper) => {
      const scrollContainer = wrapper.querySelector(".horizontal-scroll");
      const leftBtn = wrapper.querySelector(".scroll-left");
      const rightBtn = wrapper.querySelector(".scroll-right");

      if (!scrollContainer || !leftBtn || !rightBtn) return;

      const scrollAmount = 300; // pixels to scroll per click

      leftBtn.addEventListener("click", () => {
        scrollContainer.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      });

      rightBtn.addEventListener("click", () => {
        scrollContainer.scrollBy({ left: scrollAmount, behavior: "smooth" });
      });

      // Update arrow visibility based on scroll position
      const updateArrows = () => {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
        leftBtn.classList.toggle("hidden", scrollLeft <= 0);
        rightBtn.classList.toggle(
          "hidden",
          scrollLeft + clientWidth >= scrollWidth - 5,
        );
      };

      // Store reference for later updates
      wrapper._updateArrows = updateArrows;

      scrollContainer.addEventListener("scroll", updateArrows);
      // Initial check after content loads
      setTimeout(updateArrows, 100);
    });
  }

  /**
   * Re-check scroll arrow visibility for all sections
   * Call this after dynamically loading content
   */
  updateScrollArrows() {
    this.container?.querySelectorAll(".scroll-wrapper").forEach((wrapper) => {
      if (wrapper._updateArrows) {
        wrapper._updateArrows();
      }
    });
  }

  initHeroActions() {
    this.container
      ?.querySelectorAll(".hero-action-btn[data-page]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetPage = btn.dataset.page;
          if (targetPage) {
            this.app.navigateTo(targetPage);
          }
        });
      });
  }

  updateHeroStats({ favorites = 0, history = 0, movies = 0, series = 0 } = {}) {
    const byId = (id) => document.getElementById(id);
    const set = (id, value) => {
      const el = byId(id);
      if (el) el.textContent = String(value ?? 0);
    };

    set("dashboard-stat-favorites", favorites);
    set("dashboard-stat-history", history);
    set("dashboard-stat-movies", movies);
    set("dashboard-stat-series", series);

    const subtitle = byId("dashboard-subtitle");
    if (subtitle) {
      const hour = new Date().getHours();
      const greeting =
        hour < 12
          ? this.tr("home.greetingMorning")
          : hour < 18
            ? this.tr("home.greetingAfternoon")
            : this.tr("home.greetingEvening");
      subtitle.textContent = this.tr("home.heroSummary", {
        greeting,
        favorites,
        history,
        titles: movies + series,
      });
    }
  }

  setFavoriteCount(count) {
    const countEl = document.getElementById("favorite-channels-count");
    if (!countEl) return;
    countEl.textContent = this.tr("home.savedCount", { count });
  }

  async loadDashboardData() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      this.reportStartupProgress("Dashboard-Inhalte werden geladen...", 58);

      const historyPromise = window.API.request(
        "GET",
        "/history?limit=12",
      ).catch(() => []);
      const recentStatsPromise = window.API.request(
        "GET",
        "/channels/recent/stats",
      ).catch(() => ({ movie: null, series: null }));

      const [
        favoriteCount,
        history,
        movieListCount,
        seriesListCount,
        recentStats,
      ] = await Promise.all([
        this.renderFavoriteChannels(),
        historyPromise,
        this.renderRecentMovies(),
        this.renderRecentSeries(),
        recentStatsPromise,
      ]);

      const historyCount = Array.isArray(history)
        ? this.renderHistory(history)
        : 0;
      const movieCount =
        Number.isFinite(recentStats?.movie) && recentStats.movie >= 0
          ? recentStats.movie
          : movieListCount;
      const seriesCount =
        Number.isFinite(recentStats?.series) && recentStats.series >= 0
          ? recentStats.series
          : seriesListCount;

      this.updateHeroStats({
        favorites: favoriteCount,
        history: historyCount,
        movies: movieCount,
        series: seriesCount,
      });

      this.reportStartupProgress("Dashboard wird finalisiert...", 96);

      window.dispatchEvent(new CustomEvent("streamnet:dashboard-ready"));
    } catch (err) {
      console.error("[Dashboard] Error loading data:", err);
      window.dispatchEvent(new CustomEvent("streamnet:dashboard-ready"));
    } finally {
      this.isLoading = false;
    }
  }

  async renderFavoriteChannels() {
    const list = document.getElementById("favorite-channels-list");
    const section = document.getElementById("favorite-channels-section");
    if (!list || !section) return 0;

    try {
      // Fetch favorite channels for current user
      const favorites = await window.API.request(
        "GET",
        "/favorites?itemType=channel",
      );

      if (!favorites || favorites.length === 0) {
        this.setFavoriteCount(0);
        list.innerHTML = `<div class="empty-state hint">${this.tr("home.addFavoritesHint")}</div>`;
        return 0;
      }

      // Ensure channel list is loaded to resolve channel details
      const channelList = this.app.channelList;
      if (!channelList.channels || channelList.channels.length === 0) {
        this.reportStartupProgress("Playlist wird geladen...", 72);
        await channelList.loadSources();
        this.reportStartupProgress("Senderliste wird geladen...", 84);
        await channelList.loadChannels();
      }

      // Match favorites to channel data
      const channels = [];
      for (const fav of favorites) {
        // Find channel in loaded channel list
        const channel = channelList.channels.find(
          (ch) =>
            String(ch.sourceId) === String(fav.source_id) &&
            (String(ch.id) === String(fav.item_id) ||
              String(ch.streamId) === String(fav.item_id)),
        );
        if (channel) {
          channels.push({ ...channel, favoriteId: fav.id });
        }
      }

      if (channels.length === 0) {
        this.setFavoriteCount(0);
        list.innerHTML = `<div class="empty-state hint">${this.tr("home.addFavoritesHint")}</div>`;
        return 0;
      }

      // Render channel tiles
      list.innerHTML = channels
        .map((ch, index) => this.createChannelTile(ch, index))
        .join("");

      this.setFavoriteCount(channels.length);

      // Attach click handlers
      list.querySelectorAll(".channel-tile").forEach((tile) => {
        tile.addEventListener("click", () => {
          const channelId = tile.dataset.channelId;
          const sourceId = tile.dataset.sourceId;
          this.playChannel(channelId, sourceId);
        });
      });

      // Update scroll arrows after content renders
      this.updateScrollArrows();

      return channels.length;
    } catch (err) {
      console.error("[Dashboard] Error loading favorite channels:", err);
      this.setFavoriteCount(0);
      list.innerHTML = `<div class="empty-state hint">${this.tr("home.errorFavorites")}</div>`;
      return 0;
    }
  }

  createChannelTile(channel, index = 0) {
    const logo = channel.tvgLogo || "/img/placeholder.png";
    const logoUrl = logo.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(logo)}`
      : logo;
    const name = channel.name || this.tr("home.unknown");
    const source =
      channel.sourceName ||
      channel.groupTitle ||
      channel.group ||
      channel.source ||
      this.tr("live.title");
    const rank = index + 1;
    const currentProgram = this.app?.epgGuide?.getCurrentProgram?.(
      channel.tvgId,
      channel.name,
    );
    const epgTitle = currentProgram?.title || this.tr("home.noEpgNow");
    const epgTime = currentProgram
      ? `${new Date(currentProgram.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(currentProgram.stop).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "";

    return `
            <div class="channel-tile" data-channel-id="${channel.id}" data-source-id="${channel.sourceId}">
                <div class="tile-top">
                    <span class="tile-rank">#${rank}</span>
                    <span class="tile-source" title="${source}">${source}</span>
                </div>
                <div class="tile-logo-wrap">
                    <div class="tile-logo">
                        <img src="${logoUrl}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='/img/placeholder.png'">
                    </div>
                    <span class="tile-live-dot" aria-hidden="true"></span>
                </div>
                <div class="tile-name" title="${name}">${name}</div>
                <div class="tile-epg-title" title="${epgTitle}">${epgTitle}</div>
                <div class="tile-epg-time">${epgTime}</div>
                <div class="tile-cta">${this.tr("home.playNow")}</div>
            </div>
        `;
  }

  playChannel(channelId, sourceId) {
    // Navigate to Live TV and select the channel
    this.app.navigateTo("live");

    // Small delay to ensure page is ready
    setTimeout(() => {
      const channelList = this.app.channelList;
      if (channelList) {
        // Find and select the channel
        const channel = channelList.channels.find(
          (ch) =>
            String(ch.id) === String(channelId) &&
            String(ch.sourceId) === String(sourceId),
        );
        if (channel) {
          channelList.selectChannel({
            channelId: channel.id,
            sourceId: channel.sourceId,
            sourceType: channel.sourceType,
            streamId: channel.streamId || "",
            url: channel.url || "",
          });
        }
      }
    }, 100);
  }

  renderHistory(items) {
    const list = document.getElementById("continue-watching-list");
    const section = document.getElementById("continue-watching-section");

    if (!list || !section) return 0;

    if (items.length === 0) {
      section.classList.add("hidden");
      return 0;
    }

    section.classList.remove("hidden");
    list.innerHTML = items.map((item) => this.createCard(item)).join("");

    // Attach click listeners
    list.querySelectorAll(".dashboard-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.id;
        const item = items.find((i) => String(i.item_id) === String(id));
        if (item) {
          // Prioritize playing directly for resume tiles
          this.playItem(item, true); // true for resume
        }
      });
    });

    // Update scroll arrows after content renders
    this.updateScrollArrows();

    return items.length;
  }

  navigateToSeries(item) {
    if (!this.app.pages.series) return;

    // Prepare the series object as expected by SeriesPage.showSeriesDetails
    const series = {
      series_id: item.item_id,
      sourceId: item.source_id,
      name: item.name || (item.data ? item.data.title : "Series"),
      cover: item.stream_icon || (item.data ? item.data.poster : null),
      plot: item.data ? item.data.description : "",
      year: item.data ? item.data.year : "",
    };

    // Switch page
    this.app.navigateTo("series");

    // Show details (delay slightly to ensure page is visible)
    setTimeout(() => {
      this.app.pages.series.showSeriesDetails(series);
    }, 100);
  }

  openRecentMoviePreplay(item) {
    if (!item || !this.app?.pages?.movies) return;

    const data =
      item && item.data && typeof item.data === "object" ? item.data : {};
    const movie = {
      stream_id: item.item_id || item.id || data.id,
      sourceId:
        Number(item.source_id || item.sourceId || data.sourceId || 0) || 0,
      name: item.name || data.title || this.tr("home.unknownTitle"),
      stream_icon: item.stream_icon || data.poster || data.stream_icon || "",
      cover: data.poster || item.stream_icon || "",
      year:
        item.year ||
        item.releaseDate ||
        item.release_date ||
        data.year ||
        data.releaseYear ||
        data.release_date ||
        data.releaseDate ||
        "",
      releaseDate:
        item.releaseDate || item.release_date || data.releaseDate || "",
      plot: item.plot || data.description || data.plot || "",
    };

    if (!movie.stream_id || !movie.sourceId) {
      return;
    }

    this.app.navigateTo("movies");
    setTimeout(() => {
      this.app.pages.movies.showMoviePreplay(movie);
    }, 100);
  }

  async renderRecentMovies() {
    const list = document.getElementById("recent-movies-list");
    if (!list) return 0;

    try {
      const movies = await window.API.request(
        "GET",
        "/channels/recent?type=movie&limit=12",
      );
      if (!movies || movies.length === 0) {
        list.innerHTML = `<div class="empty-state hint">${this.tr("home.noRecentMovies")}</div>`;
        return 0;
      }

      list.innerHTML = movies
        .map((item) => this.createRecentCard(item))
        .join("");

      // Attach listeners
      list.querySelectorAll(".dashboard-card").forEach((card) => {
        card.addEventListener("click", () => {
          const id = card.dataset.id;
          const item = movies.find((m) => String(m.item_id) === String(id));
          if (item) this.openRecentMoviePreplay(item);
        });
      });

      // Update scroll arrows after content renders
      this.updateScrollArrows();
      return movies.length;
    } catch (err) {
      console.error("[Dashboard] Error loading recent movies:", err);
      return 0;
    }
  }

  async renderRecentSeries() {
    const list = document.getElementById("recent-series-list");
    if (!list) return 0;

    try {
      const series = await window.API.request(
        "GET",
        "/channels/recent?type=series&limit=12",
      );
      if (!series || series.length === 0) {
        list.innerHTML = `<div class="empty-state hint">${this.tr("home.noRecentSeries")}</div>`;
        return 0;
      }

      // Enrich recent series with real latest season/episode metadata when available.
      const enrichedSeries = await Promise.all(
        series.map((item) => this.enrichRecentSeriesItem(item)),
      );

      list.innerHTML = enrichedSeries
        .map((item) => this.createRecentCard(item))
        .join("");

      // Attach listeners
      list.querySelectorAll(".dashboard-card").forEach((card) => {
        card.addEventListener("click", () => {
          const id = card.dataset.id;
          const item = enrichedSeries.find(
            (s) => String(s.item_id) === String(id),
          );
          if (item) {
            // Keep recent series aligned with movie behavior: open preplay/details first.
            this.navigateToSeries(item);
          }
        });
      });

      // Update scroll arrows after content renders
      this.updateScrollArrows();
      return series.length;
    } catch (err) {
      console.error("[Dashboard] Error loading recent series:", err);
      return 0;
    }
  }

  createCard(item) {
    const { data, progress, duration, item_id } = item;
    const type = item.item_type || item.type;
    const percent = Math.min(100, Math.round((progress / duration) * 100));
    const safeData = data || {};
    const typeLabel = this.tr("home.continue");
    const movieYear =
      item.year ||
      item.releaseDate ||
      item.release_date ||
      safeData.year ||
      safeData.release_date ||
      safeData.releaseYear ||
      (safeData.releaseDate ? String(safeData.releaseDate).slice(0, 4) : "");
    const rawSubtitle = safeData.subtitle || "";
    const seriesLabel = this.getSeriesProgressLabel({
      ...(safeData || {}),
      ...(item || {}),
    });
    const subtitle =
      type === "movie"
        ? this.isGenericMovieLabel(rawSubtitle)
          ? movieYear || this.tr("home.movie")
          : rawSubtitle || movieYear || this.tr("home.movie")
        : seriesLabel ||
          (this.isGenericSeriesLabel(rawSubtitle)
            ? ""
            : rawSubtitle || this.tr("home.series"));

    // Proxy the poster if it's an external URL
    const poster = safeData.poster || "/img/poster-placeholder.jpg";
    const posterUrl = poster.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(poster)}`
      : poster;

    return `
            <div class="dashboard-card" data-id="${item_id}" data-type="${type}">
                <div class="card-image">
                    <img src="${posterUrl}" alt="${safeData.title || item.name}" loading="lazy" onerror="this.onerror=null;this.src='/img/poster-placeholder.jpg'">
                    <div class="card-type-pill">${typeLabel}</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percent}%"></div>
                    </div>
                    <div class="play-icon-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title" title="${item.name || safeData.title}">${item.name || safeData.title || this.tr("home.unknownTitle")}</div>
                  <div class="card-subtitle">${subtitle}</div>
                </div>
            </div>
        `;
  }

  createRecentCard(item) {
    const { data, item_id } = item;
    const type = item.type || item.item_type;
    const typeLabel =
      type === "movie" ? this.tr("home.movie") : this.tr("home.series");
    const movieYear =
      item.year ||
      item.releaseDate ||
      item.release_date ||
      (data && (data.year || data.releaseYear)) ||
      (data && data.releaseDate ? String(data.releaseDate).slice(0, 4) : "") ||
      (data && data.release_date ? String(data.release_date).slice(0, 4) : "");
    const rawSubtitle =
      item.subtitle ||
      item.seriesProgressLabel ||
      (data && data.subtitle) ||
      "";
    const seriesProgressLabel = this.getSeriesProgressLabel({
      ...(data || {}),
      ...(item || {}),
    });
    const seriesYear = movieYear || "";
    const subtitle =
      type === "movie"
        ? this.isGenericMovieLabel(rawSubtitle)
          ? movieYear || this.tr("home.movie")
          : rawSubtitle || movieYear || this.tr("home.movie")
        : seriesProgressLabel ||
          (this.isGenericSeriesLabel(rawSubtitle)
            ? seriesYear
            : rawSubtitle || seriesYear || "");
    const poster =
      item.stream_icon || data.poster || "/img/poster-placeholder.jpg";
    const posterUrl = poster.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(poster)}`
      : poster;

    return `
            <div class="dashboard-card" data-id="${item_id}" data-type="${type}">
                <div class="card-image">
                    <img src="${posterUrl}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='/img/poster-placeholder.jpg'">
                    <div class="card-type-pill">${typeLabel}</div>
                    <div class="play-icon-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title" title="${item.name || (data && data.title)}">${item.name || (data && data.title) || this.tr("home.unknownTitle")}</div>
                  <div class="card-subtitle">${subtitle}</div>
                </div>
            </div>
        `;
  }

  async playItem(item, isResume = false) {
    if (!this.app.pages.watch) return;
    if (this.playLaunchInProgress) return;

    this.playLaunchInProgress = true;

    try {
      const data =
        item && item.data && typeof item.data === "object" ? item.data : {};
      const type = item.item_type || item.type;
      const streamType = type === "movie" ? "movie" : "series";
      const sourceId =
        item.source_id || item.sourceId || data.sourceId || data.source_id;
      const streamId = item.item_id || item.id || data.id;
      const container =
        item.container_extension ||
        data.containerExtension ||
        data.container_extension ||
        "mp4";

      if (!sourceId || !streamId) {
        console.warn("[Dashboard] Missing sourceId/streamId in history item", {
          item,
        });
        return;
      }

      const result = await window.API.request(
        "GET",
        `/proxy/xtream/${sourceId}/stream/${streamId}/${streamType}?container=${container}`,
      );

      if (result && result.url) {
        const content = {
          id: streamId,
          type: type === "movie" ? "movie" : "series",
          title: item.name || data.title || this.tr("home.unknownTitle"),
          subtitle: data.subtitle || (type === "movie" ? "Movie" : "Series"),
          poster: item.stream_icon || data.poster,
          sourceId: sourceId,
          resumeTime: isResume ? item.progress : 0,
          containerExtension: container,
        };

        // For episodes, try to restore series data for next episode functionality
        if (type === "episode") {
          content.seriesId = data.seriesId || null;
          content.currentSeason = data.currentSeason || null;
          content.currentEpisode = data.currentEpisode || null;

          // Fetch seriesInfo if we have a seriesId
          if (content.seriesId && sourceId) {
            try {
              const seriesInfo = await window.API.request(
                "GET",
                `/proxy/xtream/${sourceId}/series_info?series_id=${content.seriesId}`,
              );
              if (seriesInfo) {
                content.seriesInfo = seriesInfo;
              }
            } catch (e) {
              console.warn(
                "[Dashboard] Could not fetch seriesInfo for next episode:",
                e,
              );
            }
          }
        }

        this.app.pages.watch.play(content, result.url);
      }
    } catch (err) {
      console.error("[Dashboard] Playback failed:", err);
    } finally {
      setTimeout(() => {
        this.playLaunchInProgress = false;
      }, 400);
    }
  }

  isGenericMovieLabel(value) {
    const text = String(value || "")
      .trim()
      .toLowerCase();
    if (!text) return true;
    return ["movie", "film", this.tr("home.movie").toLowerCase()].includes(
      text,
    );
  }

  isGenericSeriesLabel(value) {
    const text = String(value || "")
      .trim()
      .toLowerCase();
    if (!text) return true;
    return ["series", "serie", this.tr("home.series").toLowerCase()].includes(
      text,
    );
  }

  getSeriesProgressLabel(data) {
    const subtitle = String(data?.subtitle || "").trim();
    const normalizedFromSubtitle = this.normalizeEpisodeSubtitle(subtitle);
    if (normalizedFromSubtitle) {
      return normalizedFromSubtitle;
    }

    const titleText = String(data?.title || data?.name || "").trim();
    const markerFromTitle = this.extractEpisodeSeasonFromText(titleText);
    if (markerFromTitle) {
      return markerFromTitle;
    }

    const season =
      data?.currentSeason ??
      data?.season ??
      data?.seasonNum ??
      data?.season_num;
    const episode =
      data?.currentEpisode ??
      data?.episode ??
      data?.episodeNum ??
      data?.episode_num;

    if (season && episode) {
      return this.formatEpisodeLabel({
        season,
        episode,
        title: data?.episodeTitle || data?.episode_title || "",
      });
    }

    if (season) {
      return `${this.tr("series.seasonLabel")} ${season}`;
    }

    if (episode) {
      return `${this.tr("series.episodeLabel")} ${episode}`;
    }

    return "";
  }

  extractEpisodeSeasonFromText(value) {
    const text = String(value || "");
    if (!text) return "";

    const sxe = text.match(/\bS(\d{1,2})\s*[- ]?\s*E(\d{1,3})\b/i);
    if (sxe) {
      return this.formatEpisodeLabel({
        season: sxe[1],
        episode: sxe[2],
      });
    }

    const seasonEpisode = text.match(
      /\b(?:Staffel|Season)\s*(\d{1,2}).*?(?:Folge|Episode)\s*(\d{1,3})\b/i,
    );
    if (seasonEpisode) {
      return this.formatEpisodeLabel({
        season: seasonEpisode[1],
        episode: seasonEpisode[2],
      });
    }

    const seasonOnly = text.match(/\b(?:Staffel|Season)\s*(\d{1,2})\b/i);
    if (seasonOnly) {
      return `${this.tr("series.seasonLabel")} ${seasonOnly[1]}`;
    }

    const episodeOnly = text.match(/\b(?:Folge|Episode)\s*(\d{1,3})\b/i);
    if (episodeOnly) {
      return `${this.tr("series.episodeLabel")} ${episodeOnly[1]}`;
    }

    return "";
  }

  async enrichRecentSeriesItem(item) {
    try {
      const sourceId = item?.source_id || item?.sourceId;
      const seriesId = item?.item_id || item?.series_id || item?.id;
      if (!sourceId || !seriesId) return item;

      const seriesInfo = await window.API.request(
        "GET",
        `/proxy/xtream/${sourceId}/series_info?series_id=${seriesId}`,
      );
      const seriesTitle =
        item?.name ||
        item?.title ||
        item?.data?.title ||
        item?.data?.name ||
        "";
      const label = this.getSeriesLabelFromSeriesInfo(seriesInfo, seriesTitle);
      if (!label) return item;

      return {
        ...item,
        seriesProgressLabel: label,
        data: {
          ...(item.data || {}),
          subtitle: label,
        },
      };
    } catch {
      return item;
    }
  }

  getSeriesLabelFromSeriesInfo(seriesInfo, seriesTitle = "") {
    const episodes = seriesInfo?.episodes;
    if (!episodes || typeof episodes !== "object") return "";
    const canonicalSeriesTitle =
      seriesTitle ||
      seriesInfo?.info?.name ||
      seriesInfo?.info?.title ||
      seriesInfo?.info?.series_name ||
      "";

    const seasonKeys = Object.keys(episodes)
      .map((k) => ({ raw: k, num: parseInt(k, 10) }))
      .filter((s) => Number.isFinite(s.num))
      .sort((a, b) => a.num - b.num);

    if (!seasonKeys.length) return "";

    const latestSeason = seasonKeys[seasonKeys.length - 1];
    const allEpisodes = seasonKeys.flatMap((s) =>
      Array.isArray(episodes[s.raw])
        ? episodes[s.raw].map((ep) => ({ ...ep, _seasonNum: s.num }))
        : [],
    );

    if (!allEpisodes.length) {
      return `${this.tr("series.seasonLabel")} ${latestSeason.num}`;
    }

    const episodesWithAdded = allEpisodes
      .map((ep) => ({
        ...ep,
        _addedTs: this.parseEpisodeAddedTimestamp(ep),
      }))
      .filter((ep) => Number.isFinite(ep._addedTs));

    if (episodesWithAdded.length > 0) {
      const latestAdded = Math.max(
        ...episodesWithAdded.map((ep) => ep._addedTs),
      );
      const latestBatch = episodesWithAdded.filter(
        (ep) => ep._addedTs === latestAdded,
      );

      const uniqueLatest = Array.from(
        new Map(
          latestBatch.map((ep) => [
            `${ep._seasonNum}:${ep?.episode_num ?? ep?.id ?? Math.random()}`,
            ep,
          ]),
        ).values(),
      );

      if (uniqueLatest.length === 1) {
        const ep = uniqueLatest[0];
        return this.formatEpisodeLabel({
          season: ep?._seasonNum,
          episode: ep?.episode_num || 1,
          title: ep?.title || ep?.name || ep?.episode_title || "",
          seriesTitle: canonicalSeriesTitle,
        });
      }

      const seasonCount = seasonKeys.length;
      const episodeCount = allEpisodes.filter((ep) =>
        Number.isFinite(parseInt(ep?.episode_num, 10)),
      ).length;

      const seasonWord = this.getSeasonWord(seasonCount);
      const episodesWord = this.getEpisodesWord(episodeCount);
      return `${seasonCount} ${seasonWord} · ${episodeCount} ${episodesWord}`;
    }

    if (allEpisodes.length === 1) {
      const ep = allEpisodes[0];
      return this.formatEpisodeLabel({
        season: ep?._seasonNum,
        episode: ep?.episode_num || 1,
        title: ep?.title || ep?.name || ep?.episode_title || "",
        seriesTitle: canonicalSeriesTitle,
      });
    }

    const seasonCount = seasonKeys.length;
    const episodeCount = allEpisodes.filter((ep) =>
      Number.isFinite(parseInt(ep?.episode_num, 10)),
    ).length;

    const seasonWord = this.getSeasonWord(seasonCount);
    const episodesWord = this.getEpisodesWord(episodeCount);
    return `${seasonCount} ${seasonWord} · ${episodeCount} ${episodesWord}`;
  }

  normalizeEpisodeSubtitle(text) {
    const value = String(text || "").trim();
    if (!value) return "";

    const pattern =
      /^\s*S(\d{1,2})\s*[- ]?\s*E(\d{1,3})(?:\s*[-:|]\s*(.+))?\s*$/i;
    const match = value.match(pattern);
    if (match) {
      return this.formatEpisodeLabel({
        season: match[1],
        episode: match[2],
        title: (match[3] || "").trim(),
      });
    }

    const seasonEpisode = value.match(
      /\b(?:Staffel|Season)\s*(\d{1,2}).*?(?:Folge|Episode)\s*(\d{1,3})(?:\s*[-:|]\s*(.+))?\b/i,
    );
    if (seasonEpisode) {
      return this.formatEpisodeLabel({
        season: seasonEpisode[1],
        episode: seasonEpisode[2],
        title: (seasonEpisode[3] || "").trim(),
      });
    }

    return "";
  }

  formatEpisodeLabel({ season, episode, title = "", seriesTitle = "" } = {}) {
    const s = String(season || "").padStart(2, "0");
    const e = String(episode || "").padStart(2, "0");
    if (!s || !e) return "";

    const base = `S${s}E${e}`;
    const cleanedTitle = this.cleanEpisodeTitle(title, seriesTitle);
    return cleanedTitle ? `${base} - ${cleanedTitle}` : base;
  }

  cleanEpisodeTitle(title, seriesTitle = "") {
    let value = String(title || "").trim();
    if (!value) return "";

    if (seriesTitle) {
      const escapedSeries = seriesTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      value = value.replace(
        new RegExp(`^${escapedSeries}\\s*[-:|]\\s*`, "i"),
        "",
      );
    }

    value = value.replace(/^S\d{1,2}\s*[- ]?\s*E\d{1,3}\s*[-:|]?\s*/i, "");
    value = value.replace(/^S\d{1,2}\s*[- ]?\s*E\d{1,3}\s*[-:|]?\s*/i, "");

    return value.trim();
  }

  parseEpisodeAddedTimestamp(ep) {
    const candidates = [
      ep?.added,
      ep?.added_at,
      ep?.date_added,
      ep?.releaseDate,
      ep?.release_date,
      ep?.last_modified,
    ];

    for (const value of candidates) {
      if (value == null || value === "") continue;

      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;

      const parsed = Date.parse(String(value));
      if (Number.isFinite(parsed)) return parsed;
    }

    return NaN;
  }

  getSeasonWord(count) {
    const label = this.tr("series.seasonLabel");
    const lower = String(label || "").toLowerCase();
    if (lower === "staffel") {
      return count === 1 ? "Staffel" : "Staffeln";
    }
    return count === 1 ? "Season" : "Seasons";
  }

  getEpisodesWord(count) {
    const label = this.tr("series.episodesLabel");
    if (label) return label;
    return count === 1 ? "Episode" : "Episodes";
  }
}

window.HomePage = HomePage;
