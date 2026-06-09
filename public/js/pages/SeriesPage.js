/**
 * Series Page Controller
 * Handles TV series browsing and playback
 */

class SeriesPage {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById("series-grid");
    this.sourceSelect = document.getElementById("series-source-select");
    this.categorySelect = document.getElementById("series-category-select");
    this.searchInput = document.getElementById("series-search");
    this.detailsPanel = document.getElementById("series-details");
    this.seasonsContainer = document.getElementById("series-seasons");

    this.seriesList = [];
    this.categories = [];
    this.sources = [];
    this.currentBatch = 0;
    this.batchSize = 24;
    this.filteredSeries = [];
    this.isLoading = false;
    this.observer = null;
    this.hiddenCategoryIds = new Set();
    this.currentSeries = null;
    this.favoriteIds = new Set(); // Track favorite series IDs
    this.showFavoritesOnly = false;
    this.currentSeriesInfo = null;
    this.currentTmdbId = null; // TMDB ID for episode stills
    this.resumeEpisodeEl = null;

    this.preplayHero = document.getElementById("series-preplay-hero");
    this.preplayLogo = document.getElementById("series-preplay-logo");
    this.preplayTitle = document.getElementById("series-title");
    this.preplayMeta = document.getElementById("series-preplay-meta");
    this.preplayRatings = document.getElementById("series-preplay-ratings");
    this.preplayHighlights = document.getElementById(
      "series-preplay-highlights",
    );
    this.preplayCast = document.getElementById("series-preplay-cast");
    this.preplayPeople = document.getElementById("series-preplay-people");
    this.preplayOverviewTitle = document.getElementById(
      "series-preplay-overview-title",
    );
    this.preplayOverview = document.getElementById("series-plot");
    this.preplayPlayBtn = document.getElementById("series-preplay-play");
    this.preplayTrailerBtn = document.getElementById("series-preplay-trailer");
    this.preplayFavoriteBtn = document.getElementById(
      "series-preplay-favorite",
    );
    this.preplayMoreInfoBtn = document.getElementById(
      "series-preplay-moreinfo",
    );

    this.init();
  }

  tr(key, params = {}) {
    return window.I18n?.t ? window.I18n.t(key, params) : key;
  }

  getProxiedImageUrl(url) {
    if (!url) return "/img/placeholder.png";
    const value = String(url).trim();
    if (!value) return "/img/placeholder.png";
    if (window.location.protocol === "https:" && value.startsWith("http://")) {
      return `/api/proxy/image?url=${encodeURIComponent(value)}`;
    }
    return value;
  }

  getDisplaySourceName(source) {
    return source?.name || "";
  }

  openExternal(url) {
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  sanitizeEpisodeTitle(title, seriesName, episodeNum = null) {
    const raw = String(title || "").trim();
    if (!raw) {
      return episodeNum
        ? `${this.tr("series.episodeLabel")} ${episodeNum}`
        : raw;
    }

    const baseSeries = String(seriesName || "").trim();
    if (!baseSeries) return raw;

    const escaped = baseSeries.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const fuzzySeries = baseSeries
      .split(/\s+/)
      .filter(Boolean)
      .map((chunk) => chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[\\s._-]+");

    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const removeLeadingSeriesSegment = (value) => {
      const segments = String(value || "")
        .split(/\s*[-:|•]+\s*/)
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (segments.length <= 1) return value;

      const first = segments[0] || "";
      const firstNorm = normalize(first.replace(/\(\d{4}\)\s*$/g, ""));
      const seriesNorm = normalize(baseSeries.replace(/\(\d{4}\)\s*$/g, ""));

      if (firstNorm && seriesNorm && firstNorm === seriesNorm) {
        return segments.slice(1).join(" - ").trim();
      }

      return value;
    };

    let cleaned = raw;

    // Remove repeated series title prefixes (provider data can prepend title multiple times).
    const prefixPattern = new RegExp(
      `^(?:${escaped}${fuzzySeries ? `|${fuzzySeries}` : ""})(?:\\s*[-:|•]+\\s*|\\s+)+`,
      "i",
    );

    while (prefixPattern.test(cleaned)) {
      cleaned = cleaned.replace(prefixPattern, "").trim();
    }

    // Remove leading season/episode tokens that providers often inject.
    cleaned = cleaned.replace(
      /^(?:S\d{1,2}\s*E\d{1,3}|S\d{1,2}E\d{1,3}|Staffel\s*\d+\s*Folge\s*\d+|Staffel\s*\d+|Folge\s*\d+|Episode\s*\d+)\s*[-:|•]*\s*/i,
      "",
    );

    cleaned = cleaned.replace(/^[-:|•\s]+/, "").trim();
    cleaned = removeLeadingSeriesSegment(cleaned);

    // Some providers place the series name again after separators (e.g. "Title - Series Name").
    cleaned = cleaned
      .replace(new RegExp(escaped, "ig"), "")
      .replace(fuzzySeries ? new RegExp(fuzzySeries, "ig") : /$^/, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[-:|•\s]+|[-:|•\s]+$/g, "")
      .trim();

    const cleanedLower = cleaned.toLowerCase();
    const seriesLower = baseSeries.toLowerCase();

    if (!cleaned || cleanedLower === seriesLower) {
      return episodeNum
        ? `${this.tr("series.episodeLabel")} ${episodeNum}`
        : raw;
    }

    return cleaned.trim() || raw;
  }

  getEpisodeDisplayTitle(ep, seriesName) {
    const candidates = [
      ep?.info?.title,
      ep?.info?.name,
      ep?.title,
      ep?.episode_title,
      ep?.name,
    ];

    const raw =
      candidates.find(
        (candidate) => typeof candidate === "string" && candidate.trim(),
      ) || "";

    return this.sanitizeEpisodeTitle(raw, seriesName, ep?.episode_num);
  }

  async loadSeriesWatchHistory(series) {
    const byEpisodeId = new Map();
    let latest = null;

    if (!series?.series_id || !series?.sourceId) {
      return { byEpisodeId, latest };
    }

    try {
      const sourceId = String(series.sourceId);
      const seriesId = String(series.series_id);
      const normalize = (value) =>
        String(value || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      const currentSeriesName = normalize(series?.name);
      const rows = await API.request("GET", "/history?limit=400");

      if (!Array.isArray(rows)) {
        return { byEpisodeId, latest };
      }

      rows.forEach((row) => {
        const rowType = String(row?.item_type || row?.type || "").toLowerCase();
        if (rowType !== "episode") return;

        const data = row?.data && typeof row.data === "object" ? row.data : {};
        const rowSource = String(row?.source_id ?? data?.sourceId ?? "");
        const rowSeries = String(row?.parent_id ?? data?.seriesId ?? "");
        const episodeId = String(row?.item_id ?? row?.id ?? "");
        const titleMatches =
          currentSeriesName && normalize(data?.title) === currentSeriesName;
        const sameSeries =
          rowSeries === seriesId || (!rowSeries && titleMatches);
        if (!episodeId || rowSource !== sourceId || !sameSeries) return;

        const progress = Math.max(0, Number(row?.progress) || 0);
        const duration = Math.max(0, Number(row?.duration) || 0);
        const updatedAt = Number(row?.updated_at) || 0;
        const percent =
          duration > 0
            ? Math.max(0, Math.min(100, (progress / duration) * 100))
            : 0;

        const entry = {
          episodeId,
          progress,
          duration,
          percent,
          isStarted: progress > 0,
          isCompleted: duration > 0 && progress >= duration * 0.95,
          updatedAt,
          season: data?.currentSeason ?? null,
          episode: data?.currentEpisode ?? null,
        };

        const existing = byEpisodeId.get(episodeId);
        if (!existing || updatedAt > existing.updatedAt) {
          byEpisodeId.set(episodeId, entry);
        }

        const isContinueCandidate = entry.isStarted && !entry.isCompleted;
        if (isContinueCandidate && (!latest || updatedAt > latest.updatedAt)) {
          latest = entry;
        }
      });
    } catch (err) {
      console.warn("[SeriesPage] Failed to load watch history:", err);
    }

    return { byEpisodeId, latest };
  }

  updateSeriesPlayButtonLabel() {
    if (!this.preplayPlayBtn) return;

    if (this.resumeEpisodeEl) {
      const season = String(
        this.resumeEpisodeEl.dataset.season || "1",
      ).padStart(2, "0");
      const episode = String(
        this.resumeEpisodeEl.dataset.episodeNum || "1",
      ).padStart(2, "0");
      this.preplayPlayBtn.textContent = `${this.tr("home.continue")} - S${season}E${episode}`;
      return;
    }

    this.preplayPlayBtn.textContent = this.tr("series.startFirstEpisode");
  }

  init() {
    // Source change handler
    this.sourceSelect?.addEventListener("change", async () => {
      await this.loadCategories();
      await this.loadSeries();
    });

    // Category change handler
    this.categorySelect?.addEventListener("change", () => {
      this.loadSeries();
    });

    // Search with debounce
    let searchTimeout;
    this.searchInput?.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.filterAndRender(), 300);
    });

    // Back button
    document
      .querySelector(".series-back-btn")
      ?.addEventListener("click", () => {
        this.hideDetails();
      });

    this.preplayPlayBtn?.addEventListener("click", () =>
      this.playFirstEpisode(),
    );
    this.preplayTrailerBtn?.addEventListener("click", () => {
      const url = this.preplayTrailerBtn?.dataset.url;
      this.openExternal(url);
    });
    this.preplayMoreInfoBtn?.addEventListener("click", () => {
      const url = this.preplayMoreInfoBtn?.dataset.url;
      this.openExternal(url);
    });
    this.preplayFavoriteBtn?.addEventListener("click", () => {
      if (this.currentSeries) {
        this.toggleFavorite(this.currentSeries);
      }
    });

    // Set up IntersectionObserver for lazy loading
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.isLoading) {
          this.renderNextBatch();
        }
      },
      { rootMargin: "200px" },
    );

    // Favorites filter toggle
    const favBtn = document.getElementById("series-favorites-btn");
    favBtn?.addEventListener("click", () => {
      this.showFavoritesOnly = !this.showFavoritesOnly;
      favBtn.classList.toggle("active", this.showFavoritesOnly);
      this.filterAndRender();
    });
  }

  async show() {
    // Hide details panel when showing page
    this.hideDetails();

    // Load sources if not loaded
    // Load sources if not loaded
    if (this.sources.length === 0) {
      await this.loadSources();
    }

    // Load favorites
    await this.loadFavorites();

    // Load series if empty
    if (this.seriesList.length === 0) {
      await this.loadCategories();
      await this.loadSeries();
    }
  }

  hide() {
    // Page is hidden
  }

  async loadFavorites() {
    try {
      const favs = await API.favorites.getAll(null, "series");
      this.favoriteIds = new Set(
        favs.map((f) => `${f.source_id}:${f.item_id}`),
      );
    } catch (err) {
      console.error("Error loading favorites:", err);
    }
  }

  async loadSources() {
    try {
      const allSources = await API.sources.getAll();
      this.sources = allSources.filter((s) => s.type === "xtream" && s.enabled);

      this.sourceSelect.innerHTML = `<option value="">${this.tr("common.allSources")}</option>`;
      this.sources.forEach((s) => {
        const option = document.createElement("option");
        option.value = s.id;
        option.textContent = this.getDisplaySourceName(s);
        this.sourceSelect.appendChild(option);
      });
    } catch (err) {
      console.error("Error loading sources:", err);
    }
  }

  async loadCategories() {
    try {
      this.categories = [];
      this.hiddenCategoryIds = new Set();
      this.categorySelect.innerHTML = `<option value="">${this.tr("common.allCategories")}</option>`;

      const sourceId = this.sourceSelect.value;
      const sourcesToLoad = sourceId
        ? this.sources.filter((s) => s.id === parseInt(sourceId))
        : this.sources;

      // Fetch hidden items for each source
      for (const source of sourcesToLoad) {
        try {
          const hiddenItems = await API.channels.getHidden(source.id);
          hiddenItems.forEach((h) => {
            if (h.item_type === "series_category") {
              this.hiddenCategoryIds.add(`${source.id}:${h.item_id}`);
            }
          });
        } catch (err) {
          console.warn(`Failed to load hidden items from source ${source.id}`);
        }
      }

      for (const source of sourcesToLoad) {
        try {
          const cats = await API.proxy.xtream.seriesCategories(source.id);
          if (cats && Array.isArray(cats)) {
            cats.forEach((c) => {
              // Skip hidden categories
              if (
                !this.hiddenCategoryIds.has(`${source.id}:${c.category_id}`)
              ) {
                this.categories.push({ ...c, sourceId: source.id });
              }
            });
          }
        } catch (err) {
          console.warn(
            `Failed to load series categories from source ${source.id}:`,
            err.message,
          );
        }
      }

      // Populate dropdown
      this.categories.forEach((c) => {
        const option = document.createElement("option");
        option.value = `${c.sourceId}:${c.category_id}`;
        option.textContent = c.category_name;
        this.categorySelect.appendChild(option);
      });
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  }

  async loadSeries() {
    this.isLoading = true;
    this.container.innerHTML = `<div class="loading-state loading-state-viewport"><div class="loading-spinner"></div><span class="loading-text">${this.tr("series.loading")}</span></div>`;

    try {
      this.seriesList = [];

      const sourceId = this.sourceSelect.value;
      const categoryValue = this.categorySelect.value;

      const sourcesToLoad = sourceId
        ? this.sources.filter((s) => s.id === parseInt(sourceId))
        : this.sources;

      for (const source of sourcesToLoad) {
        try {
          // Parse category if selected
          let catId = null;
          if (categoryValue) {
            const [catSourceId, categoryId] = categoryValue.split(":");
            if (parseInt(catSourceId) === source.id) {
              catId = categoryId;
            } else if (sourceId) {
              continue;
            }
          }

          const series = await API.proxy.xtream.series(source.id, catId);
          console.log(
            `[Series] Source ${source.id}, Category ${catId || "ALL"}: Got ${series?.length || 0} series`,
          );
          if (series && Array.isArray(series)) {
            series.forEach((s) => {
              // Skip series from hidden categories
              if (this.hiddenCategoryIds.has(`${source.id}:${s.category_id}`)) {
                return;
              }
              this.seriesList.push({
                ...s,
                sourceId: source.id,
                id: `${source.id}:${s.series_id}`,
              });
            });
          }
        } catch (err) {
          console.warn(
            `Failed to load series from source ${source.id}:`,
            err.message,
          );
        }
      }

      console.log(`[Series] Total loaded: ${this.seriesList.length} series`);
      this.filterAndRender();
    } catch (err) {
      console.error("Error loading series:", err);
      this.container.innerHTML = `<div class="empty-state"><p>${this.tr("series.errorLoading")}</p></div>`;
    } finally {
      this.isLoading = false;
    }
  }

  filterAndRender() {
    const searchTerm = this.searchInput?.value?.toLowerCase() || "";
    const isAllCategories = !this.categorySelect?.value;

    this.filteredSeries = this.seriesList.filter((s) => {
      // Filter by favorites if enabled
      if (this.showFavoritesOnly) {
        const favKey = `${s.sourceId}:${s.series_id}`;
        if (!this.favoriteIds.has(favKey)) return false;
      }
      if (searchTerm && !s.name?.toLowerCase().includes(searchTerm)) {
        return false;
      }
      return true;
    });

    if (isAllCategories) {
      this.filteredSeries.sort((a, b) => {
        const aTs = this.getRecentlyAddedTimestamp(a);
        const bTs = this.getRecentlyAddedTimestamp(b);
        if (aTs !== bTs) return bTs - aTs;
        return String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          { sensitivity: "base" },
        );
      });
    }

    console.log(
      `[Series] Displaying ${this.filteredSeries.length} of ${this.seriesList.length} series`,
    );

    this.currentBatch = 0;
    this.container.innerHTML = "";

    if (this.filteredSeries.length === 0) {
      this.container.innerHTML = `<div class="empty-state"><p>${this.tr("series.noFound")}</p></div>`;
      return;
    }

    // Create loader element
    const loader = document.createElement("div");
    loader.className = "series-loader";
    loader.innerHTML = '<div class="loading-spinner"></div>';
    this.container.appendChild(loader);

    // Render initial batches
    for (let i = 0; i < 5; i++) {
      this.renderNextBatch();
    }

    // Start observing loader
    this.observer.observe(loader);
  }

  getRecentlyAddedTimestamp(series) {
    const candidates = [
      series?.added,
      series?.stream_added,
      series?.date_added,
      series?.created_at,
      series?.last_modified,
      series?.releaseDate,
    ];

    for (const raw of candidates) {
      if (raw === null || raw === undefined || raw === "") continue;

      const numeric = Number(raw);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric > 1e12 ? numeric : numeric * 1000;
      }

      const parsed = Date.parse(String(raw));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return 0;
  }

  renderNextBatch() {
    const start = this.currentBatch * this.batchSize;
    const end = start + this.batchSize;
    const batch = this.filteredSeries.slice(start, end);

    if (batch.length === 0) {
      const loader = this.container.querySelector(".series-loader");
      if (loader) loader.style.display = "none";
      return;
    }

    const fragment = document.createDocumentFragment();

    batch.forEach((series) => {
      const card = document.createElement("div");
      card.className = "series-card";
      card.dataset.seriesId = series.series_id;
      card.dataset.sourceId = series.sourceId;

      const poster = this.getProxiedImageUrl(
        series.cover || "/img/placeholder.png",
      );
      const year = series.year || series.releaseDate?.substring(0, 4) || "";
      const rating = series.rating ? `${Icons.star} ${series.rating}` : "";

      const isFav = this.favoriteIds.has(
        `${series.sourceId}:${series.series_id}`,
      );

      card.innerHTML = `
                <div class="series-poster">
                    <img src="${poster}" alt="${series.name}" 
                         onerror="this.onerror=null;this.src='/img/placeholder.png'" loading="lazy">
                    <div class="series-play-overlay">
                        <span class="play-icon">${Icons.play}</span>
                    </div>
                    <button class="favorite-btn ${isFav ? "active" : ""}" title="${isFav ? "Remove from Favorites" : "Add to Favorites"}">
                        <span class="fav-icon">${isFav ? Icons.favorite : Icons.favoriteOutline}</span>
                    </button>
                </div>
                <div class="series-card-info">
                    <div class="series-title">${series.name}</div>
                    <div class="series-meta">
                        ${year ? `<span>${year}</span>` : ""}
                        ${rating ? `<span>${rating}</span>` : ""}
                    </div>
                </div>
            `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".favorite-btn")) {
          const btn = e.target.closest(".favorite-btn");
          this.toggleFavorite(series, btn);
          e.stopPropagation();
        } else {
          this.showSeriesDetails(series);
        }
      });
      fragment.appendChild(card);
    });

    // Insert before loader
    const loader = this.container.querySelector(".series-loader");
    if (loader) {
      this.container.insertBefore(fragment, loader);
    } else {
      this.container.appendChild(fragment);
    }

    this.currentBatch++;

    // Hide loader if done
    if (end >= this.filteredSeries.length && loader) {
      loader.style.display = "none";
    }
  }

  async showSeriesDetails(series) {
    this.currentSeries = series;
    this.resumeEpisodeEl = null;
    this.updateSeriesPlayButtonLabel();

    // Show details panel
    this.container.classList.add("hidden");
    this.detailsPanel.classList.remove("hidden");

    const tmdb = await this.fetchTmdbDetails(series);
    this.renderSeriesPreplay(series, tmdb);

    // Show loading
    this.seasonsContainer.innerHTML =
      '<div class="loading-state"><div class="loading-spinner"></div></div>';

    try {
      // Fetch series info (seasons/episodes)
      const info = await API.proxy.xtream.seriesInfo(
        series.sourceId,
        series.series_id,
      );

      if (!info || !info.episodes) {
        this.seasonsContainer.innerHTML = `<p class="hint">${this.tr("series.noEpisodes")}</p>`;
        return;
      }

      // Store series info for WatchPage
      this.currentSeriesInfo = info;

      const watchHistory = await this.loadSeriesWatchHistory(series);

      const seasons = Object.keys(info.episodes).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );

      this.updateSeriesPreplayHighlights(series, tmdb, info, seasons);

      // Fetch TMDB episode stills for each season in parallel (best-effort)
      const lang = window.I18n?.language || "de";
      const tmdbStills = {}; // { seasonNum: { episodeNum: stillUrl } }
      if (this.currentTmdbId) {
        await Promise.all(
          seasons.map(async (seasonNum) => {
            try {
              const result = await API.proxy.tmdb.season(
                this.currentTmdbId,
                seasonNum,
                lang,
              );
              if (result?.episodes) {
                tmdbStills[seasonNum] = {};
                result.episodes.forEach((ep) => {
                  if (ep.stillUrl)
                    tmdbStills[seasonNum][ep.episode_num] = ep.stillUrl;
                });
              }
            } catch {
              // non-fatal
            }
          }),
        );
      }

      // Render seasons with episode tiles
      let html = "";
      seasons.forEach((seasonNum, seasonIndex) => {
        const episodes = info.episodes[seasonNum];
        const isCollapsed = seasonIndex > 0;
        html += `
          <div class="season-group ${isCollapsed ? "collapsed" : ""}">
            <div class="season-header">
              <span class="season-expander">${Icons.chevronDown}</span>
              <span class="season-name">${this.tr("series.seasonLabel")} ${seasonNum} (${episodes.length} ${this.tr("series.episodesLabel")})</span>
            </div>
            <div class="episode-row">
              <button class="episode-scroll-btn episode-scroll-left" type="button" aria-label="Scroll left">&#10094;</button>
              <div class="episode-grid">
                ${episodes
                  .map((ep) => {
                    const episodeId = String(ep.id || "");
                    const watchState = watchHistory.byEpisodeId.get(episodeId);
                    const isStarted = Boolean(watchState?.isStarted);
                    const isCompleted = Boolean(watchState?.isCompleted);
                    const resumeTime = watchState?.isCompleted
                      ? 0
                      : Math.floor(watchState?.progress || 0);
                    const progressPercent = Number.isFinite(watchState?.percent)
                      ? Math.max(0, Math.min(100, watchState.percent))
                      : 0;
                    const thumb =
                      ep.info?.movie_image ||
                      tmdbStills[seasonNum]?.[ep.episode_num] ||
                      null;
                    const proxiedThumb = thumb
                      ? this.getProxiedImageUrl(thumb)
                      : null;
                    const thumbHtml = thumb
                      ? `<img src="${proxiedThumb}" alt="" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('ep-no-thumb')">`
                      : `<span class="ep-play-icon">${Icons.play}</span>`;
                    const duration = ep.info?.duration || ep.duration || "";
                    const cleanEpisodeTitle = this.getEpisodeDisplayTitle(
                      ep,
                      series?.name,
                    );
                    return `
                      <div class="episode-tile ${isStarted ? "has-watch-progress" : ""} ${isCompleted ? "is-completed" : ""}"
                           data-episode-id="${ep.id}"
                           data-source-id="${series.sourceId}"
                           data-container="${ep.container_extension || "mp4"}"
                           data-season="${seasonNum}"
                           data-episode-num="${ep.episode_num || "1"}"
                           data-resume-time="${resumeTime}">
                        <div class="episode-tile-thumb">
                          ${thumbHtml}
                          ${isStarted ? `<div class="episode-watch-status">${this.tr("home.continue")}</div>` : ""}
                          ${isStarted ? `<div class="episode-watch-progress"><span style="width:${progressPercent}%"></span></div>` : ""}
                        </div>
                        <div class="episode-tile-info">
                          <div class="episode-tile-num">E${ep.episode_num}</div>
                          <div class="episode-tile-title" title="${cleanEpisodeTitle}">${cleanEpisodeTitle}</div>
                          ${duration ? `<div class="episode-tile-duration">${duration}</div>` : ""}
                        </div>
                      </div>`;
                  })
                  .join("")}
              </div>
              <button class="episode-scroll-btn episode-scroll-right" type="button" aria-label="Scroll right">&#10095;</button>
            </div>
          </div>`;
      });

      this.seasonsContainer.innerHTML = html;

      // Season expand/collapse
      this.seasonsContainer
        .querySelectorAll(".season-header")
        .forEach((header) => {
          header.addEventListener("click", () => {
            const group = header.closest(".season-group");
            group.classList.toggle("collapsed");

            const row = group.querySelector(".episode-row");
            if (row && typeof row.updateScrollButtons === "function") {
              requestAnimationFrame(() => row.updateScrollButtons());
            }
          });
        });

      // Episode click
      this.seasonsContainer.querySelectorAll(".episode-tile").forEach((ep) => {
        ep.addEventListener("click", () => this.playEpisode(ep));
      });

      if (watchHistory.latest?.episodeId) {
        const resumeSelector = `.episode-tile[data-episode-id="${watchHistory.latest.episodeId}"]`;
        this.resumeEpisodeEl =
          this.seasonsContainer.querySelector(resumeSelector);
      }
      this.updateSeriesPlayButtonLabel();

      // Horizontal season scrollers
      this.seasonsContainer.querySelectorAll(".episode-row").forEach((row) => {
        const grid = row.querySelector(".episode-grid");
        const leftBtn = row.querySelector(".episode-scroll-left");
        const rightBtn = row.querySelector(".episode-scroll-right");
        if (!grid || !leftBtn || !rightBtn) return;

        const updateButtons = () => {
          const maxLeft = Math.max(0, grid.scrollWidth - grid.clientWidth);
          const hasOverflow = maxLeft > 8;
          row.classList.toggle("no-scroll", !hasOverflow);

          if (!hasOverflow) {
            leftBtn.classList.add("disabled");
            rightBtn.classList.add("disabled");
            return;
          }

          leftBtn.classList.toggle("disabled", grid.scrollLeft <= 4);
          rightBtn.classList.toggle("disabled", grid.scrollLeft >= maxLeft - 4);
        };

        row.updateScrollButtons = updateButtons;

        const scrollAmount = () =>
          Math.max(220, Math.floor(grid.clientWidth * 0.85));

        leftBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          grid.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
        });

        rightBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          grid.scrollBy({ left: scrollAmount(), behavior: "smooth" });
        });

        grid.addEventListener("scroll", updateButtons, { passive: true });
        updateButtons();
      });
    } catch (err) {
      console.error("Error loading series info:", err);
      this.seasonsContainer.innerHTML = `<p class="hint" style="color: var(--color-error);">${this.tr("series.errorEpisodes")}</p>`;
    }
  }

  async fetchTmdbDetails(series) {
    try {
      const title = series?.name || "";
      if (!title) return null;
      const lang = window.I18n?.language || "de";
      const year = series?.year || series?.releaseDate?.substring?.(0, 4) || "";
      const result = await API.proxy.tmdb.search(title, {
        mediaType: "tv",
        year,
        lang,
      });
      return result?.found ? result : null;
    } catch (err) {
      console.warn("[Series] TMDB lookup failed:", err.message);
      return null;
    }
  }

  renderSeriesPreplay(series, tmdb) {
    const labels = this.getSeriesPreplayLabels();
    this.currentTmdbId = tmdb?.id || null;
    const title = tmdb?.title || series?.name || "";
    const overview = tmdb?.overview || series?.plot || "";
    const releaseDate = tmdb?.releaseDate || series?.releaseDate || "";
    const year =
      series?.year || (releaseDate ? String(releaseDate).slice(0, 4) : "");
    const runtime = tmdb?.runtime ? `${tmdb.runtime} min` : "";
    const genres = Array.isArray(tmdb?.genres) ? tmdb.genres.join(", ") : "";

    this.preplayTitle.textContent = title;
    this.preplayMeta.textContent = [year, runtime, genres]
      .filter(Boolean)
      .join("  |  ");
    if (this.preplayOverviewTitle) {
      this.preplayOverviewTitle.textContent = labels.overview;
    }
    this.preplayOverview.textContent = overview;

    const cast = Array.isArray(tmdb?.cast) ? tmdb.cast.join(", ") : "";
    this.preplayCast.textContent = cast;
    this.preplayCast.classList.toggle("hidden", !cast);
    this.renderSeriesPeopleCards(tmdb, labels);

    this.preplayRatings.innerHTML = this.renderRatingStars(tmdb?.voteAverage);

    const backdropUrl = tmdb?.backdropUrl || series?.cover || "";
    const proxiedBackdropUrl = backdropUrl
      ? this.getProxiedImageUrl(backdropUrl)
      : "";
    if (proxiedBackdropUrl) {
      this.preplayHero.style.setProperty(
        "--preplay-backdrop-url",
        `url("${proxiedBackdropUrl}")`,
      );
      this.detailsPanel?.style.setProperty(
        "--preplay-page-backdrop-url",
        `url("${proxiedBackdropUrl}")`,
      );
    } else {
      this.preplayHero.style.setProperty("--preplay-backdrop-url", "none");
      this.detailsPanel?.style.setProperty(
        "--preplay-page-backdrop-url",
        "none",
      );
    }

    const logoUrl = tmdb?.logoUrl || "";
    if (logoUrl) {
      this.preplayLogo.src = this.getProxiedImageUrl(logoUrl);
      this.preplayLogo.classList.remove("hidden");
      this.preplayTitle.classList.add("hidden");
    } else {
      this.preplayLogo.src = "";
      this.preplayLogo.classList.add("hidden");
      this.preplayTitle.classList.remove("hidden");
    }

    const trailerSearch = series?.name
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${series.name} trailer`)}`
      : "";
    const trailerUrl =
      tmdb?.trailerUrl ||
      series?.trailer ||
      series?.youtube_trailer ||
      trailerSearch;
    this.preplayTrailerBtn.dataset.url = trailerUrl;
    this.preplayTrailerBtn.disabled = !trailerUrl;

    const infoSearch = series?.name
      ? `https://www.themoviedb.org/search/tv?query=${encodeURIComponent(series.name)}`
      : "";
    const infoUrl = tmdb?.id
      ? `https://www.themoviedb.org/tv/${tmdb.id}`
      : tmdb?.imdbId
        ? `https://www.imdb.com/title/${tmdb.imdbId}`
        : infoSearch;
    this.preplayMoreInfoBtn.dataset.url = infoUrl;
    this.preplayMoreInfoBtn.disabled = !infoUrl;

    this.updateSeriesPreplayHighlights(series, tmdb, null, null);
    this.updatePreplayFavoriteButton(series);
  }

  renderRatingStars(voteAverage) {
    const rating = Number(voteAverage);
    if (!Number.isFinite(rating) || rating <= 0) {
      return "";
    }

    const starCount = Math.max(0, Math.min(5, Math.round(rating / 2)));
    return `
      <div class="preplay-rating-stars" aria-label="TMDB rating ${rating.toFixed(1)} of 10">
        ${Array.from(
          { length: 5 },
          (_, index) => `
          <span class="preplay-rating-star ${index < starCount ? "filled" : "empty"}">${Icons.star}</span>
        `,
        ).join("")}
        <span class="preplay-rating-value">${rating.toFixed(1)}</span>
      </div>
    `;
  }

  updateSeriesPreplayHighlights(series, tmdb, info = null, seasons = null) {
    if (!this.preplayHighlights) return;

    const labels = this.getSeriesPreplayLabels();
    const episodeRuntime = this.getEpisodeRuntimeLabel(tmdb, info, labels);
    const totalSeasons = Array.isArray(seasons)
      ? seasons.length
      : Array.isArray(tmdb?.number_of_seasons)
        ? tmdb.number_of_seasons
        : tmdb?.numberOfSeasons || tmdb?.seasons || "";
    const totalEpisodes = info?.episodes
      ? Object.values(info.episodes).reduce(
          (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
          0,
        )
      : tmdb?.number_of_episodes || tmdb?.numberOfEpisodes || "";
    const sourceName = this.getFormattedSourceName(series);

    const cards = [
      { label: labels.runtime, value: episodeRuntime },
      {
        label: labels.seasons,
        value: totalSeasons ? String(totalSeasons) : labels.notAvailable,
      },
      {
        label: labels.episodes,
        value: totalEpisodes ? String(totalEpisodes) : labels.notAvailable,
      },
      { label: labels.source, value: sourceName || labels.notAvailable },
    ];

    this.preplayHighlights.innerHTML = cards
      .map(
        (item) => `
          <div class="preplay-highlight-card">
            <span class="preplay-highlight-label">${item.label}</span>
            <span class="preplay-highlight-value" title="${item.value}">${item.value}</span>
          </div>
        `,
      )
      .join("");
  }

  getSeriesPreplayLabels() {
    const isGerman = (window.I18n?.language || "")
      .toLowerCase()
      .startsWith("de");
    if (isGerman) {
      return {
        overview: "Handlung",
        runtime: "Episodenlaufzeit",
        seasons: "Staffeln",
        episodes: "Episoden",
        source: "Quelle",
        director: "Regie",
        cast: "Cast",
        personShort: "P",
        perEpisodeSuffix: " / Ep",
        notAvailable: "-",
      };
    }

    return {
      overview: "Overview",
      runtime: "Episode runtime",
      seasons: "Seasons",
      episodes: "Episodes",
      source: "Source",
      director: "Director",
      cast: "Cast",
      personShort: "P",
      perEpisodeSuffix: " / Ep",
      notAvailable: "-",
    };
  }

  getEpisodeRuntimeLabel(tmdb, info, labels) {
    const minutes =
      this.extractEpisodeRuntimeMinutes(info) || Number(tmdb?.runtime) || 0;
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return labels.notAvailable;
    }
    return `${Math.round(minutes)} min${labels.perEpisodeSuffix}`;
  }

  extractEpisodeRuntimeMinutes(info) {
    if (!info?.episodes || typeof info.episodes !== "object") return 0;

    const values = [];
    Object.values(info.episodes).forEach((episodeList) => {
      if (!Array.isArray(episodeList)) return;
      episodeList.forEach((episode) => {
        const raw = episode?.info?.duration || episode?.duration || "";
        const parsed = this.parseDurationMinutes(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
          values.push(parsed);
        }
      });
    });

    if (values.length === 0) return 0;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
  }

  parseDurationMinutes(value) {
    if (value === null || value === undefined || value === "") return 0;
    const raw = String(value).trim();
    if (!raw) return 0;

    if (/^\d+(?:\.\d+)?$/.test(raw)) {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || numeric <= 0) return 0;
      return numeric > 300 ? numeric / 60 : numeric;
    }

    const match = raw.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (!match) return 0;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    if (!Number.isFinite(hours + minutes + seconds)) return 0;
    return hours * 60 + minutes + seconds / 60;
  }

  getFormattedSourceName(series) {
    const sourceId = Number(series?.sourceId || series?.source_id || 0);
    const source = this.sources.find((s) => Number(s.id) === sourceId);
    return this.getDisplaySourceName(source) || "";
  }

  renderSeriesPeopleCards(tmdb, labels) {
    if (!this.preplayPeople) return;

    const directors = Array.isArray(tmdb?.directorMembers)
      ? tmdb.directorMembers
      : [];
    const cast = Array.isArray(tmdb?.castMembers) ? tmdb.castMembers : [];

    const directorPeople = directors
      .slice(0, 4)
      .map((person) => ({
        ...person,
        subtitle: person.job || labels.director,
      }))
      .filter((person) => person?.name);

    const castPeople = cast
      .slice(0, 10)
      .map((person) => ({
        ...person,
        subtitle: person.character || labels.cast,
      }))
      .filter((person) => person?.name);

    if (directorPeople.length === 0 && castPeople.length === 0) {
      this.preplayPeople.innerHTML = "";
      this.preplayPeople.classList.add("hidden");
      return;
    }

    const fallbackSvg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='#1f2937'/><text x='50%' y='52%' font-family='sans-serif' font-size='20' fill='#9ca3af' text-anchor='middle'>${labels.personShort}</text></svg>`,
    );
    const fallbackImg = `data:image/svg+xml;charset=UTF-8,${fallbackSvg}`;

    const renderGroup = (title, people) => {
      if (!people.length) return "";
      return `
        <section class="preplay-people-group">
          <h5 class="preplay-people-title">${title}</h5>
          <div class="preplay-people-list">
            ${people
              .map((person) => {
                const image = person.profileUrl || fallbackImg;
                return `
                  <div class="preplay-person-card">
                    <img src="${image}" alt="${person.name}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}'">
                    <div class="preplay-person-name" title="${person.name}">${person.name}</div>
                    <div class="preplay-person-role" title="${person.subtitle || ""}">${person.subtitle || ""}</div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </section>
      `;
    };

    this.preplayPeople.innerHTML =
      renderGroup(labels.director, directorPeople) +
      renderGroup(labels.cast, castPeople);
    this.preplayPeople.classList.remove("hidden");
    this.preplayCast.classList.add("hidden");
  }

  playFirstEpisode() {
    if (this.resumeEpisodeEl) {
      this.playEpisode(this.resumeEpisodeEl);
      return;
    }

    const firstEpisode = this.seasonsContainer?.querySelector(".episode-tile");
    if (firstEpisode) {
      this.playEpisode(firstEpisode);
    }
  }

  hideDetails() {
    this.detailsPanel.classList.add("hidden");
    this.container.classList.remove("hidden");
    this.currentSeries = null;
    this.currentTmdbId = null;
    this.resumeEpisodeEl = null;
    if (this.preplayPeople) {
      this.preplayPeople.innerHTML = "";
      this.preplayPeople.classList.add("hidden");
    }
    this.updateSeriesPlayButtonLabel();
    this.detailsPanel?.style.setProperty("--preplay-page-backdrop-url", "none");
  }

  updatePreplayFavoriteButton(series) {
    if (!this.preplayFavoriteBtn || !series) return;
    const isFav = this.favoriteIds.has(
      `${series.sourceId}:${series.series_id}`,
    );
    this.preplayFavoriteBtn.classList.toggle("active", isFav);
    this.preplayFavoriteBtn.innerHTML = `${isFav ? Icons.favorite : Icons.favoriteOutline}<span class="btn-label">${this.tr(isFav ? "common.removeFromFavorites" : "common.addToFavorites")}</span>`;
  }

  updateGridFavoriteButton(series, isFav) {
    const selector = `.series-card[data-source-id="${series.sourceId}"][data-series-id="${series.series_id}"] .favorite-btn`;
    const btn = this.container.querySelector(selector);
    if (!btn) return;
    const iconSpan = btn.querySelector(".fav-icon");
    btn.classList.toggle("active", isFav);
    btn.title = this.tr(
      isFav ? "common.removeFromFavorites" : "common.addToFavorites",
    );
    if (iconSpan) {
      iconSpan.innerHTML = isFav ? Icons.favorite : Icons.favoriteOutline;
    }
  }

  async playEpisode(episodeEl) {
    const episodeId = episodeEl.dataset.episodeId;
    const sourceId = parseInt(episodeEl.dataset.sourceId);
    const container = episodeEl.dataset.container || "mp4";
    const seasonNum = episodeEl.dataset.season || "1";
    const episodeNum = episodeEl.dataset.episodeNum || "1";
    const resumeTime = Math.max(0, Number(episodeEl.dataset.resumeTime) || 0);

    try {
      // Get stream URL for episode (use 'series' type)
      const result = await API.proxy.xtream.getStreamUrl(
        sourceId,
        episodeId,
        "series",
        container,
      );

      if (result && result.url) {
        // Play in dedicated Watch page
        if (this.app.pages.watch) {
          const episodeTitle =
            episodeEl.querySelector(".episode-tile-title")?.textContent ||
            `Episode ${episodeNum}`;

          this.app.pages.watch.play(
            {
              type: "series",
              id: episodeId,
              title: this.currentSeries?.name || "Series",
              subtitle: `S${seasonNum} E${episodeNum} - ${episodeTitle}`,
              poster: this.currentSeries?.cover,
              description: this.currentSeries?.plot || "",
              year: this.currentSeries?.year,
              rating: this.currentSeries?.rating,
              sourceId: sourceId,
              seriesId: this.currentSeries?.series_id,
              seriesInfo: this.currentSeriesInfo,
              currentSeason: seasonNum,
              currentEpisode: episodeNum,
              containerExtension: container,
              resumeTime,
            },
            result.url,
          );
        }
      }
    } catch (err) {
      console.error("Error playing episode:", err);
    }
  }

  async toggleFavorite(series, btn = null) {
    const favKey = `${series.sourceId}:${series.series_id}`;
    const isFav = this.favoriteIds.has(favKey);
    const iconSpan = btn?.querySelector(".fav-icon");

    try {
      // Optimistic update
      if (isFav) {
        this.favoriteIds.delete(favKey);
        if (btn) {
          btn.classList.remove("active");
          btn.title = this.tr("common.addToFavorites");
        }
        if (iconSpan) iconSpan.innerHTML = Icons.favoriteOutline;
        await API.favorites.remove(series.sourceId, series.series_id, "series");
      } else {
        this.favoriteIds.add(favKey);
        if (btn) {
          btn.classList.add("active");
          btn.title = this.tr("common.removeFromFavorites");
        }
        if (iconSpan) iconSpan.innerHTML = Icons.favorite;
        await API.favorites.add(series.sourceId, series.series_id, "series");
      }

      const nextFavState = !isFav;
      this.updateGridFavoriteButton(series, nextFavState);
      this.updatePreplayFavoriteButton(series);

      if (this.showFavoritesOnly) {
        this.filterAndRender();
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      // Revert on error
      if (isFav) {
        this.favoriteIds.add(favKey);
        if (btn) btn.classList.add("active");
        if (iconSpan) iconSpan.innerHTML = Icons.favorite;
      } else {
        this.favoriteIds.delete(favKey);
        if (btn) btn.classList.remove("active");
        if (iconSpan) iconSpan.innerHTML = Icons.favoriteOutline;
      }
      this.updatePreplayFavoriteButton(series);
    }
  }
}

window.SeriesPage = SeriesPage;
