/**
 * Movies Page Controller
 * Handles VOD movie browsing and playback
 */

class MoviesPage {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById("movies-grid");
    this.sourceSelect = document.getElementById("movies-source-select");
    this.categorySelect = document.getElementById("movies-category-select");
    this.searchInput = document.getElementById("movies-search");

    this.movies = [];
    this.categories = [];
    this.sources = [];
    this.currentBatch = 0;
    this.batchSize = 24;
    this.filteredMovies = [];
    this.isLoading = false;
    this.observer = null;
    this.favoriteIds = new Set(); // Track favorite movie IDs
    this.showFavoritesOnly = false;
    this.currentPreplayMovie = null;
    this.currentPreplayResumeTime = 0;

    this.preplayScreen = document.getElementById("movies-preplay");
    this.preplayHero = document.getElementById("movies-preplay-hero");
    this.preplayBackBtn = document.getElementById("movies-preplay-back");
    this.preplayLogo = document.getElementById("movies-preplay-logo");
    this.preplayTitle = document.getElementById("movies-preplay-title");
    this.preplayMeta = document.getElementById("movies-preplay-meta");
    this.preplayRatings = document.getElementById("movies-preplay-ratings");
    this.preplayResume = document.getElementById("movies-preplay-resume");
    this.preplayHighlights = document.getElementById(
      "movies-preplay-highlights",
    );
    this.preplayDetails = document.getElementById("movies-preplay-details");
    this.preplayPeople = document.getElementById("movies-preplay-people");
    this.preplayCast = document.getElementById("movies-preplay-cast");
    this.preplayPlotTitle = document.getElementById(
      "movies-preplay-plot-title",
    );
    this.preplayOverview = document.getElementById("movies-preplay-overview");
    this.preplayPlayBtn = document.getElementById("movies-preplay-play");
    this.preplayTrailerBtn = document.getElementById("movies-preplay-trailer");
    this.preplayFavoriteBtn = document.getElementById(
      "movies-preplay-favorite",
    );
    this.preplayMoreInfoBtn = document.getElementById(
      "movies-preplay-moreinfo",
    );
    this.preplaySimilarWrap = document.getElementById(
      "movies-preplay-similar-wrap",
    );
    this.preplaySimilarTitle = document.getElementById(
      "movies-preplay-similar-title",
    );
    this.preplaySimilarRow = document.getElementById(
      "movies-preplay-similar-row",
    );
    this.preplaySimilarLeft = document.getElementById(
      "movies-preplay-similar-left",
    );
    this.preplaySimilarRight = document.getElementById(
      "movies-preplay-similar-right",
    );
    this.preplaySimilarGrid = document.getElementById("movies-preplay-similar");

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
    const raw = String(source?.url || "").trim();
    if (raw) {
      try {
        const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
          ? raw
          : `http://${raw}`;
        const hostname = new URL(normalized).hostname.toLowerCase();
        if (
          hostname === "xui.streamnet.live" ||
          hostname.endsWith(".xui.streamnet.live") ||
          hostname === "xui.stremnet.live" ||
          hostname.endsWith(".xui.stremnet.live")
        ) {
          return "StreamNet TV";
        }
      } catch {
        if (
          /(?:^|[\/@.])xui\.(?:streamnet|stremnet)\.live(?::\d+)?(?:\/|$)/i.test(
            raw,
          )
        ) {
          return "StreamNet TV";
        }
      }
    }

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

  init() {
    // Source change handler
    this.sourceSelect?.addEventListener("change", async () => {
      await this.loadCategories();
      await this.loadMovies();
    });

    // Category change handler
    this.categorySelect?.addEventListener("change", () => {
      this.loadMovies();
    });

    // Search with debounce
    let searchTimeout;
    this.searchInput?.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.filterAndRender(), 300);
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
    const favBtn = document.getElementById("movies-favorites-btn");
    favBtn?.addEventListener("click", () => {
      this.showFavoritesOnly = !this.showFavoritesOnly;
      favBtn.classList.toggle("active", this.showFavoritesOnly);
      this.filterAndRender();
    });

    this.preplayBackBtn?.addEventListener("click", () => this.hidePreplay());
    this.preplayPlayBtn?.addEventListener("click", async () => {
      if (!this.currentPreplayMovie) return;

      let resumeTime = Math.max(0, Number(this.currentPreplayResumeTime) || 0);
      if (resumeTime <= 0) {
        const latest = await this.loadMovieResumeState(
          this.currentPreplayMovie,
        );
        resumeTime = Math.max(0, Number(latest?.progress) || 0);
        this.currentPreplayResumeTime = resumeTime;
      }

      this.playMovie(this.currentPreplayMovie, {
        resumeTime,
      });
    });
    this.preplayTrailerBtn?.addEventListener("click", () => {
      const url = this.preplayTrailerBtn?.dataset.url;
      this.openExternal(url);
    });
    this.preplayMoreInfoBtn?.addEventListener("click", () => {
      const url = this.preplayMoreInfoBtn?.dataset.url;
      this.openExternal(url);
    });
    this.preplayFavoriteBtn?.addEventListener("click", () => {
      if (this.currentPreplayMovie) {
        this.toggleFavorite(this.currentPreplayMovie);
      }
    });
  }

  async show() {
    this.hidePreplay();

    // Load sources if not loaded
    if (this.sources.length === 0) {
      await this.loadSources();
    }

    // Load favorites
    await this.loadFavorites();

    // Load movies if empty
    if (this.movies.length === 0) {
      await this.loadCategories();
      await this.loadMovies();
    }
  }

  hide() {
    this.hidePreplay();
  }

  async loadFavorites() {
    try {
      const favs = await API.favorites.getAll(null, "movie");
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
      this.hiddenCategoryIds = new Set(); // Track hidden categories
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
            if (h.item_type === "vod_category") {
              this.hiddenCategoryIds.add(`${source.id}:${h.item_id}`);
            }
          });
        } catch (err) {
          console.warn(`Failed to load hidden items from source ${source.id}`);
        }
      }

      for (const source of sourcesToLoad) {
        try {
          const cats = await API.proxy.xtream.vodCategories(source.id);
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
            `Failed to load categories from source ${source.id}:`,
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

  async loadMovies() {
    this.isLoading = true;
    this.container.innerHTML = `<div class="loading-state loading-state-viewport"><div class="loading-spinner"></div><span class="loading-text">${this.tr("movies.loading")}</span></div>`;

    try {
      this.movies = [];

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
              continue; // Skip this source if category is from different source
            }
          }

          const movies = await API.proxy.xtream.vodStreams(source.id, catId);
          console.log(
            `[Movies] Source ${source.id}, Category ${catId || "ALL"}: Got ${movies?.length || 0} movies`,
          );
          if (movies && Array.isArray(movies)) {
            movies.forEach((m) => {
              // Skip movies from hidden categories
              if (
                this.hiddenCategoryIds &&
                this.hiddenCategoryIds.has(`${source.id}:${m.category_id}`)
              ) {
                return;
              }
              this.movies.push({
                ...m,
                sourceId: source.id,
                id: `${source.id}:${m.stream_id}`,
              });
            });
          }
        } catch (err) {
          console.warn(
            `Failed to load movies from source ${source.id}:`,
            err.message,
          );
        }
      }

      console.log(`[Movies] Total loaded: ${this.movies.length} movies`);
      this.filterAndRender();
    } catch (err) {
      console.error("Error loading movies:", err);
      this.container.innerHTML = `<div class="empty-state"><p>${this.tr("movies.errorLoading")}</p></div>`;
    } finally {
      this.isLoading = false;
    }
  }

  filterAndRender() {
    const searchTerm = this.searchInput?.value?.toLowerCase() || "";
    const isAllCategories = !this.categorySelect?.value;

    this.filteredMovies = this.movies.filter((m) => {
      // Filter by favorites if enabled
      if (this.showFavoritesOnly) {
        const favKey = `${m.sourceId}:${m.stream_id}`;
        if (!this.favoriteIds.has(favKey)) return false;
      }
      if (searchTerm && !m.name?.toLowerCase().includes(searchTerm)) {
        return false;
      }
      return true;
    });

    if (isAllCategories) {
      this.filteredMovies.sort((a, b) => {
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
      `[Movies] Displaying ${this.filteredMovies.length} of ${this.movies.length} movies`,
    );

    this.currentBatch = 0;
    this.container.innerHTML = "";

    if (this.filteredMovies.length === 0) {
      this.container.innerHTML = `<div class="empty-state"><p>${this.tr("movies.noFound")}</p></div>`;
      return;
    }

    // Create loader element
    const loader = document.createElement("div");
    loader.className = "movies-loader";
    loader.innerHTML = '<div class="loading-spinner"></div>';
    this.container.appendChild(loader);

    // Render initial batches (more to fill viewport)
    for (let i = 0; i < 5; i++) {
      this.renderNextBatch();
    }

    // Start observing loader
    this.observer.observe(loader);
  }

  getRecentlyAddedTimestamp(movie) {
    const candidates = [
      movie?.added,
      movie?.stream_added,
      movie?.date_added,
      movie?.created_at,
      movie?.last_modified,
      movie?.releaseDate,
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
    const batch = this.filteredMovies.slice(start, end);

    console.log(
      `[Movies] Rendering batch ${this.currentBatch}: ${batch.length} cards (${start}-${end})`,
    );

    if (batch.length === 0) {
      const loader = this.container.querySelector(".movies-loader");
      if (loader) loader.style.display = "none";
      return;
    }

    const fragment = document.createDocumentFragment();

    batch.forEach((movie) => {
      const card = document.createElement("div");
      card.className = "movie-card";
      card.dataset.movieId = movie.stream_id;
      card.dataset.sourceId = movie.sourceId;

      const poster = this.getProxiedImageUrl(
        movie.stream_icon || movie.cover || "/img/placeholder.png",
      );
      const year = movie.year || movie.releaseDate?.substring(0, 4) || "";
      const rating = movie.rating ? `${Icons.star} ${movie.rating}` : "";

      const isFav = this.favoriteIds.has(
        `${movie.sourceId}:${movie.stream_id}`,
      );

      card.innerHTML = `
                <div class="movie-poster">
                    <img src="${poster}" alt="${movie.name}" 
                         onerror="this.onerror=null;this.src='/img/placeholder.png'" loading="lazy">
                    <div class="movie-play-overlay">
                        <span class="play-icon">${Icons.play}</span>
                    </div>
                    <button class="favorite-btn ${isFav ? "active" : ""}" title="${isFav ? "Remove from Favorites" : "Add to Favorites"}">
                        <span class="fav-icon">${isFav ? Icons.favorite : Icons.favoriteOutline}</span>
                    </button>
                </div>
                <div class="movie-info">
                    <div class="movie-title">${movie.name}</div>
                    <div class="movie-meta">
                        ${year ? `<span>${year}</span>` : ""}
                        ${rating ? `<span>${rating}</span>` : ""}
                    </div>
                </div>
            `;

      // Card click opens preplay screen, but not if clicking favorite button
      card.addEventListener("click", (e) => {
        if (e.target.closest(".favorite-btn")) {
          const btn = e.target.closest(".favorite-btn");
          this.toggleFavorite(movie, btn);
          e.stopPropagation();
        } else {
          this.showMoviePreplay(movie);
        }
      });
      fragment.appendChild(card);
    });

    // Insert before loader
    const loader = this.container.querySelector(".movies-loader");
    if (loader) {
      this.container.insertBefore(fragment, loader);
    } else {
      this.container.appendChild(fragment);
    }

    this.currentBatch++;

    // Hide loader if done
    if (end >= this.filteredMovies.length && loader) {
      loader.style.display = "none";
    }
  }

  hidePreplay() {
    this.currentPreplayMovie = null;
    this.currentPreplayResumeTime = 0;
    this.preplayScreen?.classList.add("hidden");
    this.container?.classList.remove("hidden");
    if (this.preplayResume) {
      this.preplayResume.textContent = "";
      this.preplayResume.classList.add("hidden");
    }
    if (this.preplayPeople) {
      this.preplayPeople.innerHTML = "";
      this.preplayPeople.classList.add("hidden");
    }
    if (this.preplaySimilarGrid) {
      if (this.preplaySimilarGrid._updateScrollButtons) {
        this.preplaySimilarGrid.removeEventListener(
          "scroll",
          this.preplaySimilarGrid._updateScrollButtons,
        );
      }
      this.preplaySimilarGrid._updateScrollButtons = null;
      this.preplaySimilarGrid.innerHTML = "";
    }
    if (this.preplaySimilarLeft?._scrollHandler) {
      this.preplaySimilarLeft.removeEventListener(
        "click",
        this.preplaySimilarLeft._scrollHandler,
      );
      this.preplaySimilarLeft._scrollHandler = null;
    }
    if (this.preplaySimilarRight?._scrollHandler) {
      this.preplaySimilarRight.removeEventListener(
        "click",
        this.preplaySimilarRight._scrollHandler,
      );
      this.preplaySimilarRight._scrollHandler = null;
    }
    this.preplaySimilarRow?.classList.remove("no-scroll");
    this.preplaySimilarWrap?.classList.add("hidden");
    this.preplayScreen?.style.setProperty(
      "--preplay-page-backdrop-url",
      "none",
    );
  }

  async showMoviePreplay(movie) {
    this.currentPreplayMovie = movie;
    this.container?.classList.add("hidden");
    this.preplayScreen?.classList.remove("hidden");

    const tmdb = await this.fetchTmdbDetails(movie);
    await this.renderPreplay(movie, tmdb);
  }

  async fetchTmdbDetails(movie) {
    try {
      const title = movie?.name || "";
      if (!title) return null;
      const lang = window.I18n?.language || "de";
      const year = movie?.year || movie?.releaseDate?.substring?.(0, 4) || "";
      const result = await API.proxy.tmdb.search(title, {
        mediaType: "movie",
        year,
        lang,
      });
      return result?.found ? result : null;
    } catch (err) {
      console.warn("[Movies] TMDB lookup failed:", err.message);
      return null;
    }
  }

  async renderPreplay(movie, tmdb) {
    const labels = this.getPreplayLabels();
    const first = (...values) =>
      values.find(
        (value) => value !== undefined && value !== null && value !== "",
      );
    const normalizeText = (value) => String(value || "").trim();
    const toInt = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.round(n) : null;
    };
    const formatDuration = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return "";
      if (n >= 180) {
        const h = Math.floor(n / 60);
        const m = Math.round(n % 60);
        return `${h}h ${m}m`;
      }
      return `${Math.round(n)} min`;
    };
    const joinList = (value) => {
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
              return item.name || item.title || "";
            }
            return "";
          })
          .filter(Boolean)
          .join(", ");
      }
      return normalizeText(value);
    };

    const title = tmdb?.title || movie?.name || "";
    const overview = tmdb?.overview || movie?.plot || "";
    const releaseDate = tmdb?.releaseDate || movie?.releaseDate || "";
    const year =
      movie?.year || (releaseDate ? String(releaseDate).slice(0, 4) : "");
    const genres = Array.isArray(tmdb?.genres) ? tmdb.genres.join(", ") : "";
    const runtime = tmdb?.runtime ? `${tmdb.runtime} min` : "";

    const metaParts = [year, runtime, genres].filter(Boolean);
    this.preplayTitle.textContent = title;
    this.preplayMeta.textContent = metaParts.join("  |  ");
    if (this.preplayPlotTitle) {
      this.preplayPlotTitle.textContent = labels.plot;
    }
    this.preplayOverview.textContent = overview;

    if (this.preplayCast) {
      this.preplayCast.textContent = "";
      this.preplayCast.classList.add("hidden");
    }

    this.renderPeopleCards(tmdb, labels);

    this.preplayRatings.innerHTML = this.renderRatingStars(tmdb?.voteAverage);

    const resume = await this.loadMovieResumeState(movie);
    const formatClock = (seconds) => {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0)
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      return `${m}:${String(s).padStart(2, "0")}`;
    };
    if (resume && resume.progress > 0 && resume.duration > 0) {
      const percent = Math.max(
        1,
        Math.min(99, Math.round((resume.progress / resume.duration) * 100)),
      );
      this.preplayResume.textContent = `${this.tr("home.continue")} - ${percent}% (${formatClock(resume.progress)}/${formatClock(resume.duration)})`;
      this.preplayResume.classList.remove("hidden");
      this.preplayPlayBtn.textContent = this.tr("home.continue");
      this.currentPreplayResumeTime = Math.max(0, Number(resume.progress) || 0);
    } else {
      this.preplayResume.textContent = "";
      this.preplayResume.classList.add("hidden");
      this.preplayPlayBtn.textContent = this.tr("common.watch");
      this.currentPreplayResumeTime = 0;
    }

    const release = releaseDate
      ? new Date(releaseDate).toLocaleDateString(
          window.I18n?.language?.startsWith("de") ? "de-DE" : "en-US",
          { year: "numeric", month: "short", day: "numeric" },
        )
      : "";
    const runtimeMinutes = first(
      tmdb?.runtime,
      movie?.duration,
      movie?.runtime,
    );
    const runtimePretty = formatDuration(runtimeMinutes);
    const sourceName = "StreamNet TV";
    const country = joinList(first(tmdb?.countries, movie?.country));
    const budget = toInt(tmdb?.budget);
    const revenue = toInt(tmdb?.revenue);
    const popularity = Number.isFinite(tmdb?.popularity)
      ? tmdb.popularity.toFixed(1)
      : "";

    const highlights = [
      {
        label: labels.runtime,
        value: runtimePretty || labels.notAvailable,
      },
      {
        label: labels.release,
        value: release || year || labels.notAvailable,
      },
      {
        label: labels.genres,
        value: genres || labels.notAvailable,
      },
      {
        label: labels.source,
        value: sourceName,
      },
    ];

    this.preplayHighlights.innerHTML = highlights
      .map(
        (item) => `
          <div class="preplay-highlight-card">
            <span class="preplay-highlight-label">${item.label}</span>
            <span class="preplay-highlight-value" title="${item.value}">${item.value}</span>
          </div>
        `,
      )
      .join("");

    const details = [
      { label: labels.country, value: country },
      { label: labels.popularity, value: popularity },
      {
        label: labels.budget,
        value: budget ? `$${budget.toLocaleString()}` : "",
      },
      {
        label: labels.revenue,
        value: revenue ? `$${revenue.toLocaleString()}` : "",
      },
    ].filter((entry) => entry.value);

    this.preplayDetails.innerHTML = details
      .map(
        (entry) => `
          <div class="preplay-detail-item">
            <span class="preplay-detail-key">${entry.label}</span>
            <span class="preplay-detail-value">${entry.value}</span>
          </div>
        `,
      )
      .join("");
    this.preplayDetails.classList.toggle("hidden", details.length === 0);

    const similar = this.getSimilarMovies(movie, tmdb);
    if (similar.length > 0) {
      this.preplaySimilarTitle.textContent = labels.similar;
      this.preplaySimilarGrid.innerHTML = similar
        .map((item) => {
          const posterUrl = this.getProxiedImageUrl(
            item.stream_icon || item.cover || "/img/poster-placeholder.jpg",
          );
          const yearText = item.year || "";
          return `
            <button type="button" class="preplay-similar-card" data-stream-id="${item.stream_id}" data-source-id="${item.sourceId}">
              <img src="${posterUrl}" alt="${item.name || "Movie"}" loading="lazy" onerror="this.onerror=null;this.src='/img/poster-placeholder.jpg'">
              <span class="preplay-similar-name">${item.name || "Movie"}</span>
              <span class="preplay-similar-meta">${yearText}</span>
            </button>
          `;
        })
        .join("");
      this.preplaySimilarWrap.classList.remove("hidden");
      this.preplaySimilarGrid
        .querySelectorAll(".preplay-similar-card")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const streamId = String(btn.dataset.streamId || "");
            const sourceId = Number(btn.dataset.sourceId || 0);
            const target = this.movies.find(
              (m) =>
                String(m.stream_id) === streamId &&
                Number(m.sourceId) === sourceId,
            );
            if (target) {
              this.showMoviePreplay(target);
            }
          });
        });

      if (
        this.preplaySimilarRow &&
        this.preplaySimilarGrid &&
        this.preplaySimilarLeft &&
        this.preplaySimilarRight
      ) {
        const grid = this.preplaySimilarGrid;
        const leftBtn = this.preplaySimilarLeft;
        const rightBtn = this.preplaySimilarRight;
        const row = this.preplaySimilarRow;

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

        const scrollAmount = () =>
          Math.max(280, Math.floor(grid.clientWidth * 0.9));

        if (leftBtn._scrollHandler) {
          leftBtn.removeEventListener("click", leftBtn._scrollHandler);
        }
        if (rightBtn._scrollHandler) {
          rightBtn.removeEventListener("click", rightBtn._scrollHandler);
        }
        if (grid._updateScrollButtons) {
          grid.removeEventListener("scroll", grid._updateScrollButtons);
        }

        leftBtn._scrollHandler = () => {
          grid.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
        };
        rightBtn._scrollHandler = () => {
          grid.scrollBy({ left: scrollAmount(), behavior: "smooth" });
        };
        grid._updateScrollButtons = updateButtons;

        leftBtn.addEventListener("click", leftBtn._scrollHandler);
        rightBtn.addEventListener("click", rightBtn._scrollHandler);
        grid.addEventListener("scroll", grid._updateScrollButtons, {
          passive: true,
        });

        requestAnimationFrame(updateButtons);
      }
    } else {
      this.preplaySimilarGrid.innerHTML = "";
      this.preplaySimilarWrap.classList.add("hidden");
    }

    const backdropUrl =
      tmdb?.backdropUrl ||
      movie?.backdrop_path ||
      movie?.stream_icon ||
      movie?.cover ||
      "";
    const proxiedBackdropUrl = backdropUrl
      ? this.getProxiedImageUrl(backdropUrl)
      : "";
    if (proxiedBackdropUrl) {
      this.preplayHero.style.setProperty(
        "--preplay-backdrop-url",
        `url("${proxiedBackdropUrl}")`,
      );
      this.preplayScreen?.style.setProperty(
        "--preplay-page-backdrop-url",
        `url("${proxiedBackdropUrl}")`,
      );
    } else {
      this.preplayHero.style.setProperty("--preplay-backdrop-url", "none");
      this.preplayScreen?.style.setProperty(
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

    const trailerSearch = movie?.name
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.name} trailer`)}`
      : "";
    const trailerUrl =
      tmdb?.trailerUrl ||
      movie?.trailer ||
      movie?.youtube_trailer ||
      trailerSearch;
    this.preplayTrailerBtn.dataset.url = trailerUrl;
    this.preplayTrailerBtn.disabled = !trailerUrl;

    const infoSearch = movie?.name
      ? `https://www.themoviedb.org/search/movie?query=${encodeURIComponent(movie.name)}`
      : "";
    const infoUrl = tmdb?.id
      ? `https://www.themoviedb.org/movie/${tmdb.id}`
      : tmdb?.imdbId
        ? `https://www.imdb.com/title/${tmdb.imdbId}`
        : infoSearch;
    this.preplayMoreInfoBtn.dataset.url = infoUrl;
    this.preplayMoreInfoBtn.disabled = !infoUrl;

    this.updatePreplayFavoriteButton(movie);
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

  renderPeopleCards(tmdb, labels) {
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
  }

  async loadMovieResumeState(movie) {
    try {
      const rows = await API.request("GET", "/history?limit=500");
      if (!Array.isArray(rows)) return null;

      const sourceId = String(movie?.sourceId || "");
      const movieId = String(movie?.stream_id || "");
      let match = rows.find((row) => {
        const rowType = String(row?.item_type || row?.type || "").toLowerCase();
        const rowSourceId = String(row?.source_id ?? row?.data?.sourceId ?? "");
        const rowMovieId = String(row?.item_id ?? row?.id ?? "");
        return (
          rowType === "movie" &&
          rowSourceId === sourceId &&
          rowMovieId === movieId
        );
      });

      if (!match) {
        const normalizedTitle = String(movie?.name || "")
          .toLowerCase()
          .trim();

        match = rows.find((row) => {
          const rowType = String(
            row?.item_type || row?.type || "",
          ).toLowerCase();
          const rowSourceId = String(
            row?.source_id ?? row?.data?.sourceId ?? "",
          );
          const rowTitle = String(row?.data?.title || row?.name || "")
            .toLowerCase()
            .trim();
          return (
            rowType === "movie" &&
            rowSourceId === sourceId &&
            rowTitle &&
            normalizedTitle &&
            rowTitle === normalizedTitle
          );
        });
      }

      if (!match) return null;
      return {
        progress: Math.max(0, Number(match.progress) || 0),
        duration: Math.max(0, Number(match.duration) || 0),
      };
    } catch {
      return null;
    }
  }

  getSimilarMovies(movie, tmdb) {
    if (!Array.isArray(this.movies) || this.movies.length === 0) return [];

    const ownId = String(movie?.stream_id || "");
    const sourceId = Number(movie?.sourceId || 0);
    const ownCategory = String(movie?.category_id || "");
    const currentGenres = new Set(
      [
        ...(Array.isArray(tmdb?.genres) ? tmdb.genres : []),
        ...String(movie?.genre || "")
          .split(/[|,]/)
          .map((g) => g.trim())
          .filter(Boolean),
      ].map((g) => String(g).toLowerCase()),
    );

    const rank = this.movies
      .filter(
        (candidate) =>
          String(candidate.stream_id) !== ownId &&
          Number(candidate.sourceId) === sourceId,
      )
      .map((candidate) => {
        let score = 0;
        if (String(candidate.category_id || "") === ownCategory) score += 3;

        const candidateGenres = String(candidate.genre || "")
          .split(/[|,]/)
          .map((g) => g.trim().toLowerCase())
          .filter(Boolean);
        candidateGenres.forEach((genre) => {
          if (currentGenres.has(genre)) score += 2;
        });

        const yearA = Number(movie?.year) || 0;
        const yearB = Number(candidate?.year) || 0;
        if (yearA && yearB) {
          const delta = Math.abs(yearA - yearB);
          if (delta <= 1) score += 2;
          else if (delta <= 3) score += 1;
        }

        const rating = Number(candidate?.rating) || 0;
        score += Math.min(2, rating / 5);

        return { candidate, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => entry.candidate);

    return rank;
  }

  getPreplayLabels() {
    const isGerman = (window.I18n?.language || "")
      .toLowerCase()
      .startsWith("de");
    if (isGerman) {
      return {
        runtime: "Laufzeit",
        release: "Release",
        genres: "Genre",
        country: "Land",
        popularity: "Popularitat",
        budget: "Budget",
        revenue: "Einnahmen",
        source: "Quelle",
        plot: "Handlung",
        director: "Regie",
        writer: "Drehbuch",
        cast: "Cast",
        similar: "Ahnliche Filme",
        personShort: "P",
        notAvailable: "-",
      };
    }
    return {
      runtime: "Runtime",
      release: "Release",
      genres: "Genres",
      country: "Country",
      popularity: "Popularity",
      budget: "Budget",
      revenue: "Revenue",
      source: "Source",
      plot: "Plot",
      director: "Director",
      writer: "Writer",
      cast: "Cast",
      similar: "Similar Movies",
      personShort: "P",
      notAvailable: "-",
    };
  }

  updatePreplayFavoriteButton(movie) {
    if (!this.preplayFavoriteBtn || !movie) return;
    const isFav = this.favoriteIds.has(`${movie.sourceId}:${movie.stream_id}`);
    this.preplayFavoriteBtn.classList.toggle("active", isFav);
    this.preplayFavoriteBtn.innerHTML = `${isFav ? Icons.favorite : Icons.favoriteOutline}<span class="btn-label">${this.tr(isFav ? "common.removeFromFavorites" : "common.addToFavorites")}</span>`;
  }

  updateGridFavoriteButton(movie, isFav) {
    const selector = `.movie-card[data-source-id="${movie.sourceId}"][data-movie-id="${movie.stream_id}"] .favorite-btn`;
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

  async playMovie(movie, options = {}) {
    try {
      // Get stream URL for movie using the actual container extension from API
      // Xtream API returns container_extension (e.g., 'mp4', 'mkv', 'avi')
      const container = movie.container_extension || "mp4";
      const result = await API.proxy.xtream.getStreamUrl(
        movie.sourceId,
        movie.stream_id,
        "movie",
        container,
      );

      if (result && result.url) {
        // Play in dedicated Watch page
        if (this.app.pages.watch) {
          this.app.pages.watch.play(
            {
              type: "movie",
              id: movie.stream_id,
              title: movie.name,
              poster: movie.stream_icon || movie.cover,
              description: movie.plot || "",
              year: movie.year || movie.releaseDate?.substring(0, 4),
              rating: movie.rating,
              sourceId: movie.sourceId,
              categoryId: movie.category_id,
              containerExtension: container,
              resumeTime: Math.max(0, Number(options?.resumeTime) || 0),
            },
            result.url,
          );
        }
      }
    } catch (err) {
      console.error("Error playing movie:", err);
    }
  }
  async toggleFavorite(movie, btn = null) {
    const favKey = `${movie.sourceId}:${movie.stream_id}`;
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
        await API.favorites.remove(movie.sourceId, movie.stream_id, "movie");
      } else {
        this.favoriteIds.add(favKey);
        if (btn) {
          btn.classList.add("active");
          btn.title = this.tr("common.removeFromFavorites");
        }
        if (iconSpan) iconSpan.innerHTML = Icons.favorite;
        await API.favorites.add(movie.sourceId, movie.stream_id, "movie");
      }

      const nextFavState = !isFav;
      this.updateGridFavoriteButton(movie, nextFavState);
      this.updatePreplayFavoriteButton(movie);

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
      this.updatePreplayFavoriteButton(movie);
    }
  }
}

window.MoviesPage = MoviesPage;
