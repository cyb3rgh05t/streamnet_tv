/**
 * NativePlayer – LibVLC embedded player for Tauri Desktop (Windows).
 *
 * How it works:
 *  1. Rust creates a borderless Win32 popup window (the "overlay").
 *  2. JS positions the overlay exactly over the <video> element on screen.
 *  3. Server spawns VLC with --drawable-hwnd <HWND> so VLC renders into it.
 *  4. JS keeps the overlay in sync when the window moves/resizes.
 *  5. On stop/navigate-away the overlay is hidden or destroyed.
 *
 * In the regular web / Docker container build this module does nothing
 * (isSupported === false). VideoPlayer.js falls back to HLS.js as usual.
 */

class NativePlayer {
  constructor() {
    /** @type {boolean} True only when running inside the Tauri desktop shell */
    this.isSupported = !!(
      typeof window !== "undefined" &&
      window.__TAURI__ &&
      window.__TAURI__.core
    );

    /** HWND of the Win32 overlay window as a string */
    this.hwnd = null;
    /** Currently playing URL */
    this.currentUrl = null;
    /** ResizeObserver watching the placeholder element */
    this._resizeObserver = null;
    /** Bound resize handler */
    this._onResize = this._syncPosition.bind(this);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Play a stream by embedding VLC into the native overlay.
   * @param {string} url  Direct stream URL (no proxy/transcode)
   * @param {string} title  Display title for VLC
   * @param {HTMLElement} videoEl  The <video> placeholder element to cover
   * @returns {Promise<boolean>} true on success
   */
  async play(url, title, videoEl) {
    if (!this.isSupported) return false;

    this.currentUrl = url;

    try {
      // 1. Sync (or create) the Win32 overlay to the video element bounds
      const hwnd = await this._syncPosition(videoEl);
      if (!hwnd) return false;
      this.hwnd = hwnd;

      // 2. Tell VLC to render into that HWND
      const resp = await API.request("POST", "/vlc/launch", {
        url,
        title: title || "StreamNet TV",
        hwnd: this.hwnd,
      });

      if (!resp?.ok) {
        console.warn("[NativePlayer] VLC launch failed:", resp?.error);
        this._showToast(
          resp?.error || "VLC konnte nicht gestartet werden.",
          "error",
        );
        return false;
      }

      // 3. Show the overlay (already visible after create, but ensure it)
      await this._invoke("vlc_show_window");

      // 4. Keep overlay in sync on window/content resize
      this._attachResizeListeners(videoEl);

      console.log("[NativePlayer] Playing embedded:", url);
      return true;
    } catch (err) {
      const hint =
        err?.message?.includes("not found") || err?.message?.includes("404")
          ? "VLC nicht gefunden – bitte installieren: videolan.org/vlc"
          : err.message;
      this._showToast(hint, "error");
      console.error("[NativePlayer] play() error:", err);
      return false;
    }
  }

  /** Hide the overlay (pause-like, VLC keeps running). */
  async hide() {
    if (!this.isSupported || !this.hwnd) return;
    await this._invoke("vlc_hide_window");
  }

  /** Show the overlay again. */
  async show() {
    if (!this.isSupported || !this.hwnd) return;
    await this._invoke("vlc_show_window");
  }

  /**
   * Stop playback and destroy the native overlay window.
   * Call this when navigating away from the player page.
   */
  async stop() {
    if (!this.isSupported) return;
    this._detachResizeListeners();
    await this._invoke("vlc_destroy_window");
    this.hwnd = null;
    this.currentUrl = null;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Sync the Win32 overlay to the current bounding rect of videoEl.
   * Creates the window on first call, moves it on subsequent calls.
   * @returns {Promise<string|null>} HWND string or null on failure
   */
  async _syncPosition(videoEl) {
    if (!videoEl) videoEl = document.getElementById("video-player");
    if (!videoEl) return null;

    const rect = videoEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    try {
      const hwnd = await this._invoke("vlc_sync_window", {
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        dpr,
      });
      return hwnd || null;
    } catch (err) {
      console.error("[NativePlayer] vlc_sync_window failed:", err);
      return null;
    }
  }

  _attachResizeListeners(videoEl) {
    this._detachResizeListeners();

    window.addEventListener("resize", this._onResize);

    if (videoEl && typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() =>
        this._syncPosition(videoEl),
      );
      this._resizeObserver.observe(videoEl);
    }

    // Hide overlay when main window is minimized, show on restore
    document.addEventListener(
      "visibilitychange",
      this._onVisibility.bind(this),
    );
  }

  _detachResizeListeners() {
    window.removeEventListener("resize", this._onResize);
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  _onVisibility() {
    if (document.hidden) {
      this.hide();
    } else {
      this._syncPosition().then(() => this.show());
    }
  }

  /** Thin wrapper around Tauri IPC invoke */
  _invoke(cmd, args = {}) {
    return window.__TAURI__.core.invoke(cmd, args);
  }

  /** Small toast – shared with VideoPlayer / WatchPage style */
  _showToast(message, type = "info") {
    let toast = document.getElementById("vlc-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "vlc-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `vlc-toast vlc-toast--${type} vlc-toast--show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(
      () => toast.classList.remove("vlc-toast--show"),
      3500,
    );
  }
}

// Singleton – consumed by VideoPlayer.js and WatchPage.js
window.NativePlayer = new NativePlayer();
