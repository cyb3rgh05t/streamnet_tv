/**
 * Watch Page Controller
 * Handles VOD (Movies/Series) playback with streaming service-style UI
 */

class WatchPage {
  constructor(app) {
    this.app = app;

    // Video elements
    this.video = document.getElementById("watch-video");
    this.overlay = document.getElementById("watch-overlay");
    this.watchPageEl = document.getElementById("page-watch");

    // iOS: ensure inline playback (not fullscreen by default)
    if (this.video) {
      this.video.setAttribute("playsinline", "");
      this.video.setAttribute("webkit-playsinline", "");
    }

    // Top bar
    this.backBtn = document.getElementById("watch-back-btn");
    this.titleEl = document.getElementById("watch-title");
    this.subtitleEl = document.getElementById("watch-subtitle");

    // Controls
    this.centerPlayBtn = document.getElementById("watch-center-play");
    this.playPauseBtn = document.getElementById("watch-play-pause");
    this.skipBackBtn = document.getElementById("watch-skip-back");
    this.skipFwdBtn = document.getElementById("watch-skip-fwd");
    this.muteBtn = document.getElementById("watch-mute");
    this.volumeSlider = document.getElementById("watch-volume");
    this.fullscreenBtn = document.getElementById("watch-fullscreen");
    this.progressSlider = document.getElementById("watch-progress");
    this.timeCurrent = document.getElementById("watch-time-current");
    this.timeTotal = document.getElementById("watch-time-total");
    this.loadingSpinner = document.getElementById("watch-loading");
    this.seekingOverlay = document.getElementById("watch-seeking-overlay");
    this.seekingText = document.getElementById("watch-seeking-text");

    // Next episode
    this.nextEpisodePanel = document.getElementById("watch-next-episode");
    this.nextEpisodeTitle = document.getElementById("next-episode-title");
    this.nextCountdown = document.getElementById("next-countdown");
    this.nextPlayNowBtn = document.getElementById("next-play-now");
    this.nextCancelBtn = document.getElementById("next-cancel");

    // Captions
    this.captionsBtn = document.getElementById("watch-captions-btn");
    this.captionsMenu = document.getElementById("watch-captions-menu");
    this.captionsList = document.getElementById("watch-captions-list");

    // Transcode Status
    this.transcodeStatusEx = document.getElementById("watch-transcode-status");
    this.qualityBadgeEl = document.getElementById("watch-quality-badge");

    // State
    this.hls = null;
    this.content = null;
    this.contentType = null; // 'movie' or 'series'
    this.seriesInfo = null;
    this.currentSeason = null;
    this.currentEpisode = null;
    this.returnPage = null;
    this.captionsMenuOpen = false;

    // Overlay timer
    this.overlayTimeout = null;
    this.overlayVisible = true;

    // Next episode
    this.nextEpisodeTimeout = null;
    this.nextEpisodeCountdown = 10;
    this.nextEpisodeInterval = null;
    this.nextEpisodeShowing = false;
    this.nextEpisodeDismissed = false;

    // Watch history
    this.historyInterval = null;
    this.isScrubbing = false;
    this.isStopping = false;
    this.knownDuration = 0;
    this.playbackStartOffset = 0;
    this.isSeekRestarting = false;
    this.lastSeekCommit = { value: null, at: 0 };
    this.lastMediaRecoveryAt = 0;
    this.seekingReasons = new Set();
    this.seekingReasonTimers = new Map();
    this.currentPlaybackMode = "unknown";

    this.init();
  }

  init() {
    // iOS Safari: detect and compensate for floating bottom toolbar
    const updateIosUiBottom = () => {
      let uiBottom = 0;
      if (window.visualViewport) {
        const vv = window.visualViewport;
        uiBottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      }
      document.documentElement.style.setProperty(
        "--ios-ui-bottom",
        uiBottom + "px",
      );
    };

    updateIosUiBottom();

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateIosUiBottom);
      window.visualViewport.addEventListener("scroll", updateIosUiBottom);
    } else {
      window.addEventListener("resize", updateIosUiBottom);
    }

    // iOS: use custom --vh unit to avoid 100vh issues with dynamic toolbar
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    const watchVideoSection = document.querySelector(".watch-video-section");
    if (isIOS && watchVideoSection) {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      watchVideoSection.style.height = "calc(var(--vh) * 100)";
    }

    // Apply safe area + iOS toolbar padding to overlay
    if (this.overlay) {
      this.overlay.style.paddingBottom =
        "calc(env(safe-area-inset-bottom, 0px) + var(--ios-ui-bottom, 0px) + 12px)";
    }

    // Back button
    this.backBtn?.addEventListener("click", () => this.goBack());

    // Play/Pause
    this.centerPlayBtn?.addEventListener("click", () => this.togglePlay());
    this.playPauseBtn?.addEventListener("click", () => this.togglePlay());
    this.video?.addEventListener("click", () => this.togglePlay());

    // Skip buttons
    this.skipBackBtn?.addEventListener("click", () => this.skip(-10));
    this.skipFwdBtn?.addEventListener("click", () => this.skip(10));

    // Volume
    this.muteBtn?.addEventListener("click", () => this.toggleMute());
    this.volumeSlider?.addEventListener("input", (e) =>
      this.setVolume(e.target.value),
    );

    // Fullscreen
    this.fullscreenBtn?.addEventListener("click", () =>
      this.toggleFullscreen(),
    );

    // Picture-in-Picture
    const pipBtn = document.getElementById("watch-pip");
    pipBtn?.addEventListener("click", () => this.togglePictureInPicture());

    // Overflow Menu
    const overflowBtn = document.getElementById("watch-overflow");
    const overflowMenu = document.getElementById("watch-overflow-menu");

    overflowBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      overflowMenu?.classList.toggle("hidden");
    });

    // Copy Stream URL
    const copyUrlBtn = document.getElementById("watch-copy-url");
    copyUrlBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.copyStreamUrl();
      overflowMenu?.classList.add("hidden");
    });

    // Close overflow menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        overflowMenu &&
        !overflowMenu.classList.contains("hidden") &&
        !overflowMenu.contains(e.target) &&
        e.target !== overflowBtn
      ) {
        overflowMenu.classList.add("hidden");
      }
    });

    // Progress bar
    this.progressSlider?.addEventListener("pointerdown", () => {
      this.isScrubbing = true;
    });
    this.progressSlider?.addEventListener("touchstart", () => {
      this.isScrubbing = true;
    });
    this.progressSlider?.addEventListener("input", (e) => {
      const percent = Number(e.target.value);
      const duration = this.getSeekableDuration();
      if (duration > 0 && this.timeCurrent) {
        this.timeCurrent.textContent = this.formatTime(
          (percent / 100) * duration,
        );
      }
    });
    this.progressSlider?.addEventListener("change", (e) => {
      this.commitSeek(e.target.value);
      this.isScrubbing = false;
    });
    this.progressSlider?.addEventListener("pointerup", (e) => {
      this.commitSeek(e.target.value);
      this.isScrubbing = false;
    });

    // Video events
    this.video?.addEventListener("timeupdate", () => this.updateProgress());
    this.video?.addEventListener("loadedmetadata", () =>
      this.onMetadataLoaded(),
    );
    this.video?.addEventListener("play", () => this.onPlay());
    this.video?.addEventListener("pause", () => this.onPause());
    this.video?.addEventListener("ended", () => this.onEnded());
    this.video?.addEventListener("error", (e) => this.onError(e));
    this.video?.addEventListener("waiting", () => this.showLoading());
    this.video?.addEventListener("canplay", () => {
      this.hideLoading();
      this.endSeekingState("user-seek");
      this.endSeekingState("session-restart");
    });
    this.video?.addEventListener("seeking", () => {
      if (!this.isStopping) {
        this.startSeekingState("user-seek", 10000);
      }
    });
    this.video?.addEventListener("seeked", () => {
      this.endSeekingState("user-seek");
    });
    this.video?.addEventListener("durationchange", () =>
      this.onMetadataLoaded(),
    );

    // Overlay auto-hide + click to toggle play
    const watchSection = document.querySelector(".watch-video-section");
    watchSection?.addEventListener("mousemove", () => this.showOverlay());
    watchSection?.addEventListener("touchstart", () => this.showOverlay());
    watchSection?.addEventListener("click", (e) => {
      this.showOverlay();
      // Only toggle play if clicking on video area (not controls)
      if (
        e.target === this.video ||
        e.target === watchSection ||
        e.target.classList.contains("watch-overlay") ||
        e.target === this.overlay
      ) {
        this.togglePlay();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));

    // Next episode buttons
    this.nextPlayNowBtn?.addEventListener("click", () =>
      this.playNextEpisode(),
    );
    this.nextCancelBtn?.addEventListener("click", () =>
      this.cancelNextEpisode(),
    );

    // Captions toggle
    this.captionsBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleCaptionsMenu();
    });

    // Close captions menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        this.captionsMenuOpen &&
        !this.captionsMenu?.contains(e.target) &&
        e.target !== this.captionsBtn
      ) {
        this.closeCaptionsMenu();
      }
    });
  }

  /**
   * Main entry point - play content
   * @param {Object} content - Movie or episode info
   * @param {string} streamUrl - Stream URL
   */
  async play(content, streamUrl) {
    this.content = content;
    this.contentType = content.type;
    this.seriesInfo = content.seriesInfo || null;
    this.currentSeason = content.currentSeason || null;
    this.currentEpisode = content.currentEpisode || null;
    this.resumeTime = content.resumeTime || 0;
    this.containerExtension = content.containerExtension || "mp4";
    this.returnPage = content.type === "movie" ? "movies" : "series";
    this.knownDuration = this.parseDurationToSeconds(content);

    // Stop any Live TV playback before starting movie/series
    this.app?.player?.stop?.();

    // Reset state
    this.cancelNextEpisode();
    this.nextEpisodeDismissed = false;

    // Navigate to watch page
    this.app.navigateTo("watch", true);

    // Scroll to top
    this.watchPageEl?.scrollTo(0, 0);

    // Update title bar
    this.titleEl.textContent = content.title || "";
    this.subtitleEl.textContent = content.subtitle || "";

    // Load video
    await this.loadVideo(streamUrl);

    // Show Now Playing indicator in navbar
    this.showNowPlaying(content.title);

    // Show overlay initially
    this.showOverlay();

    // Start watch history tracking
    this.logSessionStart();
    this.startHistoryTracking();
  }

  async logSessionStart() {
    if (!this.content) return;

    try {
      const playbackMode = this.normalizePlaybackMode(this.currentPlaybackMode);
      await window.API.request("POST", "/history", {
        id: this.content.id,
        type: this.content.type === "movie" ? "movie" : "episode",
        sourceId: this.content.sourceId,
        progress: 0,
        duration: 0,
        eventType: "session_start",
        playbackMode,
        data: {
          title: this.content.title || "Unknown Title",
          subtitle:
            this.content.subtitle ||
            (this.content.type === "movie" ? "Movie" : "Series"),
          poster: this.content.poster,
          sourceId: this.content.sourceId,
          seriesId: this.content.seriesId || null,
          playbackMode,
        },
      });
    } catch (err) {
      console.warn("[History] Failed to log session start:", err);
    }
  }

  /**
   * Show Now Playing indicator in navbar
   */
  showNowPlaying(title) {
    const indicator = document.getElementById("now-playing-indicator");
    const textEl = document.getElementById("now-playing-text");
    if (indicator && textEl) {
      textEl.textContent = title || "Now Playing";
      indicator.classList.remove("hidden");
    }
  }

  /**
   * Hide Now Playing indicator in navbar
   */
  hideNowPlaying() {
    const indicator = document.getElementById("now-playing-indicator");
    if (indicator) {
      indicator.classList.add("hidden");
    }
  }

  /**
   * Start a HLS transcode session
   */
  async startTranscodeSession(url, options = {}) {
    console.log("[WatchPage] Starting HLS transcode session...", options);
    const session = await API.request("POST", "/transcode/session", {
      url,
      seekOffset: this.resumeTime, // Pass resume point to backend
      ...options,
    });
    this.currentSessionId = session.sessionId;
    return session.playlistUrl;
  }

  async startTranscodeSessionWithFallback(url, options = {}) {
    const requestedSeekOffset = Math.max(0, Number(options.seekOffset) || 0);
    try {
      const playlistUrl = await this.startTranscodeSession(url, options);
      return { playlistUrl, appliedSeekOffset: requestedSeekOffset };
    } catch (err) {
      console.error("[WatchPage] Session start failed:", err);

      // Copy mode can fail around keyframes/start offsets. Retry once with encode mode.
      if (options.videoMode === "copy") {
        try {
          console.warn(
            "[WatchPage] Retrying transcode session with encode mode...",
          );
          const playlistUrl = await this.startTranscodeSession(url, {
            ...options,
            videoMode: "encode",
          });
          return { playlistUrl, appliedSeekOffset: requestedSeekOffset };
        } catch (retryErr) {
          console.error("[WatchPage] Encode retry failed:", retryErr);
        }
      }

      // Last fallback for resume edge-cases: start from 0 to at least keep playback alive.
      const seekOffset = Number(options.seekOffset) || 0;
      if (seekOffset > 0) {
        try {
          console.warn(
            "[WatchPage] Retrying transcode session without seek offset (copy mode)...",
          );
          const playlistUrl = await this.startTranscodeSession(url, {
            ...options,
            videoMode: "copy",
            seekOffset: 0,
          });
          return { playlistUrl, appliedSeekOffset: 0 };
        } catch (retryNoSeekCopyErr) {
          console.error(
            "[WatchPage] No-seek copy retry failed:",
            retryNoSeekCopyErr,
          );
        }

        try {
          console.warn(
            "[WatchPage] Retrying transcode session without seek offset...",
          );
          const playlistUrl = await this.startTranscodeSession(url, {
            ...options,
            videoMode: "encode",
            seekOffset: 0,
          });
          return { playlistUrl, appliedSeekOffset: 0 };
        } catch (retryNoSeekErr) {
          console.error("[WatchPage] No-seek retry failed:", retryNoSeekErr);
        }
      }

      throw err;
    }
  }

  /**
   * Stop and cleanup current transcode session
   */
  async stopTranscodeSession() {
    if (this.currentSessionId) {
      console.log(
        "[WatchPage] Stopping transcode session:",
        this.currentSessionId,
      );
      try {
        // Fire and forget cleanup
        API.request("DELETE", `/transcode/${this.currentSessionId}`).catch(
          () => {},
        );
      } catch (err) {
        console.error("Failed to stop session:", err);
      }
      this.currentSessionId = null;
    }
  }

  async updateTranscodeStatus(mode, text) {
    if (!this.transcodeStatusEx) return;

    this.transcodeStatusEx.className = "transcode-status"; // Reset classes

    if (mode === "hidden") {
      this.transcodeStatusEx.classList.add("hidden");
      return;
    }

    this.transcodeStatusEx.textContent = text || mode;
    this.transcodeStatusEx.classList.add(mode);

    // Ensure it's visible
    this.transcodeStatusEx.classList.remove("hidden");
  }

  normalizePlaybackMode(mode) {
    const value = String(mode || "").toLowerCase();
    if (value.includes("direct")) return "direct";
    if (value.includes("remux")) return "remux";
    if (value.includes("upscal")) return "upscaling";
    if (value.includes("audio")) return "audioTranscode";
    if (value.includes("video") || value.includes("transcod")) {
      return "videoTranscode";
    }
    return "unknown";
  }

  setPlaybackMode(mode) {
    this.currentPlaybackMode = this.normalizePlaybackMode(mode);
  }

  /**
   * Get quality label from video height
   */
  getQualityLabel(height) {
    if (height >= 2160) return "4K";
    if (height >= 1440) return "1440p";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    if (height > 0) return `${height}p`;
    return null;
  }

  /**
   * Update quality badge display
   */
  updateQualityBadge() {
    if (!this.qualityBadgeEl) return;

    if (this.currentStreamInfo?.height > 0) {
      this.qualityBadgeEl.textContent = this.getQualityLabel(
        this.currentStreamInfo.height,
      );
      this.qualityBadgeEl.classList.remove("hidden");
    } else {
      this.qualityBadgeEl.classList.add("hidden");
    }
  }

  async loadVideo(url) {
    // Store the URL for copy functionality
    this.currentUrl = url;
    this.playbackStartOffset = 0;
    this.setPlaybackMode("unknown");

    // Stop any existing playback
    this.stop();

    // Show loading spinner
    this.showLoading();
    this.endSeekingState();

    // Get settings for proxy/transcode
    let settings = {};
    try {
      settings = await API.settings.get();
    } catch (e) {
      console.warn("Could not load settings");
    }

    // Detect stream type
    const looksLikeHls = url.includes(".m3u8") || url.includes("m3u8");
    const isRawTs = url.includes(".ts") && !url.includes(".m3u8");
    const isDirectVideo =
      url.includes(".mp4") || url.includes(".mkv") || url.includes(".avi");
    const getFastSeekSessionOptions = (offset) =>
      Number(offset) > 0
        ? {
            hlsTime: 2,
            probeSize: 1500000,
            analyzeDuration: 1500000,
          }
        : {};

    // Priority 0: Auto Transcode (Smart) - probe first, then decide
    if (settings.autoTranscode) {
      console.log("[WatchPage] Auto Transcode enabled. Probing stream...");
      try {
        const ua =
          settings.userAgentPreset === "custom"
            ? settings.userAgentCustom
            : settings.userAgentPreset;
        const info = await API.request(
          "GET",
          `/probe?url=${encodeURIComponent(url)}&ua=${encodeURIComponent(ua || "")}`,
        );
        console.log(
          `[WatchPage] Probe result: video=${info.video}, audio=${info.audio}, ${info.width}x${info.height}, compatible=${info.compatible}`,
        );

        if (Number.isFinite(info.duration) && info.duration > 0) {
          this.knownDuration = Math.max(this.knownDuration || 0, info.duration);
        }

        // Store early probe info for quality display
        this.currentStreamInfo = info;
        this.updateQualityBadge();

        if (info.needsTranscode || settings.upscaleEnabled) {
          console.log(
            `[WatchPage] Auto: Using HLS transcode session (${settings.upscaleEnabled ? "Upscaling" : "Incompatible audio/video"})`,
          );

          // Heuristic: If video is h264/compat, copy video. Usage: Audio fix.
          // BUT: If upscaling is enabled, we MUST encode.
          const resumeOffset = Math.max(0, Number(this.resumeTime) || 0);
          const audioCodec = String(info.audio || "").toLowerCase();
          const audioChannels = Number(info.audioChannels) || 0;
          const requiresStrictEncode =
            audioCodec.includes("ac3") ||
            audioCodec.includes("eac3") ||
            audioCodec.includes("dts") ||
            audioChannels > 2;
          const videoMode =
            info.video &&
            info.video.includes("h264") &&
            !settings.upscaleEnabled &&
            !requiresStrictEncode &&
            resumeOffset <= 0
              ? "copy"
              : "encode";
          const statusText =
            videoMode === "copy"
              ? "Transcoding (Audio)"
              : settings.upscaleEnabled
                ? "Upscaling"
                : "Transcoding (Video)";
          const statusMode = settings.upscaleEnabled
            ? "upscaling"
            : "transcoding";

          this.setPlaybackMode(
            settings.upscaleEnabled
              ? "upscaling"
              : videoMode === "copy"
                ? "audioTranscode"
                : "videoTranscode",
          );

          this.updateTranscodeStatus(statusMode, statusText);
          const sessionStart = await this.startTranscodeSessionWithFallback(
            url,
            {
              videoMode,
              seekOffset: resumeOffset,
              videoCodec: info.video,
              videoHeight: info.height,
              audioCodec: info.audio,
              audioChannels: info.audioChannels,
              ...getFastSeekSessionOptions(resumeOffset),
            },
          );
          const playlistUrl = sessionStart.playlistUrl;

          if (this.currentSessionId && sessionStart.appliedSeekOffset > 0) {
            this.playbackStartOffset = sessionStart.appliedSeekOffset;
            this.resumeTime = 0;
          }

          this.playHls(playlistUrl);
          this.setVolumeFromStorage();
          return;
        } else if (info.needsRemux) {
          // Remux (container swap) currently doesn't use session logic, uses direct stream
          // TODO: Move remux to session logic if seeking is needed for TS files
          console.log("[WatchPage] Auto: Using remux (.ts container)");
          this.setPlaybackMode("remux");
          this.updateTranscodeStatus("remuxing", "Remux (Auto)");
          const finalUrl = `/api/remux?url=${encodeURIComponent(url)}`;
          this.video.src = finalUrl;
          this.video.play().catch((e) => {
            if (e.name !== "AbortError")
              console.error("[WatchPage] Autoplay error:", e);
          });
          this.setVolumeFromStorage();
          return;
        }
        // Compatible - fall through to normal playback
        console.log("[WatchPage] Auto: Using normal playback (compatible)");
      } catch (err) {
        console.warn(
          "[WatchPage] Probe failed, using normal playback:",
          err.message,
        );
        // Continue with normal playback on probe failure
      }
    }

    // Priority 1: Force Video Transcode (Full) or Upscaling
    if (settings.forceVideoTranscode || settings.upscaleEnabled) {
      const statusText = settings.upscaleEnabled
        ? "Upscaling"
        : "Transcoding (Video)";
      const statusMode = settings.upscaleEnabled ? "upscaling" : "transcoding";
      console.log(
        `[WatchPage] ${statusText} enabled. Starting session (encode)...`,
      );
      this.setPlaybackMode(
        settings.upscaleEnabled ? "upscaling" : "videoTranscode",
      );
      this.updateTranscodeStatus(statusMode, statusText);
      const resumeOffset = Math.max(0, Number(this.resumeTime) || 0);
      const sessionStart = await this.startTranscodeSessionWithFallback(url, {
        videoMode: "encode",
        seekOffset: resumeOffset,
        ...getFastSeekSessionOptions(resumeOffset),
      });
      const playlistUrl = sessionStart.playlistUrl;
      if (this.currentSessionId && sessionStart.appliedSeekOffset > 0) {
        this.playbackStartOffset = sessionStart.appliedSeekOffset;
        this.resumeTime = 0;
      }
      this.playHls(playlistUrl);
      this.setVolumeFromStorage();
      return;
    }

    if (settings.forceTranscode) {
      console.log(
        "[WatchPage] Force Audio Transcode enabled. Starting session (copy)...",
      );
      this.setPlaybackMode("audioTranscode");
      this.updateTranscodeStatus("transcoding", "Transcoding (Audio)");

      // Probe to get video codec for HEVC tag handling
      let videoCodec = "unknown";
      let videoHeight = 0;
      try {
        const ua =
          settings.userAgentPreset === "custom"
            ? settings.userAgentCustom
            : settings.userAgentPreset;
        const info = await API.request(
          "GET",
          `/probe?url=${encodeURIComponent(url)}&ua=${encodeURIComponent(ua || "")}`,
        );
        videoCodec = info.video;
        videoHeight = Number(info.height) || 0;
      } catch (e) {
        console.warn("Probe failed for force audio, assuming h264");
      }

      const resumeOffset = Math.max(0, Number(this.resumeTime) || 0);
      const sessionStart = await this.startTranscodeSessionWithFallback(url, {
        videoMode: "copy",
        videoCodec,
        videoHeight,
        seekOffset: resumeOffset,
        ...getFastSeekSessionOptions(resumeOffset),
      });
      const playlistUrl = sessionStart.playlistUrl;
      if (this.currentSessionId && sessionStart.appliedSeekOffset > 0) {
        this.playbackStartOffset = sessionStart.appliedSeekOffset;
        this.resumeTime = 0;
      }
      this.playHls(playlistUrl);
      this.setVolumeFromStorage();
      return;
    }

    // Priority 2: Force Remux for raw TS streams
    if (settings.forceRemux && isRawTs) {
      console.log("[WatchPage] Force Remux enabled");
      this.setPlaybackMode("remux");
      this.updateTranscodeStatus("remuxing", "Remux (Force)");
      const finalUrl = `/api/remux?url=${encodeURIComponent(url)}`;
      this.video.src = finalUrl;
      this.video.play().catch((e) => {
        if (e.name !== "AbortError")
          console.error("[WatchPage] Autoplay error:", e);
      });
      this.setVolumeFromStorage();
      return;
    }

    // Determine if proxy is needed
    const proxyRequiredDomains = ["pluto.tv"];
    const needsProxy =
      settings.forceProxy ||
      proxyRequiredDomains.some((domain) => url.includes(domain));
    const finalUrl = needsProxy
      ? `/api/proxy/stream?url=${encodeURIComponent(url)}`
      : url;

    console.log("[WatchPage] Playing:", { url, needsProxy, looksLikeHls });

    // Use HLS.js for HLS streams
    if (looksLikeHls && Hls.isSupported()) {
      this.setPlaybackMode("direct");
      this.updateTranscodeStatus("direct", "Direct HLS");
      this.playHls(finalUrl);
    } else {
      // Direct playback for mp4/mkv/avi
      this.setPlaybackMode("direct");
      this.updateTranscodeStatus("direct", "Direct Play");
      this.video.src = finalUrl;
      this.video.play().catch((e) => {
        if (e.name !== "AbortError")
          console.error("[WatchPage] Autoplay error:", e);
      });
    }

    this.setVolumeFromStorage();
  }

  /**
   * Play HLS stream using Hls.js
   */
  playHls(url) {
    if (this.hls) {
      this.hls.destroy();
    }

    const isProtectedApiUrl = (rawUrl) => {
      if (typeof rawUrl !== "string" || rawUrl.length === 0) return false;
      try {
        const parsed = new URL(rawUrl, window.location.origin);
        return parsed.pathname.startsWith("/api/");
      } catch {
        return rawUrl.startsWith("/api/");
      }
    };

    this.hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      startLevel: -1,
      enableWorker: true,
      // Protected /api/* playlists and segments need JWT authorization.
      xhrSetup: (xhr, srcUrl) => {
        const token = localStorage.getItem("authToken");
        if (token && isProtectedApiUrl(srcUrl)) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
      },
    });

    this.hls.loadSource(url);
    this.hls.attachMedia(this.video);

    // Listen for subtitle track updates
    this.hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
      console.log("[WatchPage] Subtitle tracks updated:", data.subtitleTracks);
      // Wait a moment for native text tracks to populate
      setTimeout(() => this.updateCaptionsTracks(), 100);
    });

    this.hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (event, data) => {
      console.log("[WatchPage] Subtitle track switched:", data);
    });

    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      this.video.play().catch((e) => {
        if (e.name !== "AbortError")
          console.error("[WatchPage] Autoplay error:", e);
      });
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error("[WatchPage] HLS fatal error:", data);

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          const now = Date.now();
          if (now - this.lastMediaRecoveryAt > 3000) {
            this.lastMediaRecoveryAt = now;
            console.warn("[WatchPage] Attempting media error recovery...");
            try {
              this.hls.recoverMediaError();
              return;
            } catch (recoverErr) {
              console.warn(
                "[WatchPage] Media recovery failed:",
                recoverErr?.message || recoverErr,
              );
            }
          }
        }

        // Try proxy on CORS error (only if not already proxied/transcoded)
        // Note: Transcoded streams are local, so no CORS issues usually
        if (
          !isProtectedApiUrl(url) &&
          data.type === Hls.ErrorTypes.NETWORK_ERROR
        ) {
          console.log("[WatchPage] Retrying via proxy...");
          this.playHls(
            `/api/proxy/stream?url=${encodeURIComponent(this.currentUrl)}`,
          );
        } else {
          this.hls.destroy();
        }
      }
    });
  }

  setVolumeFromStorage() {
    const savedVolume = localStorage.getItem("nodecast-volume") || "80";
    this.video.volume = parseInt(savedVolume) / 100;
    if (this.volumeSlider) this.volumeSlider.value = savedVolume;
  }

  stop() {
    // Stop history tracking and save final progress
    this.stopHistoryTracking();
    this.saveProgress();
    this.endSeekingState();

    // Cleanup transcode session if exists
    this.stopTranscodeSession();
    this.updateTranscodeStatus("hidden");

    // Hide quality badge
    this.currentStreamInfo = null;
    this.playbackStartOffset = 0;
    if (this.qualityBadgeEl) {
      this.qualityBadgeEl.classList.add("hidden");
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.video) {
      this.isStopping = true;
      this.video.pause();
      this.video.src = "";
      this.video.load();
      setTimeout(() => {
        this.isStopping = false;
      }, 250);
    }

    this.hideNowPlaying();
  }

  // === Playback Controls ===

  togglePlay() {
    if (this.video.paused) {
      this.video.play().catch(console.error);
    } else {
      this.video.pause();
    }
  }

  skip(seconds) {
    if (this.video) {
      const duration = this.getSeekableDuration();
      let nextAbsolute = this.getAbsoluteCurrentTime() + Number(seconds || 0);
      if (duration > 0) {
        nextAbsolute = Math.min(nextAbsolute, duration);
      }
      nextAbsolute = Math.max(0, nextAbsolute);
      const relativeTarget = Math.max(
        0,
        nextAbsolute - this.playbackStartOffset,
      );
      this.video.currentTime = relativeTarget;
    }
  }

  seek(percent) {
    const duration = this.getSeekableDuration();
    if (this.video && duration > 0) {
      const absoluteTarget = (Number(percent) / 100) * duration;
      const relativeTarget = Math.max(
        0,
        absoluteTarget - this.playbackStartOffset,
      );
      this.video.currentTime = relativeTarget;
    }
  }

  commitSeek(percent) {
    const value = Number(percent);
    if (!Number.isFinite(value)) return;

    const now = Date.now();
    const previousValue = Number(this.lastSeekCommit.value);
    if (
      Number.isFinite(previousValue) &&
      Math.abs(previousValue - value) < 0.05 &&
      now - Number(this.lastSeekCommit.at || 0) < 220
    ) {
      return;
    }

    this.lastSeekCommit = { value, at: now };
    this.startSeekingState("user-seek", 10000);

    const duration = this.getSeekableDuration();
    if (this.video && this.currentSessionId && duration > 0) {
      const absoluteTarget = (value / 100) * duration;
      const relativeTarget = Math.max(
        0,
        absoluteTarget - (this.playbackStartOffset || 0),
      );

      if (!this.canSeekNativelyTo(relativeTarget)) {
        this.ensureLargeSeekReachable(value).catch((err) => {
          console.warn(
            "[WatchPage] Large seek fallback failed:",
            err?.message || err,
          );
        });
        return;
      }
    }

    this.seek(value);
  }

  canSeekNativelyTo(relativeTarget) {
    if (!this.video) return false;
    const target = Number(relativeTarget);
    if (!Number.isFinite(target) || target < 0) return false;

    const ranges = this.video.seekable;
    if (!ranges || ranges.length === 0) {
      return (
        Number.isFinite(this.video.duration) && target <= this.video.duration
      );
    }

    for (let i = 0; i < ranges.length; i += 1) {
      const start = Number(ranges.start(i));
      const end = Number(ranges.end(i));
      if (target >= start - 1 && target <= end + 1) {
        return true;
      }
    }

    return false;
  }

  async ensureLargeSeekReachable(percent) {
    if (this.isSeekRestarting) return;
    if (!this.currentSessionId || !this.currentUrl) return;

    const duration = this.getSeekableDuration();
    if (!(duration > 0)) return;

    const absoluteTarget = (Number(percent) / 100) * duration;
    if (!Number.isFinite(absoluteTarget) || absoluteTarget < 0) return;

    const relativeTarget = Math.max(
      0,
      absoluteTarget - (this.playbackStartOffset || 0),
    );

    if (this.canSeekNativelyTo(relativeTarget)) return;

    // For HLS transcode windows that only expose a short seekable range,
    // recreate the session at the requested offset to make large jumps accurate.
    await this.restartTranscodeAtOffset(absoluteTarget, { preferEncode: true });
  }

  async restartTranscodeAtOffset(
    absoluteTarget,
    options = { preferEncode: true },
  ) {
    if (this.isSeekRestarting) return false;
    if (!this.currentUrl) return false;

    const target = Math.max(0, Math.floor(Number(absoluteTarget) || 0));
    if (!Number.isFinite(target)) return false;

    this.isSeekRestarting = true;
    this.startSeekingState("session-restart", 12000);
    const previousSessionId = this.currentSessionId;
    const attempts = ["encode"];

    try {
      for (const videoMode of attempts) {
        try {
          const playlistUrl = await this.startTranscodeSession(
            this.currentUrl,
            {
              videoMode,
              seekOffset: target,
              hlsTime: 2,
              probeSize: 1200000,
              analyzeDuration: 1200000,
            },
          );

          if (!playlistUrl) {
            continue;
          }

          if (
            previousSessionId &&
            previousSessionId !== this.currentSessionId
          ) {
            API.request("DELETE", `/transcode/${previousSessionId}`).catch(
              () => {},
            );
          }

          this.playbackStartOffset = target;
          this.resumeTime = 0;
          this.playHls(playlistUrl);
          this.setVolumeFromStorage();
          return true;
        } catch (attemptErr) {
          console.warn(
            `[WatchPage] Seek session retry (${videoMode}) failed:`,
            attemptErr?.message || attemptErr,
          );
        }
      }
    } finally {
      this.isSeekRestarting = false;
    }

    return false;
  }

  getAbsoluteCurrentTime() {
    if (!this.video) return 0;
    const relative = Number(this.video.currentTime) || 0;
    return Math.max(0, relative + (this.playbackStartOffset || 0));
  }

  getSeekableDuration() {
    if (!this.video) return 0;

    if (Number.isFinite(this.video.duration) && this.video.duration > 0) {
      const mediaDuration = this.video.duration;
      if ((this.playbackStartOffset || 0) > 0) {
        const estimatedTotal = mediaDuration + this.playbackStartOffset;
        this.knownDuration = Math.max(this.knownDuration || 0, estimatedTotal);
        return this.knownDuration;
      }
      this.knownDuration = Math.max(this.knownDuration || 0, mediaDuration);
      return this.knownDuration;
    }

    if (Number.isFinite(this.knownDuration) && this.knownDuration > 0) {
      return this.knownDuration;
    }

    const ranges = this.video.seekable;
    if (ranges && ranges.length > 0) {
      const seekableEnd =
        ranges.end(ranges.length - 1) + (this.playbackStartOffset || 0);
      this.knownDuration = Math.max(this.knownDuration || 0, seekableEnd);
      return this.knownDuration;
    }

    return 0;
  }

  parseDurationToSeconds(content) {
    if (!content || typeof content !== "object") return 0;

    const rawCandidates = [
      content.durationSeconds,
      content.duration_seconds,
      content.runtimeSeconds,
      content.runtime_seconds,
      content.duration,
      content.runtime,
    ];

    for (const raw of rawCandidates) {
      if (raw === null || raw === undefined || raw === "") continue;

      const numeric = Number(raw);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }

      const text = String(raw).trim();
      const hhmmss = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (hhmmss) {
        const hours = Number(hhmmss[1] || 0);
        const minutes = Number(hhmmss[2] || 0);
        const seconds = Number(hhmmss[3] || 0);
        const total = hours * 3600 + minutes * 60 + seconds;
        if (total > 0) return total;
      }

      const minText = text.match(/(\d+)\s*min/i);
      if (minText) {
        const total = Number(minText[1]) * 60;
        if (Number.isFinite(total) && total > 0) return total;
      }
    }

    return 0;
  }

  toggleMute() {
    if (this.video) {
      this.video.muted = !this.video.muted;
      this.updateVolumeUI();
    }
  }

  setVolume(value) {
    if (this.video) {
      this.video.volume = value / 100;
      this.video.muted = false;
      localStorage.setItem("nodecast-volume", value);
      this.updateVolumeUI();
    }
  }

  toggleFullscreen() {
    const container = document.querySelector(".watch-video-section");
    const isFullscreen =
      document.fullscreenElement || document.webkitFullscreenElement;

    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } else {
      if (container?.requestFullscreen) {
        container.requestFullscreen();
      } else if (container?.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (this.video?.webkitEnterFullscreen) {
        // iOS Safari: use native video fullscreen
        this.video.webkitEnterFullscreen();
      }
    }
  }

  async togglePictureInPicture() {
    try {
      // Standard PiP API (Chrome, Edge, Firefox)
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (
        document.pictureInPictureEnabled &&
        this.video.readyState >= 2
      ) {
        await this.video.requestPictureInPicture();
      }
      // Safari fallback using webkitPresentationMode
      else if (typeof this.video.webkitSetPresentationMode === "function") {
        const mode = this.video.webkitPresentationMode;
        this.video.webkitSetPresentationMode(
          mode === "picture-in-picture" ? "inline" : "picture-in-picture",
        );
      }
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        console.error("Picture-in-Picture error:", err);
      }
    }
  }

  /**
   * Copy current stream URL to clipboard
   */
  copyStreamUrl() {
    if (!this.currentUrl) {
      console.warn("[WatchPage] No stream URL to copy");
      return;
    }

    let streamUrl = this.currentUrl;

    // If it's a relative URL, make it absolute
    if (streamUrl.startsWith("/")) {
      streamUrl = window.location.origin + streamUrl;
    }

    const showPromptFallback = () => {
      prompt("Copy this URL:", streamUrl);
    };

    // navigator.clipboard is only available in secure contexts (HTTPS/localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(streamUrl)
        .then(() => {
          // Show brief feedback
          const btn = document.getElementById("watch-copy-url");
          if (btn) {
            btn.textContent = "Ô£ô Copied!";
            setTimeout(() => {
              btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy Stream URL`;
            }, 1500);
          }
          console.log("[WatchPage] Stream URL copied:", streamUrl);
        })
        .catch(() => {
          showPromptFallback();
        });
    } else {
      // Fallback for insecure contexts (HTTP)
      showPromptFallback();
    }
  }

  // === UI Updates ===

  updateProgress() {
    if (!this.video) return;

    const duration = this.getSeekableDuration();
    const absoluteCurrent = this.getAbsoluteCurrentTime();
    const hasDuration = Number.isFinite(duration) && duration > 0;
    if (!this.isScrubbing && hasDuration && this.progressSlider) {
      const percent = (absoluteCurrent / duration) * 100;
      this.progressSlider.value = percent;
    }
    if (this.timeCurrent) {
      this.timeCurrent.textContent = this.formatTime(absoluteCurrent);
    }
    if (this.timeTotal) {
      this.timeTotal.textContent = hasDuration
        ? this.formatTime(duration)
        : "--:--";
    }

    // Show "Up Next" panel early for series (like streaming services do during credits)
    // Only show if auto-play next episode is enabled
    const autoPlayEnabled = this.app?.player?.settings?.autoPlayNextEpisode;
    if (
      autoPlayEnabled &&
      this.contentType === "series" &&
      this.seriesInfo &&
      !this.nextEpisodeShowing &&
      !this.nextEpisodeDismissed
    ) {
      const duration = this.video.duration;
      const currentTime = this.video.currentTime;

      // Only proceed if we have reliable duration data
      if (isFinite(duration) && duration >= 180 && currentTime >= 120) {
        const timeRemaining = duration - currentTime;
        const creditsThreshold = 10; // seconds before end to show "Up Next"

        if (timeRemaining <= creditsThreshold && timeRemaining > 0) {
          const nextEp = this.getNextEpisode();
          if (nextEp) {
            this.nextEpisodeShowing = true;
            this.showNextEpisodePanel(nextEp);
          }
        }
      }
    }
  }

  onMetadataLoaded() {
    // Detect resolution
    if (this.video && this.video.videoHeight > 0) {
      this.currentStreamInfo = {
        width: this.video.videoWidth,
        height: this.video.videoHeight,
      };
      this.updateQualityBadge();
    }

    // Handle resumption
    if (
      this.resumeTime > 0 &&
      this.video &&
      (this.playbackStartOffset || 0) <= 0
    ) {
      const duration = this.getSeekableDuration();
      const desiredResume = Math.max(0, Number(this.resumeTime) || 0);
      // Only resume if not near the end (95%)
      if (!duration || desiredResume < duration * 0.95) {
        console.log(`[WatchPage] Resuming at ${desiredResume}s`);
        this.video.currentTime = desiredResume;
      }

      this.resumeTime = 0; // Reset after use
    }

    const duration = this.getSeekableDuration();
    if (this.timeTotal) {
      this.timeTotal.textContent =
        duration > 0 ? this.formatTime(duration) : "--:--";
    }
  }

  onPlay() {
    // Update play/pause button icons
    this.playPauseBtn?.querySelector(".icon-play")?.classList.add("hidden");
    this.playPauseBtn?.querySelector(".icon-pause")?.classList.remove("hidden");
    this.centerPlayBtn?.classList.remove("show");
    this.endSeekingState("user-seek");
    this.endSeekingState("session-restart");

    // Start overlay auto-hide
    this.startOverlayTimer();
  }

  onPause() {
    this.playPauseBtn?.querySelector(".icon-play")?.classList.remove("hidden");
    this.playPauseBtn?.querySelector(".icon-pause")?.classList.add("hidden");
    this.centerPlayBtn?.classList.add("show");

    // Keep overlay visible when paused
    this.showOverlay();
    clearTimeout(this.overlayTimeout);
  }

  onEnded() {
    // For series, show next episode panel if not already showing and auto-play is enabled
    const autoPlayEnabled = this.app?.player?.settings?.autoPlayNextEpisode;
    if (
      autoPlayEnabled &&
      this.contentType === "series" &&
      this.seriesInfo &&
      !this.nextEpisodeShowing
    ) {
      const nextEp = this.getNextEpisode();
      if (nextEp) {
        this.nextEpisodeShowing = true;
        this.showNextEpisodePanel(nextEp);
      }
    }
  }

  onError(e) {
    if (this.isStopping) {
      return;
    }

    // Ignore expected teardown noise when stop() clears src and calls load().
    if (
      this.video &&
      !this.video.currentSrc &&
      !this.video.getAttribute("src")
    ) {
      return;
    }

    // Only log actual fatal errors, not benign stream recovery events
    const error = this.video?.error;
    if (error && error.code) {
      console.error("[WatchPage] Video error:", error.code, error.message);
    }

    this.endSeekingState("user-seek");
    this.endSeekingState("session-restart");
  }

  updateVolumeUI() {
    const isMuted = this.video?.muted || this.video?.volume === 0;
    this.muteBtn
      ?.querySelector(".icon-vol")
      ?.classList.toggle("hidden", isMuted);
    this.muteBtn
      ?.querySelector(".icon-muted")
      ?.classList.toggle("hidden", !isMuted);
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // === Loading Spinner ===

  showLoading() {
    this.loadingSpinner?.classList.add("show");
    this.centerPlayBtn?.classList.remove("show");
  }

  hideLoading() {
    this.loadingSpinner?.classList.remove("show");
  }

  startSeekingState(reason = "user-seek", timeoutMs = 10000) {
    const key = String(reason || "user-seek");
    this.seekingReasons.add(key);

    const existingTimer = this.seekingReasonTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.seekingReasonTimers.delete(key);
    }

    if (timeoutMs > 0) {
      const timer = setTimeout(() => this.endSeekingState(key), timeoutMs);
      this.seekingReasonTimers.set(key, timer);
    }

    if (this.seekingText) {
      this.seekingText.textContent = this.getSeekingLabel();
    }
    this.seekingOverlay?.classList.remove("hidden");
  }

  endSeekingState(reason = null) {
    if (reason) {
      const key = String(reason);
      this.seekingReasons.delete(key);
      const timer = this.seekingReasonTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.seekingReasonTimers.delete(key);
      }
    } else {
      this.seekingReasons.clear();
      this.seekingReasonTimers.forEach((timerId) => clearTimeout(timerId));
      this.seekingReasonTimers.clear();
    }

    if (this.seekingReasons.size === 0) {
      this.seekingOverlay?.classList.add("hidden");
    }
  }

  getSeekingLabel() {
    const isGerman = (window.I18n?.language || "")
      .toLowerCase()
      .startsWith("de");
    return isGerman ? "Springe..." : "Seeking...";
  }

  // === Captions ===

  toggleCaptionsMenu() {
    if (this.captionsMenuOpen) {
      this.closeCaptionsMenu();
    } else {
      this.updateCaptionsTracks();
      this.captionsMenu?.classList.remove("hidden");
      this.captionsMenuOpen = true;
    }
  }

  closeCaptionsMenu() {
    this.captionsMenu?.classList.add("hidden");
    this.captionsMenuOpen = false;
  }

  updateCaptionsTracks() {
    if (!this.captionsList || !this.video) return;

    // Build list of available text tracks
    const tracks = this.video.textTracks;
    let html = '<button class="captions-option" data-index="-1">Off</button>';

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.kind === "subtitles" || track.kind === "captions") {
        const label = track.label || track.language || `Track ${i + 1}`;
        const isActive = track.mode === "showing";
        html += `<button class="captions-option ${isActive ? "active" : ""}" data-index="${i}">${label}</button>`;
      }
    }

    // Check if any track is active, if not mark "Off" as active
    let anyActive = false;
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].mode === "showing") anyActive = true;
    }
    if (!anyActive) {
      html = html.replace(
        'class="captions-option"',
        'class="captions-option active"',
      );
    }

    this.captionsList.innerHTML = html;

    // Add click handlers
    this.captionsList.querySelectorAll(".captions-option").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.selectCaptionTrack(parseInt(btn.dataset.index)),
      );
    });
  }

  selectCaptionTrack(index) {
    if (!this.video) return;

    const tracks = this.video.textTracks;

    // Disable all tracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = "hidden";
    }

    // Enable selected track
    if (index >= 0 && index < tracks.length) {
      tracks[index].mode = "showing";
    }

    // Update UI
    this.updateCaptionsTracks();
    this.closeCaptionsMenu();
  }

  // === Overlay Auto-Hide ===

  showOverlay() {
    this.overlay?.classList.remove("hidden");
    this.overlayVisible = true;
    this.startOverlayTimer();
  }

  hideOverlay() {
    if (!this.video?.paused) {
      this.overlay?.classList.add("hidden");
      this.overlayVisible = false;
    }
  }

  startOverlayTimer() {
    clearTimeout(this.overlayTimeout);
    this.overlayTimeout = setTimeout(() => this.hideOverlay(), 3000);
  }

  // === Keyboard Shortcuts ===

  handleKeyboard(e) {
    // Only handle when watch page is active
    const watchPage = document.getElementById("page-watch");
    if (!watchPage?.classList.contains("active")) return;

    // Don't handle if typing in input
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        this.togglePlay();
        break;
      case "ArrowLeft":
        e.preventDefault();
        this.skip(-10);
        this.showOverlay();
        break;
      case "ArrowRight":
        e.preventDefault();
        this.skip(10);
        this.showOverlay();
        break;
      case "ArrowUp":
        e.preventDefault();
        this.setVolume(Math.min(100, parseInt(this.volumeSlider.value) + 10));
        this.volumeSlider.value = Math.min(
          100,
          parseInt(this.volumeSlider.value) + 10,
        );
        this.showOverlay();
        break;
      case "ArrowDown":
        e.preventDefault();
        this.setVolume(Math.max(0, parseInt(this.volumeSlider.value) - 10));
        this.volumeSlider.value = Math.max(
          0,
          parseInt(this.volumeSlider.value) - 10,
        );
        this.showOverlay();
        break;
      case "f":
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case "m":
        e.preventDefault();
        this.toggleMute();
        this.showOverlay();
        break;
      case "Escape":
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          this.goBack();
        }
        break;
    }
  }

  // === Next Episode ===

  getNextEpisode() {
    if (
      !this.seriesInfo?.episodes ||
      !this.currentSeason ||
      !this.currentEpisode
    )
      return null;

    const seasons = Object.keys(this.seriesInfo.episodes).sort(
      (a, b) => parseInt(a) - parseInt(b),
    );
    const currentSeasonEpisodes =
      this.seriesInfo.episodes[this.currentSeason] || [];

    // Find next episode in current season
    const currentEpIndex = currentSeasonEpisodes.findIndex(
      (ep) => parseInt(ep.episode_num) === parseInt(this.currentEpisode),
    );

    if (
      currentEpIndex >= 0 &&
      currentEpIndex < currentSeasonEpisodes.length - 1
    ) {
      return {
        ...currentSeasonEpisodes[currentEpIndex + 1],
        seasonNum: this.currentSeason,
      };
    }

    // Try next season
    const currentSeasonIndex = seasons.indexOf(String(this.currentSeason));
    if (currentSeasonIndex >= 0 && currentSeasonIndex < seasons.length - 1) {
      const nextSeason = seasons[currentSeasonIndex + 1];
      const nextSeasonEpisodes = this.seriesInfo.episodes[nextSeason];
      if (nextSeasonEpisodes?.length > 0) {
        return {
          ...nextSeasonEpisodes[0],
          seasonNum: nextSeason,
        };
      }
    }

    return null;
  }

  showNextEpisodePanel(nextEp) {
    if (!this.nextEpisodePanel) return;

    this.nextEpisodeTitle.textContent = `S${nextEp.seasonNum} E${nextEp.episode_num} - ${nextEp.title || `Episode ${nextEp.episode_num}`}`;
    this.nextEpisodePanel.classList.remove("hidden");
    this.nextEpisodePanel.nextEpisodeData = nextEp;

    // Start countdown
    this.nextEpisodeCountdown = 10;
    this.nextCountdown.textContent = this.nextEpisodeCountdown;

    this.nextEpisodeInterval = setInterval(() => {
      this.nextEpisodeCountdown--;
      this.nextCountdown.textContent = this.nextEpisodeCountdown;

      if (this.nextEpisodeCountdown <= 0) {
        this.playNextEpisode();
      }
    }, 1000);
  }

  async playNextEpisode() {
    // Save next episode data BEFORE canceling (cancel clears the data)
    const nextEp = this.nextEpisodePanel?.nextEpisodeData;

    this.cancelNextEpisode();

    if (!nextEp) return;

    try {
      const container = nextEp.container_extension || "mp4";
      const result = await API.proxy.xtream.getStreamUrl(
        this.content.sourceId,
        nextEp.id,
        "series",
        container,
      );

      if (result?.url) {
        this.play(
          {
            type: "series",
            id: nextEp.id,
            title: this.content.title,
            subtitle: `S${nextEp.seasonNum} E${nextEp.episode_num} - ${nextEp.title || `Episode ${nextEp.episode_num}`}`,
            poster: this.content.poster,
            description: this.content.description,
            year: this.content.year,
            rating: this.content.rating,
            sourceId: this.content.sourceId,
            seriesId: this.content.seriesId,
            seriesInfo: this.seriesInfo,
            currentSeason: nextEp.seasonNum,
            currentEpisode: nextEp.episode_num,
          },
          result.url,
        );
      }
    } catch (e) {
      console.error("Error playing next episode:", e);
    }
  }

  cancelNextEpisode() {
    clearInterval(this.nextEpisodeInterval);
    this.nextEpisodePanel?.classList.add("hidden");
    this.nextEpisodeShowing = false;
    this.nextEpisodeDismissed = true; // Prevent re-triggering
    if (this.nextEpisodePanel) {
      this.nextEpisodePanel.nextEpisodeData = null;
    }
  }

  // === Navigation ===

  goBack() {
    this.stop();
    this.cancelNextEpisode();

    // Navigate to the page we came from (stored in returnPage)
    // We don't use history.back() because we used replaceHistory when navigating here
    this.app.navigateTo(this.returnPage || "movies");
  }

  show() {
    // Called when page becomes visible
  }

  hide() {
    // Called when page becomes hidden
    // Don't stop playback here - allow background playback
    this.cancelNextEpisode();
  }
  // ============================================================
  // Watch History Tracking
  // ============================================================

  startHistoryTracking() {
    this.stopHistoryTracking(); // Clear existing if any
    this.historyInterval = setInterval(() => this.saveProgress(), 10000); // 10s
  }

  stopHistoryTracking() {
    if (this.historyInterval) {
      clearInterval(this.historyInterval);
      this.historyInterval = null;
    }
  }

  async saveProgress() {
    if (!this.content || !this.video || this.video.paused) return;

    const progress = Math.floor(this.getAbsoluteCurrentTime());
    const duration = Math.floor(this.getSeekableDuration());

    if (!Number.isFinite(progress) || progress < 0) return;
    if (!Number.isFinite(duration) || duration <= 0) return;

    try {
      const data = {
        title: this.content.title || "Unknown Title",
        subtitle:
          this.content.subtitle ||
          (this.content.type === "movie" ? "Movie" : "Series"),
        poster: this.content.poster,
        sourceId: this.content.sourceId,
        containerExtension: this.containerExtension,
        // Series-specific fields for next episode functionality
        seriesId: this.content.seriesId || null,
        currentSeason: this.currentSeason || null,
        currentEpisode: this.currentEpisode || null,
      };

      await window.API.request("POST", "/history", {
        id: this.content.id,
        type: this.content.type === "movie" ? "movie" : "episode",
        sourceId: this.content.sourceId,
        progress,
        duration,
        data,
      });
    } catch (err) {
      console.warn("[History] Failed to save progress:", err);
    }
  }
}

window.WatchPage = WatchPage;
