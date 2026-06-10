/**
 * Admin Dashboard Page Controller
 */

class AdminDashboardPage {
  constructor(app) {
    this.app = app;
    this.refreshTimer = null;
    this.liveMetricsTimer = null;
    this.liveMetricsLoading = false;
    this.statsLoading = false;
    this.historyRange = "month";
    this.selectedHistoryMonth = "latest";
    this.latestStats = null;
    this.showHistoryTrendline = true;
    this._onHistoryResize = () => {
      if (this.latestStats) this.renderHistorySuite(this.latestStats);
    };
  }

  async init() {
    // No preload required.
  }

  tr(key, params = {}, fallback = "") {
    const translated = window.I18n?.t ? window.I18n.t(key, params) : key;
    if (translated === key && fallback) return fallback;
    return translated;
  }

  getCurrentLang() {
    return window.I18n?.language === "en" ? "en" : "de";
  }

  formatUptime(totalSeconds) {
    const sec = Math.max(0, Number(totalSeconds) || 0);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m`;
  }

  formatMemory(valueMb) {
    const value = Number(valueMb) || 0;
    if (value >= 1024) {
      return `${(value / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(value)} MB`;
  }

  formatMemoryPair(usedMb, totalMb) {
    return `${this.formatMemory(usedMb)} / ${this.formatMemory(totalMb)}`;
  }

  formatTrafficRateMbps(valueMbps) {
    const value = Number(valueMbps) || 0;
    return `${value.toFixed(1)} Mbps`;
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  applyLiveMetrics(stats = {}) {
    this.setText(
      "admin-stat-uptime",
      this.formatUptime(stats.server?.uptimeSec),
    );
    this.setText(
      "admin-stat-ram",
      this.formatMemory(stats.server?.memory?.rssMb ?? 0),
    );

    const kpiTotalMbps = Number(stats.server?.network?.totalRateMbps);
    if (Number.isFinite(kpiTotalMbps)) {
      this.setText(
        "admin-kpi-traffic",
        this.formatTrafficRateMbps(kpiTotalMbps),
      );
    } else {
      this.setText(
        "admin-kpi-traffic",
        `${stats.server?.network?.rxRateKbps ?? 0} / ${stats.server?.network?.txRateKbps ?? 0} kbps`,
      );
    }

    this.renderTrafficCluster("admin-chart-traffic-load", stats);
  }

  renderDonut(targetId, labels = [], values = [], palette = []) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const total = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
    if (total <= 0) {
      host.innerHTML = `<div class="admin-chart-empty">${this.tr("admin.noData", {}, "Keine Daten")}</div>`;
      return;
    }

    let angle = 0;
    const parts = values.map((v, idx) => {
      const value = Number(v) || 0;
      const pct = value / total;
      const start = angle;
      angle += pct * 360;
      const color =
        palette[idx] ||
        `hsl(${Math.round((idx / Math.max(values.length, 1)) * 300)} 75% 58%)`;
      return `${color} ${start.toFixed(2)}deg ${angle.toFixed(2)}deg`;
    });

    const finalAngle = Math.min(360, Math.max(0, angle));
    parts.push(`var(--color-bg-primary) ${finalAngle.toFixed(2)}deg 360deg`);

    const legend = labels
      .map((label, idx) => {
        const value = Number(values[idx]) || 0;
        const color =
          palette[idx] ||
          `hsl(${Math.round((idx / Math.max(values.length, 1)) * 300)} 75% 58%)`;
        return `
          <li class="admin-legend-card">
            <div class="admin-legend-meta">
              <span class="dot" style="background:${color}"></span>
              <span class="label">${label}</span>
            </div>
            <strong class="admin-legend-value">${value}</strong>
          </li>
        `;
      })
      .join("");

    host.innerHTML = `
      <div class="admin-donut" style="--segments: conic-gradient(${parts.join(",")});">
        <div class="admin-donut-hole">
          <span>${this.tr("admin.total", {}, "Total")}</span>
          <strong>${total}</strong>
        </div>
      </div>
      <ul class="admin-donut-legend">${legend}</ul>
    `;
  }

  renderWatchGrid(targetId, labels = [], values = []) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const cleanValues = values.map((v) => Number(v) || 0);
    const max = Math.max(1, ...cleanValues);

    host.innerHTML = labels
      .map((label, idx) => {
        const value = cleanValues[idx] || 0;
        const rawPct = Math.max(0, Math.min(100, (value / max) * 100));
        const pct = value > 0 ? Math.max(10, rawPct) : 0;
        return `
          <div class="admin-watch-cell" title="${label}: ${value}">
            <div class="admin-watch-fill" style="--watch-pct:${pct.toFixed(2)}"></div>
            <div class="admin-watch-value">${value}</div>
            <div class="admin-watch-hour">${label}</div>
          </div>
        `;
      })
      .join("");
  }

  renderTrendGrid(targetId, labels = [], values = []) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const cleanValues = values.map((v) => Number(v) || 0);
    const max = Math.max(1, ...cleanValues);

    host.innerHTML = labels
      .map((label, idx) => {
        const value = cleanValues[idx] || 0;
        const pct = Math.max(0, Math.min(100, (value / max) * 100));
        return `
          <div class="admin-trend-cell" title="${label}: ${value}">
            <div class="admin-trend-fill" style="--trend-pct:${pct.toFixed(2)}"></div>
            <div class="admin-trend-value">${value}</div>
            <div class="admin-trend-label">${label}</div>
          </div>
        `;
      })
      .join("");
  }

  renderBars(targetId, labels = [], values = []) {
    const host = document.getElementById(targetId);
    if (!host) return;
    const max = Math.max(1, ...values.map((v) => Number(v) || 0));

    host.innerHTML = labels
      .map((label, idx) => {
        const value = Number(values[idx]) || 0;
        const height = Math.max(6, Math.round((value / max) * 100));
        return `
          <div class="admin-bar-wrap" title="${label}: ${value}">
            <div class="admin-bar" style="height:${height}%"></div>
            <span class="admin-bar-label">${label}</span>
          </div>
        `;
      })
      .join("");
  }

  renderUsers7dCard(targetId, labels = [], values = []) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const cleanLabels = labels.map((l) => String(l || ""));
    const cleanValues = values.map((v) => Number(v) || 0);
    if (!cleanLabels.length) {
      host.innerHTML = `<div class="admin-chart-empty">${this.tr("admin.noData", {}, "Keine Daten")}</div>`;
      return;
    }

    const max = Math.max(1, ...cleanValues);
    const total = cleanValues.reduce((sum, v) => sum + v, 0);
    const avg = Math.round(total / Math.max(1, cleanValues.length));
    const peak = Math.max(...cleanValues);

    const bars = cleanValues
      .map((value, idx) => {
        const pct =
          value === 0 ? 3 : Math.max(12, Math.round((value / max) * 100));
        const label = String(cleanLabels[idx] || "").slice(0, 5);
        const cls =
          value === peak ? "admin-users7d-col is-peak" : "admin-users7d-col";
        return `
          <div class="${cls}" title="${cleanLabels[idx]}: ${value}">
            <div class="admin-users7d-bar-track" style="--bar-pct:${pct.toFixed(2)}">
              <div class="admin-users7d-bar" style="--bar-pct:${pct.toFixed(2)}">
                <span class="admin-users7d-value on-bar">${value}</span>
              </div>
            </div>
            <span class="admin-users7d-label">${label}</span>
          </div>
        `;
      })
      .join("");

    host.innerHTML = `
      <div class="admin-users7d-kpis">
        <div><span>${this.tr("admin.total", {}, "Total")}</span><strong>${total}</strong></div>
        <div><span>${this.tr("admin.avgPerDay", {}, "Ø / Tag")}</span><strong>${avg}</strong></div>
        <div><span>${this.tr("admin.peak", {}, "Peak")}</span><strong>${peak}</strong></div>
      </div>
      <div class="admin-users7d-grid" style="--users7d-cols:${cleanValues.length}">${bars}</div>
    `;
  }

  extractDayMonth(label) {
    const text = String(label || "").trim();
    const match = text.match(/(\d{1,2})\.(\d{1,2})\.?/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(day) || !Number.isFinite(month)) return null;
    const monthKey = String(month).padStart(2, "0");
    return {
      day,
      month,
      monthKey,
      dayLabel: `${day}.`,
      monthLabel: `${monthKey}`,
    };
  }

  getHistoryMonthOptions(labels = []) {
    const options = [];
    const seen = new Set();
    labels.forEach((label) => {
      const parsed = this.extractDayMonth(label);
      if (!parsed) return;
      if (seen.has(parsed.monthKey)) return;
      seen.add(parsed.monthKey);
      options.push({
        value: parsed.monthKey,
        text: this.getMonthDisplayLabel(parsed.month),
      });
    });
    return options;
  }

  getMonthDisplayLabel(monthNumber) {
    const idx = Number(monthNumber) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx > 11)
      return String(monthNumber);
    const lang = this.getCurrentLang();
    return new Intl.DateTimeFormat(lang, { month: "long" }).format(
      new Date(2020, idx, 1),
    );
  }

  updateHistoryMonthSelect(labels = []) {
    const select = document.getElementById("admin-history-month-select");
    if (!select) return;

    const options = this.getHistoryMonthOptions(labels);
    if (!options.length) {
      select.innerHTML = `<option value="latest">${this.tr("admin.month", {}, "Monat")}</option>`;
      select.disabled = true;
      return;
    }

    const latestValue = options[options.length - 1].value;
    if (
      this.selectedHistoryMonth === "latest" ||
      !options.some((opt) => opt.value === this.selectedHistoryMonth)
    ) {
      this.selectedHistoryMonth = latestValue;
    }

    select.innerHTML = options
      .map(
        (opt) =>
          `<option value="${opt.value}" ${opt.value === this.selectedHistoryMonth ? "selected" : ""}>${opt.text}</option>`,
      )
      .join("");
    select.disabled = this.historyRange !== "month";
  }

  filterDailySeries(labels = [], values = []) {
    const entries = labels.map((label, idx) => ({
      label,
      value: Number(values[idx]) || 0,
      parsed: this.extractDayMonth(label),
    }));

    if (this.historyRange === "month") {
      const monthOptions = this.getHistoryMonthOptions(labels);
      const fallbackMonth = monthOptions.length
        ? monthOptions[monthOptions.length - 1].value
        : null;
      const monthKey = this.selectedHistoryMonth || fallbackMonth;
      return entries.filter((item) => item.parsed?.monthKey === monthKey);
    }

    const rangeLimits = {
      "7d": 7,
      "14d": 14,
      "30d": 30,
    };
    const limit = rangeLimits[this.historyRange] || 30;
    return entries.slice(-limit);
  }

  paintDailyTrendline(host, values = []) {
    const svg = host?.querySelector(".admin-history-line");
    const barsHost = host?.querySelector(".admin-history-daily-bars");
    if (!svg || !barsHost) return;

    const barEls = Array.from(
      barsHost.querySelectorAll(".admin-history-bar-track .admin-history-bar"),
    );
    if (!barEls.length) return;

    const barsRect = barsHost.getBoundingClientRect();
    if (barsRect.width <= 0 || barsRect.height <= 0) return;

    const points = barEls
      .map((barEl) => {
        const barRect = barEl.getBoundingClientRect();
        const x =
          ((barRect.left + barRect.width / 2 - barsRect.left) /
            barsRect.width) *
          100;
        const y = ((barRect.top - barsRect.top) / barsRect.height) * 100;
        return {
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
        };
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    if (!points.length) return;

    const polyline = svg.querySelector("polyline");
    if (!polyline) return;

    polyline.setAttribute(
      "points",
      points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "),
    );

    svg.querySelectorAll("circle").forEach((el) => el.remove());
    points.forEach((p) => {
      const dot = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      dot.setAttribute("cx", p.x.toFixed(2));
      dot.setAttribute("cy", p.y.toFixed(2));
      dot.setAttribute("r", "1.8");
      svg.appendChild(dot);
    });
  }

  renderDailyPeakHistory(targetId, labels = [], values = []) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const filtered = this.filterDailySeries(labels, values);
    if (!filtered.length) {
      host.innerHTML = `<div class="admin-chart-empty">${this.tr("admin.noHistoryData", {}, "Keine History Daten")}</div>`;
      return;
    }

    const viewLabels = filtered.map((entry) => entry.label);
    const viewValues = filtered.map((entry) => entry.value);
    const points = viewValues.length;
    const max = Math.max(1, ...viewValues);
    const avg =
      viewValues.reduce((sum, value) => sum + value, 0) /
      Math.max(1, viewValues.length);
    const total = viewValues.reduce((sum, value) => sum + value, 0);

    const highest = viewValues.length ? Math.max(...viewValues) : 0;
    const lowest = viewValues.length ? Math.min(...viewValues) : 0;

    const yTicks = [max, Math.round(max * 0.66), Math.round(max * 0.33), 0]
      .map((tick) => `<span>${tick}</span>`)
      .join("");

    const cols = viewValues
      .map((value, idx) => {
        const pct =
          value === 0 ? 2 : Math.max(10, Math.round((value / max) * 100));
        const isHighest = value === highest;
        const isLowest = value === lowest;
        const parsed = this.extractDayMonth(viewLabels[idx]);
        const labelText = parsed
          ? parsed.dayLabel
          : String(viewLabels[idx] || "").slice(-5);
        const classes = ["admin-history-daily-col"];
        if (isHighest) classes.push("is-best");
        if (isLowest) classes.push("is-low");
        if (value === 0) classes.push("is-zero");

        return `
          <div class="${classes.join(" ")}" title="${viewLabels[idx]}: ${value}">
              <div class="admin-history-bar-track" style="--bar-pct:${pct.toFixed(2)}">
                <div class="admin-history-bar" style="--bar-pct:${pct.toFixed(2)}">
                  <span class="admin-history-value-pill on-bar">${value}</span>
                </div>
            </div>
            <span class="admin-history-axis-label">${labelText}</span>
          </div>
        `;
      })
      .join("");

    host.innerHTML = `
      <div class="admin-history-kpis">
        <div><span>${this.tr("admin.maxPeak", {}, "Max Peak")}</span><strong>${highest}</strong></div>
        <div><span>${this.tr("admin.avgPeak", {}, "Avg Peak")}</span><strong>${Math.round(avg)}</strong></div>
        <div><span>${this.tr("admin.totalEvents", {}, "Total Events")}</span><strong>${total}</strong></div>
      </div>
      <div class="admin-history-daily-chart">
        <div class="admin-history-y-axis">${yTicks}</div>
        ${
          this.showHistoryTrendline
            ? `<svg class="admin-history-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="" /></svg>`
            : ""
        }
        <div class="admin-history-daily-bars" style="--history-cols:${points}; --history-gap:${points > 24 ? 4 : 8}px;">${cols}</div>
      </div>
      <div class="admin-history-legend">
        <span><i class="swatch best"></i>${this.tr("admin.highestPeak", {}, "Highest Peak")}</span>
        <span><i class="swatch low"></i>${this.tr("admin.lowestPeak", {}, "Lowest Peak")}</span>
        ${this.showHistoryTrendline ? `<span><i class="swatch trend"></i>${this.tr("admin.trend", {}, "Trend")}</span>` : ""}
      </div>
    `;

    if (this.showHistoryTrendline) {
      requestAnimationFrame(() => this.paintDailyTrendline(host, viewValues));
    }
  }

  renderHistorySuite(stats = {}) {
    this.renderDailyPeakHistory(
      "admin-chart-watch-daily-peak",
      stats.charts?.watchActivity30d?.labels || [],
      stats.charts?.watchActivity30d?.values || [],
    );

    this.renderMonthComparisonHistory(
      "admin-chart-watch-month-compare",
      stats.charts?.watchActivity12m?.labels || [],
      stats.charts?.watchActivity12m?.values || [],
    );

    this.renderMonthlyPeakHistory(
      "admin-chart-watch-monthly-peak",
      stats.charts?.watchActivity12m?.labels || [],
      stats.charts?.watchActivity12m?.values || [],
    );
  }

  renderMonthComparisonHistory(targetId, monthLabels = [], monthValues = []) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const cleanValues = monthValues.map((v) => Number(v) || 0);
    const current = cleanValues[cleanValues.length - 1] || 0;
    const previous = cleanValues[cleanValues.length - 2] || 0;

    const currentLabel =
      monthLabels[monthLabels.length - 1] ||
      this.tr("admin.current", {}, "Current");
    const previousLabel =
      monthLabels[monthLabels.length - 2] ||
      this.tr("admin.previous", {}, "Previous");

    const dataset = [
      { label: this.tr("admin.peak", {}, "Peak"), current, previous },
      {
        label: this.tr("admin.avgPeak", {}, "Avg Peak"),
        current: Math.round((current + previous) / 2),
        previous: Math.max(0, Math.round(previous * 0.9)),
      },
      {
        label: this.tr("admin.daysTracked", {}, "Days Tracked"),
        current: 30,
        previous: 31,
      },
    ];

    const max = Math.max(
      1,
      ...dataset.map((row) => row.current),
      ...dataset.map((row) => row.previous),
    );

    const deltaPct =
      previous > 0
        ? (((current - previous) / previous) * 100).toFixed(1)
        : current > 0
          ? "100.0"
          : "0.0";

    const rows = dataset
      .map((row) => {
        const currentPct = Math.max(8, Math.round((row.current / max) * 100));
        const previousPct = Math.max(8, Math.round((row.previous / max) * 100));
        return `
          <div class="admin-history-compare-col">
            <div class="admin-history-compare-bars">
              <div class="bar-current" style="height:${currentPct}%" title="${currentLabel}: ${row.current}"></div>
              <div class="bar-previous" style="height:${previousPct}%" title="${previousLabel}: ${row.previous}"></div>
            </div>
            <div class="admin-history-compare-meta">
              <strong>${row.current} / ${row.previous}</strong>
              <span>${row.label}</span>
            </div>
          </div>
        `;
      })
      .join("");

    host.innerHTML = `
      <div class="admin-history-compare-topline">
        <span>${currentLabel} ${this.tr("admin.vs", {}, "vs")} ${previousLabel}</span>
        <strong class="${Number(deltaPct) >= 0 ? "positive" : "negative"}">${Number(deltaPct) >= 0 ? "+" : ""}${deltaPct}%</strong>
      </div>
      <div class="admin-history-compare-grid-inner">${rows}</div>
    `;
  }

  renderMonthlyPeakHistory(targetId, labels = [], values = []) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const cleanValues = values.map((v) => Number(v) || 0);
    const points = Math.min(6, cleanValues.length);
    if (points === 0) {
      host.innerHTML = `<div class="admin-chart-empty">${this.tr("admin.noMonthlyData", {}, "Keine Monatsdaten")}</div>`;
      return;
    }

    const viewLabels = labels.slice(-points);
    const viewValues = cleanValues.slice(-points);
    const max = Math.max(1, ...viewValues);
    const top = viewValues.length ? Math.max(...viewValues) : 0;
    const low = viewValues.length ? Math.min(...viewValues) : 0;

    host.innerHTML = viewValues
      .map((value, idx) => {
        const pct =
          value === 0 ? 2 : Math.max(10, Math.round((value / max) * 100));
        const classes = ["admin-history-month-col"];
        if (value === top) classes.push("is-best");
        if (value === low) classes.push("is-low");
        if (value === 0) classes.push("is-zero");

        return `
          <div class="${classes.join(" ")}" title="${viewLabels[idx]}: ${value}">
            <div class="admin-history-month-track" style="--bar-pct:${pct.toFixed(2)}">
              <div class="admin-history-month-bar" style="--bar-pct:${pct.toFixed(2)}">
                <span class="admin-history-value-pill on-bar">${value}</span>
              </div>
            </div>
            <span class="admin-history-axis-label">${viewLabels[idx]}</span>
          </div>
        `;
      })
      .join("");
  }

  clampPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  renderTrafficCluster(targetId, stats = {}) {
    const host = document.getElementById(targetId);
    if (!host) return;

    const totalTrafficMbps = Number(stats.server?.network?.totalRateMbps) || 0;

    const cpuUsagePct = Number(stats.server?.cpu?.usagePct);
    const cpuPct = Number.isFinite(cpuUsagePct)
      ? this.clampPercent(cpuUsagePct)
      : (() => {
          const cpuCores = Math.max(1, Number(stats.server?.cpuCores) || 1);
          const load1 = Number(stats.server?.loadAvg?.[0]) || 0;
          return this.clampPercent((load1 / cpuCores) * 100);
        })();

    const mem = stats.server?.memory || {};
    const systemUsedMb = Number(mem.systemUsedMb);
    const systemTotalMb = Number(mem.systemTotalMb);
    const fallbackUsed = Number(mem.rssMb) || 0;
    const fallbackTotal = Math.max(1, Number(mem.heapTotalMb) || 1);
    const ramPct =
      Number.isFinite(systemUsedMb) &&
      Number.isFinite(systemTotalMb) &&
      systemTotalMb > 0
        ? this.clampPercent((systemUsedMb / systemTotalMb) * 100)
        : this.clampPercent((fallbackUsed / fallbackTotal) * 100);

    const trafficPctRaw = Number(stats.server?.network?.utilizationPct);
    const trafficPct = Number.isFinite(trafficPctRaw)
      ? this.clampPercent(trafficPctRaw)
      : this.clampPercent((totalTrafficMbps / 60) * 100);

    const diskReadMbps = Number(stats.server?.disk?.readRateMBps) || 0;
    const diskWriteMbps = Number(stats.server?.disk?.writeRateMBps) || 0;
    const diskReadPct = this.clampPercent(
      stats.server?.disk?.readUtilizationPct || 0,
    );
    const diskWritePct = this.clampPercent(
      stats.server?.disk?.writeUtilizationPct || 0,
    );
    const hasDisk = Boolean(stats.server?.disk?.available);

    const ringCards = [
      {
        title: this.tr("admin.cpu", {}, "CPU"),
        pct: cpuPct,
        color: "#ffb300",
        value: `${cpuPct}%`,
        sub: `Load ${Number(stats.server?.cpu?.load1 || 0).toFixed(2)}`,
      },
      {
        title: this.tr("admin.ram", {}, "RAM"),
        pct: ramPct,
        color: "#00d5ff",
        value: `${ramPct}%`,
        sub: this.formatMemoryPair(systemUsedMb || 0, systemTotalMb || 0),
      },
      {
        title: this.tr("admin.trafficLoad", {}, "TRAFFIC"),
        pct: trafficPct,
        color: "#7bdcff",
        value: `${trafficPct}%`,
        sub: this.formatTrafficRateMbps(totalTrafficMbps),
      },
      {
        title: this.tr("admin.write", {}, "WRITE"),
        pct: hasDisk ? diskWritePct : 0,
        color: "#d294ff",
        value: hasDisk ? `${diskWritePct}%` : "N/A",
        sub: hasDisk
          ? `${diskWriteMbps.toFixed(1)} MB/s`
          : this.tr("admin.notAvailable", {}, "Nicht verfuegbar"),
      },
      {
        title: this.tr("admin.read", {}, "READ"),
        pct: hasDisk ? diskReadPct : 0,
        color: "#a9b4ff",
        value: hasDisk ? `${diskReadPct}%` : "N/A",
        sub: hasDisk
          ? `${diskReadMbps.toFixed(1)} MB/s`
          : this.tr("admin.notAvailable", {}, "Nicht verfuegbar"),
      },
    ];

    host.innerHTML = `
      <div class="admin-system-ring-grid">
        ${ringCards
          .map(
            (card) => `
          <div class="admin-system-ring-card">
            <div class="admin-system-ring-title">${card.title}</div>
            <div class="admin-system-ring" style="--ring-pct:${card.pct}; --ring-color:${card.color};">
              <svg class="admin-system-ring-svg" viewBox="0 0 176 176" aria-hidden="true">
                <circle class="admin-system-ring-track" cx="88" cy="88" r="72"></circle>
                <circle
                  class="admin-system-ring-progress"
                  cx="88"
                  cy="88"
                  r="72"
                  style="--ring-len:${(2 * Math.PI * 72).toFixed(2)}; --ring-off:${(
                    2 *
                    Math.PI *
                    72 *
                    (1 - card.pct / 100)
                  ).toFixed(2)}; stroke:${card.color};"
                ></circle>
              </svg>
              <div class="admin-system-ring-inner">
                <strong>${card.value}</strong>
                <span>${card.sub}</span>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
        <div class="admin-traffic-summary">${this.tr("admin.totalTraffic", {}, "Gesamt Traffic")}: ${this.formatTrafficRateMbps(totalTrafficMbps)}</div>
      </div>
    `;
  }

  renderLayout() {
    const pageHome = document.getElementById("page-home");
    if (!pageHome) return;

    pageHome.innerHTML = `
      <div class="dashboard-content admin-dashboard-content">
        <section class="dashboard-hero admin-dashboard-hero">
          <div class="dashboard-hero-main">
            <div class="dashboard-kicker">${this.tr("admin.kicker", {}, "Admin Control")}</div>
            <h1 class="dashboard-title">${this.tr("admin.title", {}, "Server Dashboard")}</h1>
            <p class="dashboard-subtitle">${this.tr("admin.subtitle", {}, "Live-Statistiken fuer Server, Benutzer und Content.")}</p>
            <div class="dashboard-actions">
              <button class="hero-action-btn" id="admin-refresh-btn">${this.tr("admin.refreshNow", {}, "Jetzt aktualisieren")}</button>
              <button class="hero-action-btn" id="admin-open-settings-btn">${this.tr("admin.openSettings", {}, "Zu den Einstellungen")}</button>
            </div>
          </div>
          <div class="dashboard-hero-stats">
            <div class="dashboard-stat-card">
              <div class="dashboard-stat-label">${this.tr("admin.uptime", {}, "Uptime")}</div>
              <div class="dashboard-stat-value" id="admin-stat-uptime">-</div>
            </div>
            <div class="dashboard-stat-card">
              <div class="dashboard-stat-label">RAM (RSS)</div>
              <div class="dashboard-stat-value" id="admin-stat-ram">-</div>
            </div>
            <div class="dashboard-stat-card">
              <div class="dashboard-stat-label">${this.tr("admin.activeSessions", {}, "Aktive Sessions")}</div>
              <div class="dashboard-stat-value" id="admin-stat-sessions">-</div>
            </div>
            <div class="dashboard-stat-card">
              <div class="dashboard-stat-label">${this.tr("admin.totalUsers", {}, "User gesamt")}</div>
              <div class="dashboard-stat-value" id="admin-stat-users">-</div>
            </div>
          </div>
        </section>

        <section class="dashboard-section admin-system-cluster-section">
          <article class="admin-stat-panel admin-system-cluster-panel">
            <div id="admin-chart-traffic-load" class="admin-traffic-cluster-wrap"></div>
          </article>
        </section>

        <section class="dashboard-section admin-kpi-grid">
          <article class="dashboard-stat-card admin-kpi-card">
            <div class="dashboard-stat-label">${this.tr("admin.contentTotal", {}, "Content Gesamt")} <span class="admin-badge admin-badge-accent">Core</span></div>
            <div class="dashboard-stat-value" id="admin-kpi-content">-</div>
          </article>
          <article class="dashboard-stat-card admin-kpi-card">
            <div class="dashboard-stat-label">${this.tr("admin.enabledSources", {}, "Enabled Sources")} <span class="admin-badge admin-badge-success">Live</span></div>
            <div class="dashboard-stat-value" id="admin-kpi-enabled-sources">-</div>
          </article>
          <article class="dashboard-stat-card admin-kpi-card">
            <div class="dashboard-stat-label">${this.tr("admin.trafficLoad", {}, "Traffic Load")} <span class="admin-badge admin-badge-info">RX/TX</span></div>
            <div class="dashboard-stat-value" id="admin-kpi-traffic">-</div>
          </article>
          <article class="dashboard-stat-card admin-kpi-card">
            <div class="dashboard-stat-label">${this.tr("admin.watchEvents24h", {}, "Watch Events 24h")} <span class="admin-badge admin-badge-warn">Activity</span></div>
            <div class="dashboard-stat-value" id="admin-kpi-watch-24h">-</div>
          </article>
        </section>

        <section class="dashboard-section admin-stats-grid">
          <article class="admin-stat-panel admin-chart-panel">
            <h2>${this.tr("admin.userDistribution", {}, "Benutzerverteilung")}</h2>
            <div id="admin-chart-users-role" class="admin-donut-wrap"></div>
          </article>

          <article class="admin-stat-panel admin-chart-panel">
            <h2>${this.tr("admin.sourceTypes", {}, "Source-Typen")}</h2>
            <div id="admin-chart-sources-type" class="admin-donut-wrap"></div>
          </article>

          <article class="admin-stat-panel admin-chart-panel">
            <h2>${this.tr("admin.contentTypes", {}, "Content-Typen")}</h2>
            <div id="admin-chart-content-type" class="admin-donut-wrap"></div>
          </article>

          <article class="admin-stat-panel admin-chart-panel admin-history-main-card">
            <div class="admin-history-header">
              <h2>${this.tr("admin.dailyPeakConcurrent", {}, "Daily Peak Concurrent Streams")}</h2>
              <div class="admin-history-toolbar" aria-label="${this.tr("admin.historyRange", {}, "History Range")}">
                <button type="button" id="admin-history-line-toggle" class="admin-history-line-toggle ${this.showHistoryTrendline ? "is-active" : ""}" aria-pressed="${this.showHistoryTrendline ? "true" : "false"}">${this.showHistoryTrendline ? this.tr("admin.hideTrend", {}, "Trend aus") : this.tr("admin.showTrend", {}, "Trend an")}</button>
                <button type="button" class="admin-history-chip ${this.historyRange === "7d" ? "is-active" : ""}" data-range="7d">${this.tr("admin.days7", {}, "7 Days")}</button>
                <button type="button" class="admin-history-chip ${this.historyRange === "14d" ? "is-active" : ""}" data-range="14d">${this.tr("admin.days14", {}, "14 Days")}</button>
                <button type="button" class="admin-history-chip ${this.historyRange === "30d" ? "is-active" : ""}" data-range="30d">${this.tr("admin.days30", {}, "30 Days")}</button>
                <button type="button" class="admin-history-chip ${this.historyRange === "month" ? "is-active" : ""}" data-range="month">${this.tr("admin.month", {}, "Monat")}</button>
                <select id="admin-history-month-select" class="admin-history-month-select" aria-label="${this.tr("admin.selectMonth", {}, "Monat waehlen")}"></select>
              </div>
            </div>
            <div id="admin-chart-watch-daily-peak" class="admin-history-daily-grid"></div>
          </article>

          <article class="admin-stat-panel admin-chart-panel admin-history-sub-card">
            <div class="admin-history-header compact">
              <h2>${this.tr("admin.monthComparison", {}, "Month Comparison")}</h2>
            </div>
            <div id="admin-chart-watch-month-compare" class="admin-history-compare-grid"></div>
          </article>

          <article class="admin-stat-panel admin-chart-panel admin-history-sub-card">
            <div class="admin-history-header compact">
              <h2>${this.tr("admin.monthlyPeakTrend", {}, "Monthly Peak Trend")}</h2>
            </div>
            <div id="admin-chart-watch-monthly-peak" class="admin-history-month-grid"></div>
          </article>

          <article class="admin-stat-panel admin-chart-panel">
            <h2>${this.tr("admin.newUsers7d", {}, "Neue User (7 Tage)")}</h2>
            <div id="admin-chart-users-7d" class="admin-users7d-wrap"></div>
          </article>
        </section>
      </div>
    `;

    document
      .getElementById("admin-refresh-btn")
      ?.addEventListener("click", () => this.loadStats({ fromButton: true }));

    document
      .getElementById("admin-open-settings-btn")
      ?.addEventListener("click", () => this.app.navigateTo("settings"));

    pageHome.querySelectorAll(".admin-history-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const selectedRange = btn.dataset.range || "30d";
        if (this.historyRange === selectedRange) return;
        this.historyRange = selectedRange;
        pageHome.querySelectorAll(".admin-history-chip").forEach((chip) => {
          chip.classList.toggle("is-active", chip === btn);
        });
        const monthSelect = document.getElementById(
          "admin-history-month-select",
        );
        if (monthSelect) monthSelect.disabled = this.historyRange !== "month";
        if (this.latestStats) this.renderHistorySuite(this.latestStats);
      });
    });

    document
      .getElementById("admin-history-month-select")
      ?.addEventListener("change", (event) => {
        this.selectedHistoryMonth = event.target.value;
        this.historyRange = "month";
        pageHome.querySelectorAll(".admin-history-chip").forEach((chip) => {
          chip.classList.toggle("is-active", chip.dataset.range === "month");
        });
        if (this.latestStats) this.renderHistorySuite(this.latestStats);
      });

    document
      .getElementById("admin-history-line-toggle")
      ?.addEventListener("click", (event) => {
        this.showHistoryTrendline = !this.showHistoryTrendline;
        const toggleBtn = event.currentTarget;
        toggleBtn.classList.toggle("is-active", this.showHistoryTrendline);
        toggleBtn.setAttribute(
          "aria-pressed",
          this.showHistoryTrendline ? "true" : "false",
        );
        toggleBtn.textContent = this.showHistoryTrendline
          ? this.tr("admin.hideTrend", {}, "Trend aus")
          : this.tr("admin.showTrend", {}, "Trend an");
        if (this.latestStats) this.renderHistorySuite(this.latestStats);
      });
  }

  setRefreshButtonLoading(isLoading) {
    const refreshBtn = document.getElementById("admin-refresh-btn");
    if (!refreshBtn) return;
    refreshBtn.classList.toggle("is-loading", isLoading);
    refreshBtn.disabled = Boolean(isLoading);
    refreshBtn.setAttribute("aria-busy", isLoading ? "true" : "false");
    refreshBtn.textContent = isLoading
      ? this.tr("admin.refreshing", {}, "Aktualisiere...")
      : this.tr("admin.refreshNow", {}, "Jetzt aktualisieren");
  }

  async loadStats({ fromButton = false } = {}) {
    if (this.statsLoading) return;
    this.statsLoading = true;
    if (fromButton) this.setRefreshButtonLoading(true);
    try {
      const stats = await API.admin.getStats();
      this.latestStats = stats;
      this.updateHistoryMonthSelect(
        stats.charts?.watchActivity30d?.labels || [],
      );
      this.applyLiveMetrics(stats);
      this.setText(
        "admin-stat-sessions",
        stats.transcode?.sessionsRunning ?? 0,
      );
      this.setText("admin-stat-users", stats.users?.total ?? 0);
      this.setText("admin-kpi-content", stats.content?.total ?? 0);
      this.setText("admin-kpi-enabled-sources", stats.sources?.enabled ?? 0);
      this.setText(
        "admin-kpi-watch-24h",
        (stats.charts?.watchActivity24h?.values || []).reduce(
          (sum, v) => sum + (Number(v) || 0),
          0,
        ),
      );

      this.renderDonut(
        "admin-chart-users-role",
        stats.charts?.usersByRole?.labels || [],
        stats.charts?.usersByRole?.values || [],
        ["#4cd07b", "#e5a209"],
      );

      this.renderDonut(
        "admin-chart-sources-type",
        stats.charts?.sourcesByType?.labels || [],
        stats.charts?.sourcesByType?.values || [],
        ["#6da8ff", "#ff8b5c", "#8f7cff", "#8a8f98"],
      );

      this.renderDonut(
        "admin-chart-content-type",
        stats.charts?.contentByType?.labels || [],
        stats.charts?.contentByType?.values || [],
        ["#ff6b6b", "#ffd166", "#06d6a0"],
      );
      this.renderHistorySuite(stats);

      this.renderUsers7dCard(
        "admin-chart-users-7d",
        stats.charts?.usersTrend7d?.labels || [],
        stats.charts?.usersTrend7d?.values || [],
      );
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      if (fromButton) this.setRefreshButtonLoading(false);
      this.statsLoading = false;
    }
  }

  async refreshLiveMetrics() {
    if (this.liveMetricsLoading) return;
    this.liveMetricsLoading = true;
    try {
      const liveMetrics = await API.admin.getLiveMetrics();
      this.applyLiveMetrics(liveMetrics);
    } catch (err) {
      console.error("Failed to load live admin metrics:", err);
    } finally {
      this.liveMetricsLoading = false;
    }
  }

  async show() {
    this.renderLayout();
    await this.loadStats();

    window.addEventListener("resize", this._onHistoryResize);

    if (this.liveMetricsTimer) clearInterval(this.liveMetricsTimer);
    this.liveMetricsTimer = setInterval(() => {
      this.refreshLiveMetrics();
    }, 1000);

    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      this.loadStats();
    }, 10000);
  }

  hide() {
    window.removeEventListener("resize", this._onHistoryResize);

    if (this.liveMetricsTimer) {
      clearInterval(this.liveMetricsTimer);
      this.liveMetricsTimer = null;
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

window.AdminDashboardPage = AdminDashboardPage;
