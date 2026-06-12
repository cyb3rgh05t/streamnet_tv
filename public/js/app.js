/**
 * StreamNet TV Application Entry Point
 */

class App {
  constructor() {
    this.currentPage = "home";
    this.pages = {};
    this.currentUser = null;
    this.allowedPages = null;

    // Initialize components
    this.player = new VideoPlayer();
    this.channelList = new ChannelList();
    this.sourceManager = new SourceManager();
    this.epgGuide = new EpgGuide();

    // Initialize page controllers
    this.pages.home = new HomePage(this);
    this.pages.live = new LivePage(this);
    this.pages.guide = new GuidePage(this);
    this.pages.movies = new MoviesPage(this);
    this.pages.series = new SeriesPage(this);
    this.pages.settings = new SettingsPage(this);
    this.pages.watch = new WatchPage(this);
    this.pages.adminDashboard = new AdminDashboardPage(this);

    this.startupOverlay = document.getElementById("app-startup-overlay");
    this.startupMessage = document.getElementById("app-startup-message");
    this.startupPercent = document.getElementById("app-startup-percent");
    this.startupProgressBar =
      this.startupOverlay?.querySelector?.(".app-startup-progress > span") ||
      null;
    this.startupHidden = false;
    this.startupCurrentPercent = 0;
    this.startupFlowTimer = null;

    this.init();
  }

  setStartupMessage(message) {
    if (!this.startupMessage) return;
    this.startupMessage.textContent =
      message || "Deine Entertainment Zentrale wird geladen";
  }

  setStartupProgress(percent, message) {
    const rawPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const safePercent = Math.max(this.startupCurrentPercent || 0, rawPercent);
    this.startupCurrentPercent = safePercent;
    if (typeof message === "string" && message) {
      this.setStartupMessage(message);
    }
    if (this.startupPercent) {
      this.startupPercent.textContent = `${Math.round(safePercent)}%`;
    }
    if (this.startupProgressBar) {
      this.startupProgressBar.style.width = `${safePercent}%`;
    }
  }

  hideStartupOverlay() {
    if (!this.startupOverlay || this.startupHidden) return;
    this.stopStartupProgressFlow();
    this.startupHidden = true;
    this.startupOverlay.classList.add("hidden");
    setTimeout(() => {
      this.startupOverlay?.remove();
    }, 260);
  }

  waitForDashboardReady(timeoutMs = 12000) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener("streamnet:dashboard-ready", onReady);
        clearTimeout(timer);
        resolve();
      };

      const onReady = () => finish();
      const timer = setTimeout(finish, timeoutMs);

      window.addEventListener("streamnet:dashboard-ready", onReady, {
        once: true,
      });
    });
  }

  startStartupProgressFlow(targetPercent = 90) {
    this.stopStartupProgressFlow();

    this.startupFlowTimer = setInterval(() => {
      if (this.startupHidden) {
        this.stopStartupProgressFlow();
        return;
      }

      const current = this.startupCurrentPercent || 0;
      if (current >= targetPercent) {
        this.stopStartupProgressFlow();
        return;
      }

      const remaining = targetPercent - current;
      const step = Math.max(0.35, Math.min(1.8, remaining * 0.12));
      this.setStartupProgress(current + step);
    }, 180);
  }

  stopStartupProgressFlow() {
    if (this.startupFlowTimer) {
      clearInterval(this.startupFlowTimer);
      this.startupFlowTimer = null;
    }
  }

  async init() {
    const onDashboardProgress = (event) => {
      const message = event?.detail?.message;
      const percent = event?.detail?.percent;
      if (Number.isFinite(percent)) {
        this.setStartupProgress(percent, message);
      } else if (message) {
        this.setStartupMessage(message);
      }
    };
    window.addEventListener(
      "streamnet:dashboard-progress",
      onDashboardProgress,
    );

    // Check authentication first
    this.setStartupProgress(8, "Authentifizierung wird geprüft...");
    await this.checkAuth();
    this.setStartupProgress(18, "Authentifizierung erfolgreich");

    if (this.currentUser?.role === "admin") {
      this.pages.home = this.pages.adminDashboard;
      this.allowedPages = new Set(["home", "settings"]);
    }

    window.I18n?.init?.();
    this.applyRoleNavigation();

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const navbarMenu = document.getElementById("navbar-menu");
    const navbar = document.querySelector(".navbar");
    const prefersCollapsedNavKey = "streamnet_nav_collapsed";
    const isDesktopOrTablet = () => window.innerWidth > 640;

    const syncSidebarToggle = () => {
      if (!sidebarToggle || !navbar) return;
      const collapsed = navbar.classList.contains("collapsed");
      sidebarToggle.classList.toggle("is-collapsed", collapsed);
      sidebarToggle.setAttribute(
        "aria-label",
        collapsed ? "Sidebar öffnen" : "Sidebar schließen",
      );
    };

    const setNavbarCollapsed = (collapsed, persist = true) => {
      if (!navbar) return;

      // Keep mobile menu behavior untouched.
      if (!isDesktopOrTablet()) {
        navbar.classList.remove("collapsed", "hover-open");
        return;
      }

      navbar.classList.toggle("collapsed", Boolean(collapsed));
      navbar.classList.remove("hover-open");

      if (persist) {
        localStorage.setItem(
          prefersCollapsedNavKey,
          collapsed ? "true" : "false",
        );
      }

      syncSidebarToggle();
    };

    if (window.innerWidth > 640) {
      setNavbarCollapsed(
        localStorage.getItem(prefersCollapsedNavKey) === "true",
        false,
      );
    } else {
      syncSidebarToggle();
    }

    window.addEventListener("resize", () => {
      if (isDesktopOrTablet()) {
        const stored = localStorage.getItem(prefersCollapsedNavKey) === "true";
        setNavbarCollapsed(stored, false);
      } else {
        navbar?.classList.remove("collapsed", "hover-open");
        syncSidebarToggle();
      }
    });

    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", (event) => {
        event.preventDefault();
        if (!isDesktopOrTablet()) return;
        const isCollapsed = navbar?.classList.contains("collapsed");
        setNavbarCollapsed(!isCollapsed);
      });
    }

    if (mobileMenuToggle && navbarMenu) {
      mobileMenuToggle.addEventListener("click", () => {
        mobileMenuToggle.classList.toggle("active");
        navbarMenu.classList.toggle("active");
      });

      // Close menu when a nav link is clicked
      document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
          mobileMenuToggle.classList.remove("active");
          navbarMenu.classList.remove("active");
        });
      });

      // Close menu when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".navbar")) {
          mobileMenuToggle.classList.remove("active");
          navbarMenu.classList.remove("active");
        }
      });
    }

    // Channel drawer toggle (mobile)
    const channelToggleBtn = document.getElementById("channel-toggle-btn");
    const channelSidebar = document.getElementById("channel-sidebar");
    const channelOverlay = document.getElementById("channel-sidebar-overlay");

    const isMobileSidebarViewport = () => window.innerWidth <= 1024;
    const homeLayout = document.querySelector(".home-layout");
    const tUi = (key, fallback) => window.I18n?.t?.(key) || fallback;

    const updateChannelToggleState = () => {
      if (!channelToggleBtn) return;

      const isMobile = isMobileSidebarViewport();
      const drawerOpen = Boolean(channelSidebar?.classList.contains("active"));
      const collapsed = Boolean(
        channelSidebar?.classList.contains("collapsed"),
      );
      const isOpen = isMobile ? drawerOpen : !collapsed;

      const label = channelToggleBtn.querySelector("span");
      if (label) {
        label.textContent = isOpen
          ? tUi("live.hideGroups", "Hide Groups")
          : tUi("live.showGroups", "Groups");
      }

      channelToggleBtn.title = isOpen
        ? tUi("live.closeGroupsSidebar", "Close groups sidebar (G)")
        : tUi("live.openGroupsSidebar", "Open groups sidebar (G)");
      channelToggleBtn.setAttribute("aria-label", channelToggleBtn.title);
      channelToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      channelToggleBtn.classList.toggle("is-open", isOpen);
    };

    const setChannelDrawerOpen = (open) => {
      if (!channelSidebar || !channelOverlay) return;
      channelSidebar.classList.toggle("active", Boolean(open));
      channelOverlay.classList.toggle("active", Boolean(open));
      updateChannelToggleState();
    };

    const setSidebarCollapsed = (collapsed, { persist = true } = {}) => {
      channelSidebar?.classList.toggle("collapsed", Boolean(collapsed));
      homeLayout?.classList.toggle("sidebar-collapsed", Boolean(collapsed));
      if (persist) {
        localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false");
      }
      updateChannelToggleState();
    };

    const toggleLiveSidebar = () => {
      if (isMobileSidebarViewport()) {
        // Ensure desktop collapsed state never hides the drawer on touch viewports.
        setSidebarCollapsed(false, { persist: false });
        setChannelDrawerOpen(!channelSidebar?.classList.contains("active"));
        return;
      }

      // Desktop sidebar is fixed-open now; do not collapse/expand via hotkey.
      setSidebarCollapsed(false, { persist: false });
    };

    if (channelToggleBtn && channelSidebar && channelOverlay) {
      channelToggleBtn.addEventListener("click", toggleLiveSidebar);
      channelOverlay.addEventListener("click", () =>
        setChannelDrawerOpen(false),
      );

      // Close drawer when selecting a channel or a group on touch viewports.
      channelSidebar.addEventListener("click", (e) => {
        if (
          isMobileSidebarViewport() &&
          e.target.closest(".channel-item, .group-header")
        ) {
          // Small delay to let the channel selection happen
          setTimeout(() => {
            setChannelDrawerOpen(false);
          }, 300);
        }
      });
    }

    const sourceSelect = document.getElementById("source-select");
    const liveCategorySelect = document.getElementById("live-category-select");
    const searchInput = document.getElementById("channel-search");
    const searchWrapper = searchInput?.closest(".search-wrapper");
    const liveSidebarHeaderRow = document.getElementById(
      "live-sidebar-header-row",
    );
    const liveSidebarControls = document.getElementById(
      "live-sidebar-controls",
    );
    const liveMobileControls = document.getElementById("live-mobile-controls");

    const syncLiveControlLayout = () => {
      if (!sourceSelect || !searchWrapper) return;

      const sourceControlNode =
        sourceSelect.closest(".custom-select") || sourceSelect;
      const groupControlNode =
        (liveCategorySelect &&
          (liveCategorySelect.closest(".custom-select") ||
            liveCategorySelect)) ||
        null;

      if (isMobileSidebarViewport()) {
        if (liveMobileControls) {
          if (!liveMobileControls.contains(sourceControlNode)) {
            liveMobileControls.appendChild(sourceControlNode);
          }
          if (
            groupControlNode &&
            !liveMobileControls.contains(groupControlNode)
          ) {
            liveMobileControls.appendChild(groupControlNode);
          }
          if (!liveMobileControls.contains(searchWrapper)) {
            liveMobileControls.appendChild(searchWrapper);
          }
        }
      } else {
        if (
          homeLayout &&
          channelToggleBtn &&
          !homeLayout.contains(channelToggleBtn)
        ) {
          homeLayout.insertBefore(
            channelToggleBtn,
            channelOverlay || homeLayout.firstChild,
          );
        }

        if (liveSidebarControls) {
          if (!liveSidebarControls.contains(sourceControlNode)) {
            liveSidebarControls.appendChild(sourceControlNode);
          }
          if (
            groupControlNode &&
            !liveSidebarControls.contains(groupControlNode)
          ) {
            liveSidebarControls.appendChild(groupControlNode);
          }
          if (!liveSidebarControls.parentElement?.contains(searchWrapper)) {
            liveSidebarControls.insertAdjacentElement(
              "afterend",
              searchWrapper,
            );
          }
        }
      }
    };

    // Default behavior: keep groups sidebar open on desktop.
    // On touch viewports the drawer remains closed until user opens it.
    setSidebarCollapsed(false, { persist: true });
    if (isMobileSidebarViewport()) {
      setChannelDrawerOpen(false);
    }
    syncLiveControlLayout();

    window.addEventListener("resize", () => {
      syncLiveControlLayout();
      if (!isMobileSidebarViewport()) {
        setChannelDrawerOpen(false);
        setSidebarCollapsed(false, { persist: false });
      } else {
        setSidebarCollapsed(false, { persist: false });
      }
      updateChannelToggleState();
    });

    document.addEventListener("keydown", (e) => {
      const target = e.target;
      const isTypingField =
        target?.closest?.("input, textarea, select") ||
        target?.isContentEditable;
      if (isTypingField) return;

      if (this.currentPage !== "live") return;

      if (
        e.key.toLowerCase() === "g" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        toggleLiveSidebar();
        return;
      }

      if (e.key === "Escape") {
        if (
          isMobileSidebarViewport() &&
          channelSidebar?.classList.contains("active")
        ) {
          setChannelDrawerOpen(false);
        }
      }
    });

    // Navigation handling
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.navigateTo(link.dataset.page);

        // On desktop, always show groups sidebar when entering LiveTV.
        if (link.dataset.page === "live" && !isMobileSidebarViewport()) {
          setSidebarCollapsed(false, { persist: true });
        }
      });
    });

    // Now Playing indicator
    const nowPlayingBtn = document.getElementById("now-playing-indicator");
    if (nowPlayingBtn) {
      nowPlayingBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.navigateTo("watch");
      });
    }

    // Search clear buttons (global handler for all)
    document.querySelectorAll(".search-clear").forEach((btn) => {
      btn.addEventListener("click", () => {
        const wrapper = btn.closest(".search-wrapper");
        const input = wrapper?.querySelector(".search-input");
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        }
      });
    });

    // Handle browser back/forward buttons
    window.addEventListener("popstate", (e) => {
      const page = e.state?.page || "home";
      this.navigateTo(page, false); // false = don't add to history
    });

    window.addEventListener("languageChanged", () => {
      window.I18n?.applyDomTranslations?.();

      if (this.currentPage === "home") {
        this.pages.home?.show?.();
      } else if (this.currentPage === "movies") {
        this.pages.movies?.filterAndRender?.();
      } else if (this.currentPage === "series") {
        this.pages.series?.filterAndRender?.();
      } else if (this.currentPage === "live") {
        this.pages.live?.renderLiveEpgPanel?.();
      }

      updateChannelToggleState();
    });

    this.setupHoverMarquee();

    // Initialize home page first
    this.setStartupProgress(32, "Dashboard wird vorbereitet...");
    await this.pages.home.init();

    if (!this.allowedPages) {
      // Preload EPG data in background (non-blocking)
      // This ensures EPG info is available on Live TV page without visiting Guide first
      this.epgGuide.loadEpg().catch((err) => {
        console.warn("Background EPG load failed:", err.message);
      });
    }

    // Navigate to the page from URL hash, or default to home
    const hash = window.location.hash.slice(1); // Remove #
    const initialPage = hash && this.pages[hash] ? hash : "home";
    this.setStartupProgress(
      initialPage === "home" ? 48 : 72,
      initialPage === "home"
        ? "Dashboard wird geladen..."
        : "Benutzeroberflaeche wird geladen...",
    );
    this.navigateTo(initialPage, true); // true = replace history (don't add)

    if (initialPage === "home") {
      this.startStartupProgressFlow(92);
      await this.waitForDashboardReady();
      this.stopStartupProgressFlow();
      this.setStartupProgress(100, "Dashboard ist bereit");
    } else {
      this.startStartupProgressFlow(90);
      this.setStartupProgress(92, "Startseite wird finalisiert...");
      await new Promise((resolve) => setTimeout(resolve, 350));
      this.stopStartupProgressFlow();
      this.setStartupProgress(100, "Fertig");
    }

    setTimeout(() => this.hideStartupOverlay(), 120);
    window.removeEventListener(
      "streamnet:dashboard-progress",
      onDashboardProgress,
    );

    console.log("StreamNet TV initialized");
  }

  setupHoverMarquee() {
    const titleSelector =
      ".movie-title, .series-title, .episode-tile-title, .card-title";
    const cardSelector =
      ".movie-card, .series-card, .episode-tile, .dashboard-card";

    const activateTitle = (titleEl) => {
      if (!titleEl) return;
      const shift = Math.max(0, titleEl.scrollWidth - titleEl.clientWidth);
      titleEl.style.setProperty("--marquee-shift", `${shift}px`);
      if (shift > 6) {
        titleEl.classList.add("is-marquee-active");
      }
    };

    const deactivateTitle = (titleEl) => {
      if (!titleEl) return;
      titleEl.classList.remove("is-marquee-active");
    };

    document.addEventListener(
      "mouseenter",
      (event) => {
        const cardEl = event.target?.closest?.(cardSelector);
        if (cardEl) {
          cardEl.querySelectorAll(titleSelector).forEach(activateTitle);
          return;
        }

        const titleEl = event.target?.closest?.(titleSelector);
        activateTitle(titleEl);
      },
      true,
    );

    document.addEventListener(
      "mouseleave",
      (event) => {
        const cardEl = event.target?.closest?.(cardSelector);
        if (cardEl) {
          cardEl.querySelectorAll(titleSelector).forEach(deactivateTitle);
          return;
        }

        const titleEl = event.target?.closest?.(titleSelector);
        deactivateTitle(titleEl);
      },
      true,
    );
  }

  async checkAuth() {
    const token = localStorage.getItem("authToken");

    if (!token) {
      // No token, redirect to login (replace to avoid back button issues)
      window.location.replace("/login.html");
      return;
    }

    try {
      // Verify token with server
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      this.currentUser = await response.json();

      // Add logout button to navbar
      this.addLogoutButton();
    } catch (err) {
      console.error("Authentication error:", err);
      localStorage.removeItem("authToken");
      window.location.replace("/login.html");
    }
  }

  applyRoleNavigation() {
    const isAdmin = this.currentUser?.role === "admin";
    const allowed = isAdmin
      ? new Set(["home", "settings"])
      : new Set(["home", "live", "guide", "movies", "series", "settings"]);

    document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
      const page = link.dataset.page;
      link.style.display = allowed.has(page) ? "" : "none";

      if (page === "home") {
        const label = link.querySelector("span:not(.nav-icon)");
        if (label) {
          label.textContent = isAdmin ? "Dashboard" : "Home";
        }
      }
    });

    const nowPlaying = document.getElementById("now-playing-indicator");
    if (nowPlaying) {
      nowPlaying.style.display = isAdmin ? "none" : "";
    }
  }

  addLogoutButton() {
    const navbar = document.querySelector(".navbar-menu");
    if (!navbar || document.getElementById("logout-btn")) return;

    const logoutLink = document.createElement("a");
    logoutLink.href = "#";
    logoutLink.className = "nav-link";
    logoutLink.id = "logout-btn";
    logoutLink.innerHTML = `
            <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg></span>
            <span>Logout</span>
        `;

    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();

      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      localStorage.removeItem("authToken");
      window.location.replace("/login.html");
    });

    navbar.appendChild(logoutLink);
  }

  navigateTo(pageName, replaceHistory = false) {
    if (this.allowedPages && !this.allowedPages.has(pageName)) {
      pageName = "home";
    }

    // Don't navigate if already on this page
    if (this.currentPage === pageName && !replaceHistory) {
      return;
    }

    // Update browser history
    if (replaceHistory) {
      // Replace current history entry (used on initial load)
      history.replaceState({ page: pageName }, "", `#${pageName}`);
    } else {
      // Add new history entry
      history.pushState({ page: pageName }, "", `#${pageName}`);
    }

    // Update nav
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageName);
    });

    // Update pages
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === `page-${pageName}`);
    });

    // Notify page controllers
    if (this.pages[this.currentPage]?.hide) {
      this.pages[this.currentPage].hide();
    }

    // Stop active playback when switching tabs/pages.
    if (this.currentPage === "live" && pageName !== "live") {
      this.player?.stop?.();
    }
    if (this.currentPage === "watch" && pageName !== "watch") {
      this.pages.watch?.stop?.();
    }

    this.currentPage = pageName;

    if (this.pages[pageName]?.show) {
      this.pages[pageName].show();
    }

    window.I18n?.applyDomTranslations?.();
  }
}

// Start app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();

  // Fetch and display version badge
  fetch("/api/version")
    .then((res) => res.json())
    .then((data) => {
      const badge = document.getElementById("version-badge");
      if (badge && data.version) badge.textContent = `v${data.version}`;
    })
    .catch(() => {});
});
