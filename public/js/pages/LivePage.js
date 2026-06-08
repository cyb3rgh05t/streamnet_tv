/**
 * Home Page Controller
 */

class LivePage {
  constructor(app) {
    this.app = app;
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleChannelChanged = this.handleChannelChanged.bind(this);
    this.handleLiveGroupChanged = this.handleLiveGroupChanged.bind(this);
    this.liveEpgTimer = null;
    this.selectedLiveGroup = null;
  }

  tr(key, params = {}) {
    return window.I18n?.t ? window.I18n.t(key, params) : key;
  }

  async init() {
    // Load sources and channels on initial page load
    await this.app.channelList.loadSources();
    await this.app.channelList.loadChannels();

    // Silently fetch EPG data for sidebar info
    try {
      await this.app.epgGuide.fetchEpgData();

      // Clear cache so we don't get stale "null" results from initial render
      this.app.channelList.clearProgramInfoCache();

      // Update program info in existing DOM elements without re-rendering
      this.updateProgramInfo();
    } catch (err) {
      console.warn("Background EPG fetch failed:", err);
    }
  }

  /**
   * Update "Now Playing" info in existing channel elements without blocking UI
   */
  updateProgramInfo() {
    const channelItems = Array.from(document.querySelectorAll(".channel-item"));
    if (channelItems.length === 0) return;

    // Build a map for O(1) channel lookups
    const channelMap = new Map();
    this.app.channelList.channels.forEach((c) => channelMap.set(c.id, c));

    // Process in small batches to avoid blocking UI
    const BATCH_SIZE = 50;
    let index = 0;

    const processBatch = () => {
      const end = Math.min(index + BATCH_SIZE, channelItems.length);

      for (let i = index; i < end; i++) {
        const item = channelItems[i];
        const channelId = item.dataset.channelId;
        const channel = channelMap.get(channelId);

        if (channel) {
          const programDiv = item.querySelector(".channel-program");
          if (programDiv) {
            const programTitle = this.app.channelList.getProgramInfo(channel);
            programDiv.textContent = programTitle || "";
          }
        }
      }

      index = end;
      if (index < channelItems.length) {
        // Yield to browser before next batch
        requestAnimationFrame(processBatch);
      }
    };

    // Start processing
    requestAnimationFrame(processBatch);
  }

  handleChannelChanged() {
    this.renderLiveEpgPanel();
  }

  handleLiveGroupChanged(e) {
    this.selectedLiveGroup = e?.detail || null;
    this.renderLiveEpgPanel();
  }

  getEpgChannel(channel) {
    const epgGuide = this.app.epgGuide;
    if (!epgGuide) return null;

    if (channel.tvgId && epgGuide.channelMap?.has(channel.tvgId)) {
      return epgGuide.channelMap.get(channel.tvgId);
    }

    const normalizedName = (channel.name || "").toLowerCase();
    if (normalizedName && epgGuide.channelMap?.has(normalizedName)) {
      return epgGuide.channelMap.get(normalizedName);
    }

    return null;
  }

  getCurrentAndNextProgramme(channel, now = new Date()) {
    const epgGuide = this.app.epgGuide;
    if (!epgGuide?.programmes?.length) {
      return { current: null, next: null };
    }

    const epgChannel = this.getEpgChannel(channel);
    if (!epgChannel) {
      return { current: null, next: null };
    }

    const nowTime = now.getTime();
    const channelProgrammes = epgGuide.programmes
      .filter((p) => p.channelId === epgChannel.id)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    let current = null;
    let next = null;

    for (const programme of channelProgrammes) {
      const start = new Date(programme.start).getTime();
      const stop = new Date(programme.stop).getTime();

      if (nowTime >= start && nowTime < stop) {
        current = programme;
        continue;
      }

      if (start >= nowTime) {
        next = programme;
        break;
      }
    }

    return { current, next };
  }

  formatProgrammeTime(programme) {
    if (!programme) return "";
    const start = new Date(programme.start).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const stop = new Date(programme.stop).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${start} - ${stop}`;
  }

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  normalizeProgrammeTitle(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  }

  normalizeProgrammeSummary(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  }

  hasEpisodeMarker(value) {
    const text = String(value || "");
    return /\b(s\d{1,2}\s*e\d{1,3}|staffel\s*\d+|folge\s*\d+|teil\s*\d+|episode\s*\d+)\b/i.test(
      text,
    );
  }

  mergeNearDuplicateProgrammes(programmes, offsetMinutes = 5) {
    if (!Array.isArray(programmes) || programmes.length <= 1) return programmes;

    const offsetMs = offsetMinutes * 60 * 1000;
    const sorted = [...programmes].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );

    const merged = [];
    for (const prog of sorted) {
      const pStart = new Date(prog.start).getTime();
      const pStop = new Date(prog.stop).getTime();
      const pTitle = this.normalizeProgrammeTitle(prog.title);
      const pSummary = this.normalizeProgrammeSummary(
        prog.description ||
          prog.desc ||
          prog.plot ||
          prog.summary ||
          prog.synopsis,
      );

      if (!merged.length) {
        merged.push({
          ...prog,
          start: new Date(pStart).toISOString(),
          stop: new Date(pStop).toISOString(),
        });
        continue;
      }

      const last = merged[merged.length - 1];
      const lStart = new Date(last.start).getTime();
      const lStop = new Date(last.stop).getTime();
      const lTitle = this.normalizeProgrammeTitle(last.title);
      const lSummary = this.normalizeProgrammeSummary(
        last.description ||
          last.desc ||
          last.plot ||
          last.summary ||
          last.synopsis,
      );

      const sameTitle = pTitle && lTitle && pTitle === lTitle;
      const containsEpisodeMarker =
        this.hasEpisodeMarker(last.title) || this.hasEpisodeMarker(prog.title);
      const summaryCompatible = !lSummary || !pSummary || lSummary === pSummary;
      const bothEdgesClose =
        Math.abs(pStart - lStart) <= offsetMs &&
        Math.abs(pStop - lStop) <= offsetMs;

      const overlapMs = Math.max(
        0,
        Math.min(pStop, lStop) - Math.max(pStart, lStart),
      );
      const lastDuration = Math.max(1, lStop - lStart);
      const thisDuration = Math.max(1, pStop - pStart);
      const shorterDuration = Math.min(lastDuration, thisDuration);
      const overlapRatio = overlapMs / shorterDuration;
      const durationClose = Math.abs(lastDuration - thisDuration) <= offsetMs;
      const highOverlapDuplicate = overlapRatio >= 0.85 && durationClose;

      if (
        sameTitle &&
        !containsEpisodeMarker &&
        summaryCompatible &&
        (bothEdgesClose || highOverlapDuplicate)
      ) {
        last.start = new Date(Math.min(lStart, pStart)).toISOString();
        last.stop = new Date(Math.max(lStop, pStop)).toISOString();
        continue;
      }

      merged.push({
        ...prog,
        start: new Date(pStart).toISOString(),
        stop: new Date(pStop).toISOString(),
      });
    }

    return merged;
  }

  renderLiveEpgPanel() {
    const rowsContainer = document.getElementById("live-epg-rows");
    const titleEl = document.getElementById("live-epg-current-title");
    const metaEl = document.getElementById("live-epg-current-meta");
    const markerEl = document.getElementById("live-epg-now-label");
    const rulerEl = document.getElementById("live-epg-ruler");
    const scrollArea = document.getElementById("live-epg-scroll-area");

    if (!rowsContainer || !titleEl || !metaEl || !markerEl || !rulerEl) return;

    // Timeline constants
    const WINDOW_MINUTES = 720; // 12-hour visible window
    const PX_PER_MIN = this.app.epgGuide?.pixelsPerMinute || 6.67;
    const TRACK_WIDTH = WINDOW_MINUTES * PX_PER_MIN;
    const sidebarVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--epg-sidebar-width")
      .trim();
    const CHANNEL_COL_PX = parseFloat(sidebarVar) || 250;

    const allChannels = this.app.channelList?.channels || [];
    if (!allChannels.length) {
      rowsContainer.innerHTML =
        '<div class="empty-state"><p>No channels loaded</p></div>';
      titleEl.textContent = "Live EPG";
      metaEl.textContent = "Load channels to view schedule";
      markerEl.textContent = "";
      return;
    }

    const now = new Date();

    // Snap window start to previous full hour so "now" always lands within first hour
    const windowStart = new Date(now);
    windowStart.setMinutes(0, 0, 0);
    const windowStartMs = windowStart.getTime();
    const windowEndMs = windowStartMs + WINDOW_MINUTES * 60000;

    // Pixel position of "now" on the track
    const nowPx = Math.max(
      0,
      ((now.getTime() - windowStartMs) / 60000) * PX_PER_MIN,
    );

    // ── Ruler ────────────────────────────────────────────────────────────
    markerEl.textContent = `Now  ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    rulerEl.style.width = `${TRACK_WIDTH}px`;

    let rulerHtml = "";
    for (let m = 0; m <= WINDOW_MINUTES; m += 60) {
      const label = new Date(windowStartMs + m * 60000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      rulerHtml += `<span class="live-epg-ruler-slot" style="left:${m * PX_PER_MIN}px">${label}</span>`;
      // Half-hour tick (no label)
      if (m + 30 <= WINDOW_MINUTES) {
        rulerHtml += `<span class="live-epg-ruler-slot live-epg-ruler-half" style="left:${(m + 30) * PX_PER_MIN}px"></span>`;
      }
    }
    rulerEl.innerHTML = rulerHtml;

    // ── Header info ──────────────────────────────────────────────────────
    const epgGuide = this.app.epgGuide;
    const currentSelected = this.app.channelList?.currentChannel;

    // ── Channel list in provider playlist order, scoped to active group ───
    // If a channel is selected, show only channels from that same group/source.
    const selectedGroup =
      this.selectedLiveGroup || this.app.channelList?.selectedLiveGroup || null;
    const activeGroupTitle =
      selectedGroup?.groupName || currentSelected?.groupTitle || null;
    const activeSourceId =
      selectedGroup?.sourceId || currentSelected?.sourceId || null;
    const isFavoritesGroup = activeGroupTitle === "Favorites";
    const scopedChannels = activeGroupTitle
      ? allChannels.filter((ch) => {
          if (
            activeSourceId &&
            String(ch.sourceId) !== String(activeSourceId)
          ) {
            return false;
          }

          if (isFavoritesGroup) {
            return this.app.channelList.isFavorite(ch.sourceId, ch.id);
          }

          return String(ch.groupTitle || "") === String(activeGroupTitle);
        })
      : allChannels;

    const unique = new Set();
    const orderedChannels = [];
    for (const ch of scopedChannels) {
      const key = `${ch.sourceId}:${ch.id}`;
      if (!unique.has(key)) {
        unique.add(key);
        orderedChannels.push(ch);
      }
    }

    const selEpgCh = currentSelected
      ? this.getEpgChannel(currentSelected)
      : null;
    const selCurrentProg =
      selEpgCh && epgGuide?.programmes
        ? epgGuide.programmes.find((p) => {
            const s = new Date(p.start).getTime(),
              e = new Date(p.stop).getTime();
            return (
              p.channelId === selEpgCh.id &&
              s <= now.getTime() &&
              e > now.getTime()
            );
          })
        : null;

    titleEl.textContent = selectedGroup
      ? activeGroupTitle
      : currentSelected?.name || this.tr("live.title");
    metaEl.textContent = selCurrentProg
      ? `${this.formatProgrammeTime(selCurrentProg)} • ${selCurrentProg.title}`
      : activeGroupTitle
        ? `${this.tr("live.groupPrefix")}: ${activeGroupTitle}`
        : this.tr("live.selectChannel");

    // ── Rows ─────────────────────────────────────────────────────────────
    const rowsHtml = orderedChannels
      .map((channel) => {
        const isActive =
          currentSelected && String(currentSelected.id) === String(channel.id);
        const epgChannel = this.getEpgChannel(channel);

        // Programmes overlapping the window
        let programmes = [];
        if (epgChannel && epgGuide?.programmes?.length) {
          programmes = epgGuide.programmes
            .filter((p) => {
              if (p.channelId !== epgChannel.id) return false;
              const s = new Date(p.start).getTime();
              const e = new Date(p.stop).getTime();
              return e > windowStartMs && s < windowEndMs;
            })
            .sort((a, b) => new Date(a.start) - new Date(b.start));

          programmes = this.mergeNearDuplicateProgrammes(programmes, 5);
        }

        let tracksHtml = "";
        if (programmes.length === 0) {
          tracksHtml = `<div class="live-epg-program no-epg" style="left:0;width:${TRACK_WIDTH}px">
            <span class="live-epg-title">${this.tr("live.noEpg")}</span>
          </div>`;
        } else {
          tracksHtml = programmes
            .map((prog) => {
              const pStart = new Date(prog.start).getTime();
              const pStop = new Date(prog.stop).getTime();
              const clippedStart = Math.max(pStart, windowStartMs);
              const clippedStop = Math.min(pStop, windowEndMs);
              const left =
                ((clippedStart - windowStartMs) / 60000) * PX_PER_MIN;
              const width = Math.max(
                ((clippedStop - clippedStart) / 60000) * PX_PER_MIN - 4,
                22,
              );
              const timeLabel = new Date(prog.start).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isCurrent =
                pStart <= now.getTime() && pStop > now.getTime();
              const isPast = pStop <= now.getTime();
              const cls = isCurrent ? "current" : isPast ? "past" : "future";

              return `<div class="live-epg-program ${cls}"
                       style="left:${left}px;width:${width}px"
                       title="${this.escapeHtml(prog.title)} • ${timeLabel}">
                    <span class="live-epg-time">${timeLabel}</span>
                    <span class="live-epg-title">${this.escapeHtml(prog.title)}</span>
                  </div>`;
            })
            .join("");
        }

        const onAirBadge = isActive
          ? `<span class="live-epg-on-air">${this.tr("live.onAir")}</span>`
          : "";
        const isFavorite = this.app.channelList.isFavorite(
          channel.sourceId,
          channel.id,
        );

        return `
        <div class="live-epg-row ${isActive ? "active" : ""}"
             data-channel-id="${channel.id}"
             data-source-id="${channel.sourceId}">
          <div class="live-epg-channel">
            ${onAirBadge}
            <img class="live-epg-channel-logo"
                 src="${this.app.channelList.getProxiedImageUrl(channel.tvgLogo)}"
                 alt="${this.escapeHtml(channel.name)}" loading="lazy" decoding="async"/>
            <span class="live-epg-channel-name">${this.escapeHtml(channel.name)}</span>
            <button
              class="live-epg-favorite-btn ${isFavorite ? "active" : ""}"
              data-channel-id="${channel.id}"
              data-source-id="${channel.sourceId}"
              title="${isFavorite ? this.tr("common.removeFromFavorites") : this.tr("common.addToFavorites")}"
              aria-label="${isFavorite ? this.tr("common.removeFromFavorites") : this.tr("common.addToFavorites")}"
            >${isFavorite ? "❤" : "♡"}</button>
          </div>
          <div class="live-epg-track" style="width:${TRACK_WIDTH}px">
            ${tracksHtml}
            <div class="live-epg-now-line" style="left:${nowPx}px"></div>
          </div>
        </div>`;
      })
      .join("");

    rowsContainer.innerHTML = rowsHtml;

    rowsContainer.querySelectorAll(".live-epg-row").forEach((row) => {
      row.addEventListener("click", () => {
        this.app.channelList.selectChannel({
          channelId: row.dataset.channelId,
          sourceId: row.dataset.sourceId,
        });
      });
    });

    rowsContainer.querySelectorAll(".live-epg-favorite-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const sourceId = parseInt(btn.dataset.sourceId, 10);
        const channelId = btn.dataset.channelId;
        const isActive = btn.classList.contains("active");

        btn.classList.toggle("active", !isActive);
        btn.textContent = isActive ? "♡" : "❤";
        btn.title = isActive
          ? this.tr("common.addToFavorites")
          : this.tr("common.removeFromFavorites");

        try {
          await this.app.channelList.toggleFavorite(sourceId, channelId);
        } catch {
          btn.classList.toggle("active", isActive);
          btn.textContent = isActive ? "❤" : "♡";
          btn.title = isActive
            ? this.tr("common.removeFromFavorites")
            : this.tr("common.addToFavorites");
        }
      });
    });

    // Auto-scroll so the now-line is ~30 % from left edge (with channel col offset)
    if (scrollArea) {
      const viewWidth = scrollArea.clientWidth - CHANNEL_COL_PX;
      const targetScroll = Math.max(0, nowPx - viewWidth * 0.3);
      scrollArea.scrollLeft = targetScroll;
    }
  }

  startLiveEpgTimer() {
    this.stopLiveEpgTimer();
    this.liveEpgTimer = setInterval(() => {
      this.renderLiveEpgPanel();
    }, 60000);
  }

  stopLiveEpgTimer() {
    if (this.liveEpgTimer) {
      clearInterval(this.liveEpgTimer);
      this.liveEpgTimer = null;
    }
  }

  handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    switch (e.key) {
      case "ArrowUp":
        // Check if player handles arrows for volume
        if (this.app.player && !this.app.player.settings.arrowKeysChangeChannel)
          return;

        e.preventDefault();
        this.app.channelList.selectPrevChannel();
        break;
      case "ArrowDown":
        // Check if player handles arrows for volume
        if (this.app.player && !this.app.player.settings.arrowKeysChangeChannel)
          return;

        e.preventDefault();
        this.app.channelList.selectNextChannel();
        break;
    }
  }

  ensureInitialLiveGroup() {
    const channelList = this.app.channelList;
    if (!channelList) return;

    if (this.selectedLiveGroup || channelList.selectedLiveGroup) {
      return;
    }

    const hasFavorites =
      channelList.visibleFavorites instanceof Set &&
      channelList.visibleFavorites.size > 0;

    if (hasFavorites) {
      channelList.selectLiveGroup("Favorites", null);
      this.selectedLiveGroup = channelList.selectedLiveGroup;
      return;
    }

    const groups = Array.isArray(channelList.groups) ? channelList.groups : [];
    const channels = Array.isArray(channelList.channels)
      ? channelList.channels
      : [];

    const firstGroup = groups.find((group) =>
      channels.some(
        (channel) =>
          String(channel.groupTitle || "") === String(group?.name || "") &&
          String(channel.sourceId || "") === String(group?.sourceId || ""),
      ),
    );

    if (firstGroup?.name) {
      channelList.selectLiveGroup(firstGroup.name, firstGroup.sourceId);
      this.selectedLiveGroup = channelList.selectedLiveGroup;
    }
  }

  async show() {
    document.addEventListener("keydown", this.handleKeydown);
    window.addEventListener("channelChanged", this.handleChannelChanged);
    window.addEventListener("liveGroupChanged", this.handleLiveGroupChanged);
    this.selectedLiveGroup = this.app.channelList?.selectedLiveGroup || null;

    // Only reload if channels aren't already loaded
    if (this.app.channelList.channels.length === 0) {
      await this.app.channelList.loadSources();
      await this.app.channelList.loadChannels();
    }

    this.ensureInitialLiveGroup();

    this.renderLiveEpgPanel();
    this.startLiveEpgTimer();
  }

  hide() {
    document.removeEventListener("keydown", this.handleKeydown);
    window.removeEventListener("channelChanged", this.handleChannelChanged);
    window.removeEventListener("liveGroupChanged", this.handleLiveGroupChanged);
    this.stopLiveEpgTimer();
  }
}

window.LivePage = LivePage;
