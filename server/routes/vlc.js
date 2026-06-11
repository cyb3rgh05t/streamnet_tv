/**
 * VLC Route
 * Detects VLC installation and launches it with a given stream URL.
 * Windows-only path detection + PATH fallback.
 */

const express = require("express");
const router = express.Router();
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── VLC detection ─────────────────────────────────────────────────────────────

const WINDOWS_VLC_PATHS = [
  "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
  "C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe",
  process.env.LOCALAPPDATA
    ? path.join(
        process.env.LOCALAPPDATA,
        "Programs",
        "VideoLAN",
        "VLC",
        "vlc.exe",
      )
    : null,
].filter(Boolean);

function findVlc() {
  // 1. Check well-known install paths (Windows)
  for (const p of WINDOWS_VLC_PATHS) {
    if (fs.existsSync(p)) return p;
  }

  // 2. Try PATH
  try {
    const result = execSync(
      process.platform === "win32" ? "where vlc" : "which vlc",
      { stdio: ["ignore", "pipe", "ignore"], timeout: 3000 },
    )
      .toString()
      .trim()
      .split(/\r?\n/)[0];
    if (result && fs.existsSync(result)) return result;
  } catch (_) {
    // vlc not in PATH
  }

  return null;
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/vlc/detect
 * Returns { found: bool, path: string|null }
 */
router.get("/detect", (req, res) => {
  const vlcPath = findVlc();
  res.json({ found: !!vlcPath, path: vlcPath });
});

/**
 * POST /api/vlc/launch
 * Body: { url: string, title?: string, hwnd?: string }
 *
 * Without hwnd  → VLC opens its own window (external player mode).
 * With    hwnd  → VLC renders into the native Win32 window created by Tauri
 *                 (embedded / integrated player mode).
 */
router.post("/launch", (req, res) => {
  const { url, title, hwnd } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  // Basic URL validation – must start with http(s) or rtmp(s)
  if (!/^https?:\/\/|^rtmps?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Invalid stream URL" });
  }

  const vlcPath = findVlc();
  if (!vlcPath) {
    return res.status(404).json({
      error: "VLC not found",
      hint: "Install VLC from https://www.videolan.org/vlc/",
    });
  }

  const args = [
    url,
    "--no-video-title-show",
    "--meta-title",
    title || "StreamNet TV",
    // Audio: keep full quality, no transcoding
    "--aout=directsound",
    "--audio-resampler=soxr",
  ];

  if (hwnd) {
    // ── Embedded / integrated mode ───────────────────────────────────────────
    // VLC renders video into the Tauri-created Win32 overlay window.
    // --drawable-hwnd  → embed video output into that HWND
    // --vout=directx   → use DirectX output which supports HWND embedding
    args.push(
      "--drawable-hwnd",
      String(hwnd),
      "--vout=directx",
      "--directx-use-sysmem",
      // Disable VLC's own control surface so it doesn't steal input
      "--no-embedded-video",
      "--no-qt-fs-controller",
    );
    console.log(`[VLC] Embedded launch into HWND ${hwnd}: ${url}`);
  } else {
    // ── External window mode ─────────────────────────────────────────────────
    console.log(`[VLC] External launch: ${url}`);
  }

  try {
    const proc = spawn(vlcPath, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    proc.unref();
    res.json({ ok: true, pid: proc.pid, embedded: !!hwnd });
  } catch (err) {
    console.error("[VLC] Launch failed:", err);
    res
      .status(500)
      .json({ error: "Failed to launch VLC", details: err.message });
  }
});

module.exports = router;
