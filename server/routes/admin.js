const express = require("express");
const os = require("os");
const fs = require("fs");
const { execSync } = require("child_process");
const auth = require("../auth");
const db = require("../db");
const { getDb } = require("../db/sqlite");
const transcodeSession = require("../services/transcodeSession");

const router = express.Router();
let lastNetSample = null;
let lastCpuSample = null;
let lastDiskSample = null;
let peakNetRateMbps = 1;
let peakDiskRateMBps = 1;
const configuredNetCapacityMbps = Number(process.env.NETWORK_CAPACITY_MBPS);
const configuredDiskCapacityMBps = Number(process.env.DISK_RW_CAPACITY_MBPS);

router.use(auth.requireAdmin);

function buildPastDayLabels(days) {
  const labels = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(
      d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      }),
    );
  }
  return labels;
}

function countByPastDays(items, days, dateGetter) {
  const labels = buildPastDayLabels(days);
  const counts = new Array(days).fill(0);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (const item of items) {
    const raw = dateGetter(item);
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime()) || date < start) continue;
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const idx = Math.floor((dayStart.getTime() - start.getTime()) / 86400000);
    if (idx >= 0 && idx < days) counts[idx] += 1;
  }

  return { labels, values: counts };
}

function buildRecentDayKeys(days) {
  const keys = [];
  const labels = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
    labels.push(
      d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
    );
  }
  return { keys, labels };
}

function buildRecentMonthKeys(months) {
  const keys = [];
  const labels = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
    labels.push(
      d.toLocaleDateString("de-DE", { month: "2-digit", year: "2-digit" }),
    );
  }
  return { keys, labels };
}

function readNetworkTotals() {
  try {
    if (process.platform === "win32") {
      const out = execSync("netstat -e", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1500,
      });
      const match = out.match(/Bytes\s+(\d+)\s+(\d+)/i);
      if (match) {
        return {
          rxBytes: Number(match[1]) || 0,
          txBytes: Number(match[2]) || 0,
        };
      }
    } else if (process.platform === "linux") {
      const out = fs.readFileSync("/proc/net/dev", "utf8");
      let rx = 0;
      let tx = 0;
      out
        .split("\n")
        .slice(2)
        .forEach((line) => {
          const parts = line
            .trim()
            .split(/[:\s]+/)
            .filter(Boolean);
          if (parts.length >= 10) {
            rx += Number(parts[1]) || 0;
            tx += Number(parts[9]) || 0;
          }
        });
      return { rxBytes: rx, txBytes: tx };
    }
  } catch {
    // Ignore and fallback below.
  }

  return { rxBytes: 0, txBytes: 0 };
}

function readText(path) {
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
}

function parsePositiveNumber(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNegativeNumber(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function getContainerMemoryLimitBytes() {
  if (process.platform !== "linux") return null;

  const v2 = readText("/sys/fs/cgroup/memory.max");
  if (v2 && v2 !== "max") {
    const n = parsePositiveNumber(v2);
    if (n && n < 2 ** 60) return n;
  }

  const v1 = readText("/sys/fs/cgroup/memory/memory.limit_in_bytes");
  if (v1) {
    const n = parsePositiveNumber(v1);
    if (n && n < 2 ** 60) return n;
  }

  return null;
}

function getContainerMemoryUsedBytes() {
  if (process.platform !== "linux") return null;

  const v2 = readText("/sys/fs/cgroup/memory.current");
  if (v2) {
    const n = parsePositiveNumber(v2);
    if (n) return n;
  }

  const v1 = readText("/sys/fs/cgroup/memory/memory.usage_in_bytes");
  if (v1) {
    const n = parsePositiveNumber(v1);
    if (n) return n;
  }

  return null;
}

function getEffectiveCpuCores() {
  let cores =
    typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : os.cpus()?.length || 1;

  if (process.platform === "linux") {
    const cpuMax = readText("/sys/fs/cgroup/cpu.max");
    if (cpuMax) {
      const [quotaRaw, periodRaw] = cpuMax.split(/\s+/);
      if (quotaRaw && periodRaw && quotaRaw !== "max") {
        const quota = parsePositiveNumber(quotaRaw);
        const period = parsePositiveNumber(periodRaw);
        if (quota && period) {
          cores = Math.min(cores, quota / period);
        }
      }
    } else {
      const quota = parsePositiveNumber(
        readText("/sys/fs/cgroup/cpu/cpu.cfs_quota_us"),
      );
      const period = parsePositiveNumber(
        readText("/sys/fs/cgroup/cpu/cpu.cfs_period_us"),
      );
      if (quota && period) {
        cores = Math.min(cores, quota / period);
      }
    }
  }

  return Math.max(1, cores);
}

function readContainerCpuUsageMicros() {
  if (process.platform !== "linux") return null;

  const cpuStatV2 = readText("/sys/fs/cgroup/cpu.stat");
  if (cpuStatV2) {
    const usageLine = cpuStatV2
      .split("\n")
      .find((line) => line.startsWith("usage_usec "));
    if (usageLine) {
      const value = parseNonNegativeNumber(usageLine.split(/\s+/)[1]);
      if (value !== null) return value;
    }
  }

  const cpuAcctNs =
    readText("/sys/fs/cgroup/cpuacct/cpuacct.usage") ||
    readText("/sys/fs/cgroup/cpu,cpuacct/cpuacct.usage");
  if (cpuAcctNs) {
    const valueNs = parseNonNegativeNumber(cpuAcctNs);
    if (valueNs !== null) return valueNs / 1000;
  }

  return null;
}

function sampleContainerCpuPct(cpuCores) {
  const usageMicros = readContainerCpuUsageMicros();
  if (!Number.isFinite(usageMicros)) return null;

  const nowNs = process.hrtime.bigint();

  if (!lastCpuSample || lastCpuSample.kind !== "container") {
    lastCpuSample = { kind: "container", usageMicros, nowNs };
    return 0;
  }

  const deltaMicros = Math.max(0, usageMicros - lastCpuSample.usageMicros);
  const deltaSeconds = Number(nowNs - lastCpuSample.nowNs) / 1e9;

  lastCpuSample = { kind: "container", usageMicros, nowNs };

  if (!(deltaSeconds > 0)) return 0;

  const cpuPct =
    (deltaMicros / 1e6 / (deltaSeconds * Math.max(1, cpuCores))) * 100;
  return Math.max(0, Math.min(100, cpuPct));
}

function sampleSystemCpuPct() {
  const cpus = os.cpus();
  if (!Array.isArray(cpus) || !cpus.length) return 0;

  const totals = cpus.reduce(
    (acc, cpu) => {
      const times = cpu?.times || {};
      const user = Number(times.user) || 0;
      const nice = Number(times.nice) || 0;
      const sys = Number(times.sys) || 0;
      const idle = Number(times.idle) || 0;
      const irq = Number(times.irq) || 0;

      acc.idle += idle;
      acc.total += user + nice + sys + idle + irq;
      return acc;
    },
    { idle: 0, total: 0 },
  );

  if (!lastCpuSample || lastCpuSample.kind !== "system") {
    lastCpuSample = { kind: "system", ...totals };
    return 0;
  }

  const idleDelta = Math.max(0, totals.idle - lastCpuSample.idle);
  const totalDelta = Math.max(0, totals.total - lastCpuSample.total);
  lastCpuSample = { kind: "system", ...totals };

  if (!(totalDelta > 0)) return 0;
  return Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function readContainerIoBytes() {
  if (process.platform !== "linux") return null;

  const ioStat = readText("/sys/fs/cgroup/io.stat");
  if (ioStat) {
    let readBytes = 0;
    let writeBytes = 0;

    ioStat.split("\n").forEach((line) => {
      const rMatch = line.match(/\brbytes=(\d+)/);
      const wMatch = line.match(/\bwbytes=(\d+)/);
      if (rMatch) readBytes += Number(rMatch[1]) || 0;
      if (wMatch) writeBytes += Number(wMatch[1]) || 0;
    });

    if (Number.isFinite(readBytes) && Number.isFinite(writeBytes)) {
      return { readBytes, writeBytes, scope: "container" };
    }
  }

  const blkioText =
    readText("/sys/fs/cgroup/blkio/blkio.io_service_bytes_recursive") ||
    readText("/sys/fs/cgroup/blkio/blkio.throttle.io_service_bytes");
  if (blkioText) {
    let readBytes = 0;
    let writeBytes = 0;

    blkioText.split("\n").forEach((line) => {
      const match = line.match(/^\S+\s+(Read|Write)\s+(\d+)$/i);
      if (!match) return;
      const op = match[1].toLowerCase();
      const value = Number(match[2]) || 0;
      if (op === "read") readBytes += value;
      if (op === "write") writeBytes += value;
    });

    if (Number.isFinite(readBytes) && Number.isFinite(writeBytes)) {
      return { readBytes, writeBytes, scope: "container" };
    }
  }

  return null;
}

function readHostDiskIoBytes() {
  if (process.platform !== "linux") return null;
  const diskStats = readText("/proc/diskstats");
  if (!diskStats) return null;

  let readSectors = 0;
  let writeSectors = 0;
  diskStats.split("\n").forEach((line) => {
    const parts = String(line || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length < 14) return;

    const device = parts[2];
    const isWholeDisk =
      /^(sd[a-z]+|hd[a-z]+|vd[a-z]+|xvd[a-z]+|nvme\d+n\d+|mmcblk\d+|dm-\d+|md\d+)$/i.test(
        device,
      );
    if (!isWholeDisk) return;

    readSectors += Number(parts[5]) || 0;
    writeSectors += Number(parts[9]) || 0;
  });

  return {
    readBytes: readSectors * 512,
    writeBytes: writeSectors * 512,
    scope: "host",
  };
}

function readLinuxDiskIoBytes() {
  return readContainerIoBytes() || readHostDiskIoBytes();
}

function readWindowsDiskIoRates() {
  if (process.platform !== "win32") return null;
  try {
    const out = execSync(
      "wmic path Win32_PerfFormattedData_PerfDisk_PhysicalDisk where \"Name='_Total'\" get DiskReadBytesPersec,DiskWriteBytesPersec /value",
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
      },
    );

    const readMatch = out.match(/DiskReadBytesPersec=(\d+)/i);
    const writeMatch = out.match(/DiskWriteBytesPersec=(\d+)/i);
    if (!readMatch || !writeMatch) return null;

    return {
      readBps: Number(readMatch[1]) || 0,
      writeBps: Number(writeMatch[1]) || 0,
    };
  } catch {
    // Fallback for newer Windows where WMIC is unavailable.
    try {
      const out = execSync(
        'typeperf "\\PhysicalDisk(_Total)\\Disk Read Bytes/sec" "\\PhysicalDisk(_Total)\\Disk Write Bytes/sec" -sc 1',
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 3000,
        },
      );

      const lines = out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const csvLine = lines.reverse().find((l) => l.startsWith('"'));
      if (!csvLine) return null;

      const values = csvLine
        .split(",")
        .slice(1)
        .map((v) => v.replace(/"/g, "").trim().replace(/,/g, "."));

      if (values.length < 2) return null;

      const readBps = Number(values[0]);
      const writeBps = Number(values[1]);
      if (!Number.isFinite(readBps) || !Number.isFinite(writeBps)) return null;

      return {
        readBps: Math.max(0, readBps),
        writeBps: Math.max(0, writeBps),
      };
    } catch {
      return null;
    }
  }
}

router.get("/stats", async (req, res) => {
  try {
    const users = await db.users.getAll();
    const allSources = await db.sources.getAll();
    const sessions = transcodeSession.getAllSessions();
    const sqlite = getDb();

    const adminIds = new Set(
      users.filter((u) => u.role === "admin").map((u) => Number(u.id)),
    );

    const sources = allSources.filter((s) => {
      if (s?.is_admin_managed_global === true) return true;
      const ownerId = Number(s?.owner_user_id);
      return Number.isFinite(ownerId) && adminIds.has(ownerId);
    });
    const sourceIds = sources
      .map((s) => Number(s.id))
      .filter((id) => Number.isFinite(id));

    let contentRows = [];
    if (sourceIds.length > 0) {
      const placeholders = sourceIds.map(() => "?").join(",");
      contentRows = sqlite
        .prepare(
          `
            SELECT type, COUNT(*) AS total
            FROM playlist_items
            WHERE source_id IN (${placeholders})
            GROUP BY type
          `,
        )
        .all(...sourceIds);
    }

    const content = {
      live: 0,
      movie: 0,
      series: 0,
      total: 0,
    };

    for (const row of contentRows) {
      const key = String(row.type || "").toLowerCase();
      const value = Number(row.total) || 0;
      if (Object.prototype.hasOwnProperty.call(content, key)) {
        content[key] = value;
      }
      content.total += value;
    }

    const usersAdmin = users.filter((u) => u.role === "admin").length;
    const usersViewer = users.filter((u) => u.role !== "admin").length;
    const sourcesEnabled = sources.filter((s) => s.enabled).length;
    const sessionsRunning = sessions.filter(
      (s) => s.status === "running",
    ).length;
    const sourcesByType = {
      xtream: 0,
      m3u: 0,
      epg: 0,
      other: 0,
    };

    for (const source of sources) {
      const type = String(source.type || "").toLowerCase();
      if (type === "xtream" || type === "m3u" || type === "epg") {
        sourcesByType[type] += 1;
      } else {
        sourcesByType.other += 1;
      }
    }

    const userTrend7d = countByPastDays(users, 7, (u) => u.createdAt);
    const sourceTrend7d = countByPastDays(
      sources,
      7,
      (s) => s.created_at || s.createdAt,
    );

    const nowMs = Date.now();
    const hourMs = 3600000;
    const watchActivity24h = new Array(24).fill(0);
    let watchRows = [];
    if (sourceIds.length > 0) {
      const placeholders = sourceIds.map(() => "?").join(",");
      watchRows = sqlite
        .prepare(
          `
            SELECT updated_at
            FROM watch_history
            WHERE updated_at >= ?
              AND source_id IN (${placeholders})
          `,
        )
        .all(nowMs - 24 * hourMs, ...sourceIds);
    }

    for (const row of watchRows) {
      const ts = Number(row.updated_at) || 0;
      const diff = nowMs - ts;
      if (diff < 0 || diff > 24 * hourMs) continue;
      const bucket = 23 - Math.floor(diff / hourMs);
      if (bucket >= 0 && bucket < 24) watchActivity24h[bucket] += 1;
    }

    const watchLabels24h = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(nowMs - (23 - i) * hourMs);
      return `${String(d.getHours()).padStart(2, "0")}:00`;
    });

    const watch30d = { labels: [], values: [] };
    const watch12m = { labels: [], values: [] };
    if (sourceIds.length > 0) {
      const placeholders = sourceIds.map(() => "?").join(",");

      const dayRows = sqlite
        .prepare(
          `
            SELECT strftime('%Y-%m-%d', updated_at / 1000, 'unixepoch', 'localtime') AS day_key,
                   COUNT(*) AS total
            FROM watch_history
            WHERE updated_at >= ?
              AND source_id IN (${placeholders})
            GROUP BY day_key
            ORDER BY day_key ASC
          `,
        )
        .all(nowMs - 30 * 86400000, ...sourceIds);

      const monthRows = sqlite
        .prepare(
          `
            SELECT strftime('%Y-%m', updated_at / 1000, 'unixepoch', 'localtime') AS month_key,
                   COUNT(*) AS total
            FROM watch_history
            WHERE updated_at >= ?
              AND source_id IN (${placeholders})
            GROUP BY month_key
            ORDER BY month_key ASC
          `,
        )
        .all(nowMs - 370 * 86400000, ...sourceIds);

      const dayMap = new Map(
        dayRows.map((r) => [String(r.day_key || ""), Number(r.total) || 0]),
      );
      const monthMap = new Map(
        monthRows.map((r) => [String(r.month_key || ""), Number(r.total) || 0]),
      );

      const recentDays = buildRecentDayKeys(30);
      watch30d.labels = recentDays.labels;
      watch30d.values = recentDays.keys.map((k) => dayMap.get(k) || 0);

      const recentMonths = buildRecentMonthKeys(12);
      watch12m.labels = recentMonths.labels;
      watch12m.values = recentMonths.keys.map((k) => monthMap.get(k) || 0);
    }

    const mem = process.memoryUsage();
    const hostTotalBytes = os.totalmem();
    const hostUsedBytes = Math.max(0, hostTotalBytes - os.freemem());
    const containerLimitBytes = getContainerMemoryLimitBytes();
    const containerUsedBytes = getContainerMemoryUsedBytes();
    const effectiveTotalBytes = containerLimitBytes
      ? Math.min(hostTotalBytes, containerLimitBytes)
      : hostTotalBytes;
    const effectiveUsedBytes = Math.min(
      effectiveTotalBytes,
      containerUsedBytes ?? hostUsedBytes,
    );
    const effectiveFreeBytes = Math.max(
      0,
      effectiveTotalBytes - effectiveUsedBytes,
    );

    const systemTotalMb = Math.round(effectiveTotalBytes / (1024 * 1024));
    const systemFreeMb = Math.round(effectiveFreeBytes / (1024 * 1024));
    const systemUsedMb = Math.round(effectiveUsedBytes / (1024 * 1024));

    const cpuCores = getEffectiveCpuCores();
    const containerCpuPct = sampleContainerCpuPct(cpuCores);
    const cpuUsagePct = containerCpuPct ?? sampleSystemCpuPct();
    const cpuSource = Number.isFinite(containerCpuPct) ? "container" : "system";

    const netNow = readNetworkTotals();
    const sampledAt = Date.now();
    let rxRate = 0;
    let txRate = 0;
    if (lastNetSample) {
      const elapsed = Math.max(1, sampledAt - lastNetSample.at) / 1000;
      rxRate = Math.max(0, netNow.rxBytes - lastNetSample.rxBytes) / elapsed;
      txRate = Math.max(0, netNow.txBytes - lastNetSample.txBytes) / elapsed;
    }
    lastNetSample = {
      at: sampledAt,
      rxBytes: netNow.rxBytes,
      txBytes: netNow.txBytes,
    };

    const rxRateMbps = (rxRate * 8) / 1_000_000;
    const txRateMbps = (txRate * 8) / 1_000_000;
    const totalRateMbps = rxRateMbps + txRateMbps;
    peakNetRateMbps = Math.max(totalRateMbps, peakNetRateMbps * 0.985, 1);
    const effectiveNetCapacity =
      Number.isFinite(configuredNetCapacityMbps) &&
      configuredNetCapacityMbps > 0
        ? configuredNetCapacityMbps
        : peakNetRateMbps;
    const networkUtilizationPct =
      effectiveNetCapacity > 0
        ? Math.max(
            0,
            Math.min(100, (totalRateMbps / effectiveNetCapacity) * 100),
          )
        : 0;

    const ioNow = readLinuxDiskIoBytes();
    let diskReadBps = 0;
    let diskWriteBps = 0;
    if (ioNow && lastDiskSample && lastDiskSample.scope === ioNow.scope) {
      const elapsed = Math.max(1, sampledAt - lastDiskSample.at) / 1000;
      diskReadBps =
        Math.max(0, ioNow.readBytes - lastDiskSample.readBytes) / elapsed;
      diskWriteBps =
        Math.max(0, ioNow.writeBytes - lastDiskSample.writeBytes) / elapsed;
    }
    if (ioNow) {
      lastDiskSample = {
        at: sampledAt,
        readBytes: ioNow.readBytes,
        writeBytes: ioNow.writeBytes,
        scope: ioNow.scope,
      };
    }

    const windowsDiskIo = readWindowsDiskIoRates();
    if (!ioNow && windowsDiskIo) {
      diskReadBps = windowsDiskIo.readBps;
      diskWriteBps = windowsDiskIo.writeBps;
    }

    const diskReadMBps = diskReadBps / (1024 * 1024);
    const diskWriteMBps = diskWriteBps / (1024 * 1024);
    const diskTotalMBps = diskReadMBps + diskWriteMBps;
    peakDiskRateMBps = Math.max(diskTotalMBps, peakDiskRateMBps * 0.985, 1);
    const effectiveDiskCapacity =
      Number.isFinite(configuredDiskCapacityMBps) &&
      configuredDiskCapacityMBps > 0
        ? configuredDiskCapacityMBps
        : peakDiskRateMBps;
    const diskUtilizationPct =
      (ioNow || windowsDiskIo) && effectiveDiskCapacity > 0
        ? Math.max(
            0,
            Math.min(100, (diskTotalMBps / effectiveDiskCapacity) * 100),
          )
        : 0;
    const diskReadUtilizationPct =
      effectiveDiskCapacity > 0
        ? Math.max(
            0,
            Math.min(100, (diskReadMBps / effectiveDiskCapacity) * 100),
          )
        : 0;
    const diskWriteUtilizationPct =
      effectiveDiskCapacity > 0
        ? Math.max(
            0,
            Math.min(100, (diskWriteMBps / effectiveDiskCapacity) * 100),
          )
        : 0;

    res.json({
      timestamp: Date.now(),
      server: {
        uptimeSec: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        cpuCores: round1(cpuCores),
        loadAvg: os.loadavg(),
        cpu: {
          usagePct: round1(cpuUsagePct),
          load1: round1(os.loadavg()[0] || 0),
          source: cpuSource,
        },
        memory: {
          rssMb: Math.round(mem.rss / (1024 * 1024)),
          heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
          systemTotalMb,
          systemFreeMb,
          systemUsedMb,
        },
        network: {
          rxTotalMb: Math.round(netNow.rxBytes / (1024 * 1024)),
          txTotalMb: Math.round(netNow.txBytes / (1024 * 1024)),
          rxRateMbps: round1(rxRateMbps),
          txRateMbps: round1(txRateMbps),
          totalRateMbps: round1(totalRateMbps),
          capacityMbps: round1(effectiveNetCapacity),
          utilizationPct: round1(networkUtilizationPct),
          rxRateKbps: Math.round((rxRate * 8) / 1000),
          txRateKbps: Math.round((txRate * 8) / 1000),
        },
        disk: {
          available: Boolean(ioNow || windowsDiskIo),
          scope: ioNow?.scope || (windowsDiskIo ? "host" : "none"),
          readRateMBps: round1(diskReadMBps),
          writeRateMBps: round1(diskWriteMBps),
          totalRateMBps: round1(diskTotalMBps),
          capacityMBps: round1(effectiveDiskCapacity),
          utilizationPct: round1(diskUtilizationPct),
          readUtilizationPct: round1(diskReadUtilizationPct),
          writeUtilizationPct: round1(diskWriteUtilizationPct),
        },
      },
      users: {
        total: users.length,
        admins: usersAdmin,
        viewers: usersViewer,
      },
      sources: {
        total: sources.length,
        enabled: sourcesEnabled,
        disabled: Math.max(0, sources.length - sourcesEnabled),
      },
      transcode: {
        sessionsTotal: sessions.length,
        sessionsRunning: sessionsRunning,
      },
      content,
      charts: {
        usersByRole: {
          labels: ["Admins", "Viewer"],
          values: [usersAdmin, usersViewer],
        },
        sourcesByType: {
          labels: ["Xtream", "M3U", "EPG", "Other"],
          values: [
            sourcesByType.xtream,
            sourcesByType.m3u,
            sourcesByType.epg,
            sourcesByType.other,
          ],
        },
        contentByType: {
          labels: ["Live", "Movies", "Series"],
          values: [content.live, content.movie, content.series],
        },
        usersTrend7d: userTrend7d,
        sourcesTrend7d: sourceTrend7d,
        watchActivity24h: {
          labels: watchLabels24h,
          values: watchActivity24h,
        },
        watchActivity30d: watch30d,
        watchActivity12m: watch12m,
      },
    });
  } catch (err) {
    console.error("[Admin] Failed to build stats:", err);
    res.status(500).json({ error: "Failed to load admin stats" });
  }
});

module.exports = router;
