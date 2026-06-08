const express = require("express");
const router = express.Router();
const { sources } = require("../db");
const { requireAuth } = require("../auth");
const { getDb } = require("../db/sqlite"); // Import SQLite
const xtreamApi = require("../services/xtreamApi");
const epgParser = require("../services/epgParser");
const cache = require("../services/cache");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const { Readable } = require("stream");

// /image is loaded by <img src> tags – browsers can't send Authorization headers for those
router.use((req, res, next) => {
  if (req.path.startsWith("/image")) return next();
  return requireAuth(req, res, next);
});

async function requireOwnedSource(req, res, next) {
  try {
    const sourceId = parseInt(req.params.sourceId);
    if (!Number.isFinite(sourceId)) {
      return res.status(400).json({ error: "Invalid sourceId" });
    }

    const source = await sources.getById(sourceId, req.user.id);
    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }

    req.source = source;
    next();
  } catch (err) {
    console.error("Source ownership check error:", err);
    res.status(500).json({ error: "Failed to validate source ownership" });
  }
}

router.use("/xtream/:sourceId", requireOwnedSource);
router.use("/m3u/:sourceId", requireOwnedSource);
router.use("/epg/:sourceId", requireOwnedSource);
router.use("/cache/:sourceId", requireOwnedSource);

// Default cache max age in hours
const DEFAULT_MAX_AGE_HOURS = 24;

// Helper to get formatted category list from DB
function getCategoriesFromDb(sourceId, type, includeHidden = false) {
  const db = getDb();
  let query = `
        SELECT category_id, name as category_name, parent_id 
        FROM categories 
        WHERE source_id = ? AND type = ?
    `;
  if (!includeHidden) {
    query += ` AND is_hidden = 0`;
  }
  // Preserve provider order from sync metadata when available.
  query += `
    ORDER BY
      CASE
        WHEN json_extract(data, '$.sort_order') IS NULL THEN 1
        ELSE 0
      END,
      CAST(json_extract(data, '$.sort_order') AS INTEGER),
      rowid ASC
  `;
  const cats = db.prepare(query).all(sourceId, type);
  return cats;
}

// Helper to get formatted streams from DB
function getStreamsFromDb(
  sourceId,
  type,
  categoryId = null,
  includeHidden = false,
) {
  const db = getDb();
  let query = `
        SELECT item_id, name, stream_icon, added_at, rating, container_extension, year, category_id, data
        FROM playlist_items 
        WHERE source_id = ? AND type = ?
    `;
  if (!includeHidden) {
    query += ` AND is_hidden = 0`;
  }
  const params = [sourceId, type];

  if (categoryId) {
    query += ` AND category_id = ?`;
    params.push(categoryId);
  }

  // Default sorting
  // query += ` ORDER BY name ASC`; // Sorting usually handled by client

  const items = db.prepare(query).all(...params);

  // Map to Xtream format
  return items.map((item) => {
    const data = JSON.parse(item.data || "{}");
    // Override with our local fields if needed, or just return the mixed object
    // We should ensure critical fields are present
    return {
      ...data,
      stream_id: item.item_id, // ensure ID matches what client expects
      series_id: type === "series" ? item.item_id : undefined,
      name: item.name,
      stream_icon: item.stream_icon,
      cover: item.stream_icon, // series/vod often use cover
      added: item.added_at,
      rating: item.rating,
      container_extension: item.container_extension,
      category_id: item.category_id,
      // Normalize EPG channel ID: Xtream uses epg_channel_id, M3U uses tvgId
      epg_channel_id: data.epg_channel_id || data.tvgId || null,
    };
  });
}

// --- Xtream Codes Proxy API --- //

// Login / Authenticate
router.get("/xtream/:sourceId", async (req, res) => {
  try {
    const source = req.source;
    if (!source || source.type !== "xtream")
      return res.status(404).send("Source not found");

    // Proxy auth check to upstream to ensure credentials are still valid

    const cached = cache.get("xtream", source.id, "auth", 300000);
    if (cached) return res.json(cached);

    const api = xtreamApi.createFromSource(source);
    const data = await api.authenticate();
    cache.set("xtream", source.id, "auth", data);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Upstream error", details: err.message });
  }
});

// Live Categories
router.get("/xtream/:sourceId/live_categories", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const includeHidden = req.query.includeHidden === "true";
    const cats = getCategoriesFromDb(sourceId, "live", includeHidden);
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Live Streams
router.get("/xtream/:sourceId/live_streams", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const categoryId = req.query.category_id;
    const includeHidden = req.query.includeHidden === "true";
    const streams = getStreamsFromDb(
      sourceId,
      "live",
      categoryId,
      includeHidden,
    );
    res.json(streams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// VOD Categories
router.get("/xtream/:sourceId/vod_categories", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const includeHidden = req.query.includeHidden === "true";
    const cats = getCategoriesFromDb(sourceId, "movie", includeHidden);
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// VOD Streams
router.get("/xtream/:sourceId/vod_streams", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const categoryId = req.query.category_id;
    const includeHidden = req.query.includeHidden === "true";
    const streams = getStreamsFromDb(
      sourceId,
      "movie",
      categoryId,
      includeHidden,
    );
    res.json(streams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Series Categories
router.get("/xtream/:sourceId/series_categories", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const includeHidden = req.query.includeHidden === "true";
    const cats = getCategoriesFromDb(sourceId, "series", includeHidden);
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Series
router.get("/xtream/:sourceId/series", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const categoryId = req.query.category_id;
    const includeHidden = req.query.includeHidden === "true";
    const streams = getStreamsFromDb(
      sourceId,
      "series",
      categoryId,
      includeHidden,
    );
    res.json(streams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Series Info (Episodes)
// Proxy series info request
router.get("/xtream/:sourceId/series_info", async (req, res) => {
  try {
    const source = req.source;
    if (!source) return res.status(404).send("Source not found");

    const seriesId = req.query.series_id;
    if (!seriesId) return res.status(400).send("series_id required");

    const cacheKey = `series_info_${seriesId}`;
    const cached = cache.get("xtream", source.id, cacheKey, 3600000);
    if (cached) return res.json(cached);

    const api = xtreamApi.createFromSource(source);
    const data = await api.getSeriesInfo(seriesId);
    cache.set("xtream", source.id, cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Upstream error", details: err.message });
  }
});

// VOD Info
router.get("/xtream/:sourceId/vod_info", async (req, res) => {
  try {
    const source = req.source;
    if (!source) return res.status(404).send("Source not found");

    const vodId = req.query.vod_id;
    if (!vodId) return res.status(400).send("vod_id required");

    const cacheKey = `vod_info_${vodId}`;
    const cached = cache.get("xtream", source.id, cacheKey, 3600000);
    if (cached) return res.json(cached);

    const api = xtreamApi.createFromSource(source);
    const data = await api.getVodInfo(vodId);
    cache.set("xtream", source.id, cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Upstream error", details: err.message });
  }
});

// Get Stream URL for playback
// Returns the direct stream URL for a given stream ID
router.get("/xtream/:sourceId/stream/:streamId/:type", async (req, res) => {
  try {
    const source = req.source;
    if (!source || source.type !== "xtream") {
      return res.status(404).json({ error: "Xtream source not found" });
    }

    const streamId = req.params.streamId;
    const type = req.params.type || "live";
    const container = req.query.container || "m3u8";

    // Construct the Xtream stream URL
    // Format: http://server:port/live/username/password/streamId.container (for live)
    // Format: http://server:port/movie/username/password/streamId.container (for movie)
    // Format: http://server:port/series/username/password/streamId.container (for series)

    let streamUrl;
    const baseUrl = source.url.replace(/\/$/, ""); // Remove trailing slash

    if (type === "live") {
      streamUrl = `${baseUrl}/live/${source.username}/${source.password}/${streamId}.${container}`;
    } else if (type === "movie") {
      streamUrl = `${baseUrl}/movie/${source.username}/${source.password}/${streamId}.${container}`;
    } else if (type === "series") {
      streamUrl = `${baseUrl}/series/${source.username}/${source.password}/${streamId}.${container}`;
    } else {
      return res.status(400).json({ error: "Invalid stream type" });
    }

    res.json({ url: streamUrl });
  } catch (err) {
    console.error("Error getting stream URL:", err);
    res.status(500).json({ error: "Failed to get stream URL" });
  }
});

// --- Other Proxy Routes --- //

// M3U Playlist
// (For M3U sources, we now have data in DB. We can reconstruct M3U or return JSON)
// Frontend ChannelList.js for M3U sources calls `API.proxy.m3u.get(sourceId)`
// which points here. It expects { channels, groups }.
router.get("/m3u/:sourceId", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const includeHidden = req.query.includeHidden === "true";

    // Fetch from DB
    const channels = getStreamsFromDb(sourceId, "live", null, includeHidden);
    const groups = getCategoriesFromDb(sourceId, "live", includeHidden);

    // Format for frontend helper
    // ChannelList expects:
    // {
    //   channels: [ { id, name, groupTitle, url, tvgLogo, ... } ],
    //   groups: [ { id, name, channelCount } ]
    // }
    // Note: DB `live` items from M3U sync have `category_id` as their group name usually.

    const reformattedChannels = channels.map((c) => ({
      ...c,
      id: c.stream_id,
      groupTitle: c.category_id || "Uncategorized",
      url: c.stream_url || c.url,
      tvgLogo: c.stream_icon,
    }));

    const reformattedGroups = groups.map((g) => ({
      id: g.category_id,
      name: g.category_name,
      channelCount: 0, // Frontend calculates this or we can
    }));

    // Add implicit groups check?
    // The frontend M3U parser generates groups from the channels if explicit groups missing.
    // Our SyncService `saveCategories` handles explicit groups.

    res.json({ channels: reformattedChannels, groups: reformattedGroups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// EPG
router.get("/epg/:sourceId", async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId);
    const db = getDb();

    // Time window: 24 hours ago to 24 hours from now
    // This prevents returning millions of rows and crashing the server/browser
    const windowStart = Date.now() - 24 * 60 * 60 * 1000; // -24 hours
    const windowEnd = Date.now() + 24 * 60 * 60 * 1000; // +24 hours

    // Fetch programs within the time window
    let programsQuery = `
            SELECT channel_id as channelId, start_time, end_time, title, description, data 
            FROM epg_programs 
            WHERE source_id = ? AND end_time > ? AND start_time < ?
        `;
    const params = [sourceId, windowStart, windowEnd];

    const programs = db.prepare(programsQuery).all(...params);

    const formattedPrograms = programs.map((p) => ({
      channelId: p.channelId,
      start: new Date(p.start_time).toISOString(), // EpgGuide parse this back
      stop: new Date(p.end_time).toISOString(),
      title: p.title,
      description: p.description,
    }));

    // Fetch EPG channels from playlist_items (type='epg_channel')

    let epgChannels = [];

    // Try getting stored channels first
    const storedChannels = db
      .prepare(
        `
            SELECT item_id as id, name, stream_icon as icon, data 
            FROM playlist_items 
            WHERE source_id = ? AND type = 'epg_channel'
        `,
      )
      .all(sourceId);

    if (storedChannels.length > 0) {
      epgChannels = storedChannels;
    } else {
      // Fallback: Build from unique channelIds in programmes (Legacy behavior)
      const uniqueChannelIds = [...new Set(programs.map((p) => p.channelId))];
      epgChannels = uniqueChannelIds.map((id) => ({
        id: id,
        name: id, // Use channelId as name (fallback)
      }));
    }

    res.json({
      channels: epgChannels,
      programmes: formattedPrograms,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Clear cache (kept for compatibility)
router.delete("/cache/:sourceId", (req, res) => {
  const sourceId = req.params.sourceId;
  cache.clearSource(sourceId);
  res.json({ success: true });
});

/**
 * Proxy Xtream API calls
 * GET /api/proxy/xtream/:sourceId/:action
 */
router.get("/xtream/:sourceId/:action", async (req, res) => {
  try {
    const sourceId = req.params.sourceId;
    const source = req.source;
    if (!source || source.type !== "xtream") {
      return res.status(404).json({ error: "Xtream source not found" });
    }

    const { action } = req.params;
    const {
      category_id,
      stream_id,
      vod_id,
      series_id,
      limit,
      refresh,
      maxAge,
    } = req.query;
    const forceRefresh = refresh === "1";
    const maxAgeHours = parseInt(maxAge) || DEFAULT_MAX_AGE_HOURS;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    // Actions that should be cached
    const cacheableActions = [
      "live_categories",
      "live_streams",
      "vod_categories",
      "vod_streams",
      "series_categories",
      "series",
    ];

    // Build cache key (include category_id if present)
    const cacheKey = category_id ? `${action}_${category_id}` : action;

    // Check cache for cacheable actions
    if (!forceRefresh && cacheableActions.includes(action)) {
      const cached = cache.get("xtream", sourceId, cacheKey, maxAgeMs);
      if (cached) {
        return res.json(cached);
      }
    }

    // Fetch fresh data
    const api = xtreamApi.createFromSource(source);
    let data;
    switch (action) {
      case "auth":
        data = await api.authenticate();
        break;
      case "live_categories":
        data = await api.getLiveCategories();
        break;
      case "live_streams":
        data = await api.getLiveStreams(category_id);
        break;
      case "vod_categories":
        data = await api.getVodCategories();
        break;
      case "vod_streams":
        data = await api.getVodStreams(category_id);
        break;
      case "vod_info":
        data = await api.getVodInfo(vod_id);
        break;
      case "series_categories":
        data = await api.getSeriesCategories();
        break;
      case "series":
        data = await api.getSeries(category_id);
        break;
      case "series_info":
        data = await api.getSeriesInfo(series_id);
        break;
      case "short_epg":
        data = await api.getShortEpg(stream_id, limit);
        break;
      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    // Cache the result for cacheable actions
    if (cacheableActions.includes(action)) {
      cache.set("xtream", sourceId, cacheKey, data);
    }

    res.json(data);
  } catch (err) {
    console.error("Xtream proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Xtream stream URL
 * GET /api/proxy/xtream/:sourceId/stream/:streamId
 */
router.get("/xtream/:sourceId/stream/:streamId/:type?", async (req, res) => {
  try {
    const source = req.source;
    if (!source || source.type !== "xtream") {
      return res.status(404).json({ error: "Xtream source not found" });
    }

    const api = xtreamApi.createFromSource(source);
    const { streamId, type = "live" } = req.params;
    const { container = "m3u8" } = req.query;

    const url = api.buildStreamUrl(streamId, type, container);
    res.json({ url });
  } catch (err) {
    console.error("Stream URL error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Fetch and parse EPG (with file-based caching)
 * GET /api/proxy/epg/:sourceId
 * Query params:
 *   - refresh=1  Force refresh, bypass cache
 *   - maxAge=N   Max cache age in hours (default 24)
 */
router.get("/epg/:sourceId", async (req, res) => {
  try {
    const sourceId = req.params.sourceId;
    const source = req.source;
    if (!source || (source.type !== "epg" && source.type !== "xtream")) {
      return res.status(404).json({ error: "Valid EPG source not found" });
    }

    const forceRefresh = req.query.refresh === "1";
    const maxAgeHours = parseInt(req.query.maxAge) || DEFAULT_MAX_AGE_HOURS;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    // Check file cache (unless force refresh)
    if (!forceRefresh) {
      const cached = cache.get("epg", sourceId, "data", maxAgeMs);
      if (cached) {
        return res.json(cached);
      }
    }

    // Fetch fresh data
    let url = source.url;
    if (source.type === "xtream") {
      const api = xtreamApi.createFromSource(source);
      url = api.getXmltvUrl();
    }

    const data = await epgParser.fetchAndParse(url);

    // Store in file cache
    cache.set("epg", sourceId, "data", data);

    res.json(data);
  } catch (err) {
    console.error("EPG proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Clear cache for a source
 * DELETE /api/proxy/cache/:sourceId
 */
router.delete("/cache/:sourceId", (req, res) => {
  const sourceId = req.params.sourceId;
  cache.clearSource(sourceId);
  res.json({ success: true });
});

/**
 * Clear EPG cache for a source (legacy endpoint, calls clearSource)
 * DELETE /api/proxy/epg/:sourceId/cache
 */
router.delete("/epg/:sourceId/cache", (req, res) => {
  const sourceId = req.params.sourceId;
  cache.clear("epg", sourceId, "data");
  res.json({ success: true });
});

/**
 * Get EPG for specific channels
 * POST /api/proxy/epg/:sourceId/channels
 */
router.post("/epg/:sourceId/channels", async (req, res) => {
  try {
    const source = req.source;
    if (!source || source.type !== "epg") {
      return res.status(404).json({ error: "EPG source not found" });
    }

    const { channelIds } = req.body;
    if (!channelIds || !Array.isArray(channelIds)) {
      return res.status(400).json({ error: "channelIds array required" });
    }

    const data = await epgParser.fetchAndParse(source.url);

    // Filter programmes for requested channels
    const result = {};
    for (const channelId of channelIds) {
      result[channelId] = epgParser.getCurrentAndUpcoming(
        data.programmes,
        channelId,
      );
    }

    res.json(result);
  } catch (err) {
    console.error("EPG channels error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Proxy stream for playback
 * This handles CORS for streams that don't allow cross-origin
 * Supports HTTP Range requests for video seeking
 */
router.get("/stream", async (req, res) => {
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: "URL required" });
      }

      // Forward some headers to be more "transparent" back to the origin
      // Pluto TV uses multiple domains for content delivery
      const plutoDomains = [
        "pluto.tv",
        "pluto.io",
        "plutotv.net",
        "siloh.pluto.tv",
        "service-stitcher",
      ];
      const isPluto = plutoDomains.some((domain) => url.includes(domain));

      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        // Using https and matching the origin of the request
        Origin: isPluto ? "https://pluto.tv" : new URL(url).origin,
        Referer: isPluto ? "https://pluto.tv/" : new URL(url).origin + "/",
      };

      // Forward Range header for video seeking support
      const rangeHeader = req.get("range");
      if (rangeHeader) {
        headers["Range"] = rangeHeader;
      }

      const response = await fetch(url, { headers });

      // Retry on 5xx errors (transient upstream issues)
      if (response.status >= 500 && attempt < maxRetries) {
        console.log(
          `[Proxy] Upstream 5xx error (attempt ${attempt}/${maxRetries}), retrying in 500ms...`,
        );
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      if (!response.ok) {
        console.error(
          `Upstream error for ${url.substring(0, 80)}...: ${response.status} ${response.statusText}`,
        );
        if (response.status === 403) {
          const errorBody = await response.text().catch(() => "N/A");
          console.error(`403 Response body: ${errorBody.substring(0, 200)}`);
        }
        return res
          .status(response.status)
          .send(`Failed to fetch stream: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      res.set("Access-Control-Allow-Origin", "*");

      // Forward range-related headers for video seeking support
      const contentLength = response.headers.get("content-length");
      const contentRange = response.headers.get("content-range");
      const acceptRanges = response.headers.get("accept-ranges");

      if (contentLength) {
        res.set("Content-Length", contentLength);
      }
      if (contentRange) {
        res.set("Content-Range", contentRange);
      }
      if (acceptRanges) {
        res.set("Accept-Ranges", acceptRanges);
      } else if (contentLength && !contentRange) {
        // If server supports content-length but didn't explicitly state accept-ranges,
        // we can safely assume it supports byte ranges
        res.set("Accept-Ranges", "bytes");
      }

      // Set status code (206 for partial content when range request was made)
      res.status(response.status);

      // Create an async iterator for the response body
      const iterator = response.body[Symbol.asyncIterator]();
      const first = await iterator.next();

      if (first.done) {
        res.set("Content-Type", contentType || "application/octet-stream");
        return res.end();
      }

      const firstChunk = Buffer.from(first.value);

      // Peek at first bytes to check for HLS manifest ({ #EXTM3U })
      const textPrefix = firstChunk.subarray(0, 7).toString("utf8");
      const contentLooksLikeHls = textPrefix === "#EXTM3U";

      if (contentLooksLikeHls) {
        // HLS Manifest: We must read the WHOLE manifest to rewrite it
        const chunks = [firstChunk];

        // Consume the rest of the stream
        let result = await iterator.next();
        while (!result.done) {
          chunks.push(Buffer.from(result.value));
          result = await iterator.next();
        }

        const buffer = Buffer.concat(chunks);
        const finalUrl = response.url || url;
        console.log(
          `[Proxy] Processing HLS manifest from: ${finalUrl.substring(0, 80)}...`,
        );
        res.set("Content-Type", "application/vnd.apple.mpegurl");

        let manifest = buffer.toString("utf-8");

        const finalUrlObj = new URL(finalUrl);
        const baseUrl =
          finalUrlObj.origin +
          finalUrlObj.pathname.substring(
            0,
            finalUrlObj.pathname.lastIndexOf("/") + 1,
          );

        manifest = manifest
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();
            if (trimmed === "" || trimmed.startsWith("#")) {
              // Handle both URI="..." and URI='...' formats
              if (trimmed.includes("URI=")) {
                // Replace both double and single quoted URIs
                return line.replace(/URI=["']([^"']+)["']/g, (match, p1) => {
                  try {
                    const absoluteUrl = new URL(p1, baseUrl).href;
                    return `URI="${req.protocol}://${req.get("host")}${req.baseUrl}/stream?url=${encodeURIComponent(absoluteUrl)}"`;
                  } catch (e) {
                    return match;
                  }
                });
              }
              return line;
            }

            // Stream URL handling
            try {
              let absoluteUrl;
              if (
                trimmed.startsWith("http://") ||
                trimmed.startsWith("https://")
              ) {
                absoluteUrl = trimmed;
              } else {
                absoluteUrl = new URL(trimmed, baseUrl).href;
              }
              return `${req.protocol}://${req.get("host")}${req.baseUrl}/stream?url=${encodeURIComponent(absoluteUrl)}`;
            } catch (e) {
              return line;
            }
          })
          .join("\n");

        return res.send(manifest);
      }

      // Binary content (Video Segment or Key): Collect and send
      console.log(`[Proxy] Serving binary content (${contentType})`);
      res.set("Content-Type", contentType || "application/octet-stream");

      // For small files (like encryption keys), collect all data and send at once
      // This ensures proper Content-Length and response completion
      const chunks = [firstChunk];
      let result = await iterator.next();
      while (!result.done) {
        chunks.push(Buffer.from(result.value));
        result = await iterator.next();
      }
      const fullContent = Buffer.concat(chunks);

      // Set Content-Length for proper client handling
      res.set("Content-Length", fullContent.length);
      res.send(fullContent);
      return; // Success - exit the retry loop
    } catch (err) {
      lastError = err;
      console.error(
        `Stream proxy error (attempt ${attempt}/${maxRetries}):`,
        err.message,
      );
      if (attempt < maxRetries) {
        console.log("[Proxy] Retrying after error...");
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }
  }

  // All retries failed
  if (!res.headersSent) {
    res.status(500).json({
      error: lastError?.message || "Stream proxy failed after retries",
    });
  }
});

// ── Metadata API keys ─────────────────────────────────────────────────────────
const TMDB_API_KEY =
  process.env.TMDB_API_KEY || "e7d2628727fa893ec3692d18f8a4aec2";
const FANART_API_KEY =
  process.env.FANART_API_KEY || "f770c8b5773b646040ed1cb8304a21d9";
const TVDB_API_KEY =
  process.env.TVDB_API_KEY || "71d3ff6f-a7b6-4930-ae6f-4841722161e3";
const tmdbBase = "https://api.themoviedb.org/3";
const tmdbImageBase = "https://image.tmdb.org/t/p";
const fanartBase = "https://webservice.fanart.tv/v3";
const tvdbBase = "https://api4.thetvdb.com/v4";

// ── TVDB JWT token cache ───────────────────────────────────────────────────────
let _tvdbToken = null;
let _tvdbTokenExpiry = 0;
async function getTvdbToken() {
  if (_tvdbToken && Date.now() < _tvdbTokenExpiry) return _tvdbToken;
  try {
    const resp = await fetch(`${tvdbBase}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: TVDB_API_KEY }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    _tvdbToken = data?.data?.token || null;
    // tokens valid for 30 days; refresh after 23h
    _tvdbTokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return _tvdbToken;
  } catch {
    return null;
  }
}

// ── Title cleaning (strips IPTV prefixes / quality tags / S01E01 etc.) ────────
function cleanSearchTitle(raw) {
  let t = String(raw || "").trim();
  // Leading country/language prefix: "DE | ", "[DE] ", "DE: ", "| DE | "
  t = t.replace(/^(?:\|?\s*[A-Z]{2,4}\s*[\|:]\s*)+/, "");
  // Quality tags in brackets: [4K], (1080p), [HD FHD UHD]
  t = t.replace(
    /\s*[\[\(][^\[\]()]*(?:4K|UHD|FHD|1080p?|720p?|480p?|2160p?|HD)[^\[\]()]*[\]\)]/gi,
    "",
  );
  // Standalone quality words
  t = t.replace(/\s*\b(4K|UHD|FHD|1080p?|720p?|2160p?)\b\s*/gi, " ");
  // Season/episode suffix: S01E01, S1 E1, - S01, Season 1
  t = t.replace(
    /\s*[-–]?\s*S(?:eason\s*)?\d+\s*(?:[-\s]?E(?:p(?:isode\s*)?)?\d+)?.*$/i,
    "",
  );
  t = t.replace(/\s*[-–]?\s*Episode\s+\d+.*$/i, "");
  // Trailing year ranges: "(2016)", "[2016]", "(2016-)", "(2016-2022)"
  t = t.replace(/\s*[\(\[]\s*\d{4}\s*(?:[-–]\s*(?:\d{4})?)?\s*[\)\]]\s*$/, "");
  // Trailing country codes: "(DE)", "[DE]"
  t = t.replace(/\s*[\(\[]\s*[A-Z]{2,3}\s*[\)\]]\s*$/, "");
  // Leading/trailing punctuation
  t = t.replace(/^[\s|\-–:.]+/, "").replace(/[\s|\-–:.]+$/, "");
  return t.replace(/\s{2,}/g, " ").trim();
}

// ── Fanart.tv artwork fetch ────────────────────────────────────────────────────
function pickFanartLogo(logos, uiLang) {
  // "00" is Fanart.tv's language-neutral code; treat it as a valid fallback
  return (
    logos.find((l) => l.lang === uiLang) ||
    logos.find((l) => l.lang === "en") ||
    logos.find((l) => l.lang === "00") ||
    // fallback: highest-liked logo
    logos.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))[0] ||
    null
  );
}

function pickFanartImage(items, uiLang) {
  return (
    items.find((p) => p.lang === uiLang) ||
    items.find((p) => p.lang === "en") ||
    items.find((p) => p.lang === "00") ||
    items.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))[0] ||
    null
  );
}

async function fetchFanartArtwork(mediaType, tmdbId, tvdbId, uiLang) {
  try {
    let url;
    if (mediaType === "movie") {
      url = `${fanartBase}/movies/${tmdbId}?api_key=${FANART_API_KEY}`;
    } else if (tvdbId) {
      url = `${fanartBase}/tv/${tvdbId}?api_key=${FANART_API_KEY}`;
    } else {
      console.log(`[Fanart] No TVDB ID for TV show (TMDB ${tmdbId}), skipping`);
      return {};
    }
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(
        `[Fanart] HTTP ${resp.status} for ${url.replace(FANART_API_KEY, "***")}`,
      );
      return {};
    }
    const data = await resp.json();

    let logoUrl = null;
    let backdropUrl = null;
    let posterUrl = null;

    if (mediaType === "movie") {
      const logos = [
        ...(Array.isArray(data.hdmovielogo) ? data.hdmovielogo : []),
        ...(Array.isArray(data.movielogo) ? data.movielogo : []),
      ];
      const bgs = Array.isArray(data.moviebackground)
        ? data.moviebackground
        : [];
      const posters = Array.isArray(data.movieposter) ? data.movieposter : [];
      logoUrl = pickFanartLogo(logos, uiLang)?.url || null;
      backdropUrl =
        bgs.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))[0]
          ?.url || null;
      posterUrl = pickFanartImage(posters, uiLang)?.url || null;
    } else {
      const logos = [
        ...(Array.isArray(data.hdtvlogo) ? data.hdtvlogo : []),
        ...(Array.isArray(data.tvlogo) ? data.tvlogo : []),
      ];
      const bgs = Array.isArray(data.showbackground) ? data.showbackground : [];
      const posters = Array.isArray(data.tvposter) ? data.tvposter : [];
      logoUrl = pickFanartLogo(logos, uiLang)?.url || null;
      backdropUrl =
        bgs.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))[0]
          ?.url || null;
      posterUrl = pickFanartImage(posters, uiLang)?.url || null;
    }
    console.log(
      `[Fanart] ${mediaType}/${tmdbId} → logo:${!!logoUrl} backdrop:${!!backdropUrl} poster:${!!posterUrl}`,
    );
    return { logoUrl, backdropUrl, posterUrl };
  } catch (err) {
    console.warn(`[Fanart] fetch error:`, err.message);
    return {};
  }
}

// ── Helper: run TMDB multi-search, return first matching candidate ─────────────
async function tmdbSearch(query, mediaType, preferredYear, tmdbLang) {
  const url =
    `${tmdbBase}/search/multi?api_key=${TMDB_API_KEY}` +
    `&language=${tmdbLang}&query=${encodeURIComponent(query)}&include_adult=false&page=1`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn(`[TMDB] search HTTP ${resp.status} for "${query}"`);
    return null;
  }
  const data = await resp.json();
  let candidates = (data.results || []).filter(
    (item) => item && (item.media_type === "movie" || item.media_type === "tv"),
  );
  if (mediaType === "movie" || mediaType === "tv") {
    candidates = candidates.filter((item) => item.media_type === mediaType);
  }
  if (preferredYear) {
    candidates.sort((a, b) => {
      const aYear = (a.release_date || a.first_air_date || "").slice(0, 4);
      const bYear = (b.release_date || b.first_air_date || "").slice(0, 4);
      const aM =
        aYear === preferredYear
          ? 1
          : Math.abs(parseInt(aYear || 0) - parseInt(preferredYear)) <= 1
            ? 0.5
            : 0;
      const bM =
        bYear === preferredYear
          ? 1
          : Math.abs(parseInt(bYear || 0) - parseInt(preferredYear)) <= 1
            ? 0.5
            : 0;
      if (aM !== bM) return bM - aM;
      return (b.popularity || 0) - (a.popularity || 0);
    });
  }
  return candidates[0] || null;
}

/**
 * TMDB metadata lookup
 * GET /api/proxy/tmdb/search?title=...&mediaType=movie|tv&year=...&lang=de|en
 */
router.get("/tmdb/search", async (req, res) => {
  try {
    const rawTitle = String(req.query.title || "").trim();
    const preferredMediaType = String(req.query.mediaType || "").trim();
    const preferredYear = String(req.query.year || "").trim();
    const uiLang = String(req.query.lang || "de").toLowerCase();
    const tmdbLang = uiLang === "de" ? "de-DE" : "en-US";
    if (!rawTitle) return res.status(400).json({ error: "title is required" });

    // Try cleaned title first, fall back to raw
    const cleanedTitle = cleanSearchTitle(rawTitle);
    console.log(
      `[TMDB] Search: raw="${rawTitle}" cleaned="${cleanedTitle}" type=${preferredMediaType} year=${preferredYear} lang=${uiLang}`,
    );
    let candidate = null;
    if (cleanedTitle && cleanedTitle !== rawTitle) {
      candidate = await tmdbSearch(
        cleanedTitle,
        preferredMediaType,
        preferredYear,
        tmdbLang,
      );
    }
    if (!candidate) {
      candidate = await tmdbSearch(
        rawTitle,
        preferredMediaType,
        preferredYear,
        tmdbLang,
      );
    }
    // If still nothing and there's a year, try without year constraint
    if (!candidate && preferredYear) {
      const altTitle = cleanedTitle || rawTitle;
      candidate = await tmdbSearch(altTitle, preferredMediaType, "", tmdbLang);
    }
    // Last resort: try in English if we searched in another language
    if (!candidate && tmdbLang !== "en-US") {
      const altTitle = cleanedTitle || rawTitle;
      candidate = await tmdbSearch(
        altTitle,
        preferredMediaType,
        preferredYear,
        "en-US",
      );
      if (!candidate && preferredYear) {
        candidate = await tmdbSearch(altTitle, preferredMediaType, "", "en-US");
      }
    }
    if (!candidate) {
      console.log(`[TMDB] No candidate found for "${rawTitle}"`);
      return res.json({ found: false });
    }
    console.log(
      `[TMDB] Found: ${candidate.media_type}/${candidate.id} "${candidate.title || candidate.name}"`,
    );

    // ── Fetch full details with append_to_response ──────────────────────────
    const detailsPath =
      candidate.media_type === "movie"
        ? `/movie/${candidate.id}`
        : `/tv/${candidate.id}`;
    const appendToResponse =
      candidate.media_type === "movie"
        ? "images,videos,credits,external_ids,release_dates"
        : "images,videos,credits,external_ids,content_ratings";
    // Include all major languages + null so logos aren't accidentally filtered out
    const imgLangs = [uiLang, "en", "de", "fr", "null"]
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(",");
    const detailsUrl =
      `${tmdbBase}${detailsPath}?api_key=${TMDB_API_KEY}` +
      `&language=${tmdbLang}&append_to_response=${appendToResponse}&include_image_language=${imgLangs}`;

    let detailsData = null;
    let tmdbLogoPath = null;
    try {
      const detailsResp = await fetch(detailsUrl);
      if (detailsResp.ok) {
        detailsData = await detailsResp.json();
        let logos = Array.isArray(detailsData?.images?.logos)
          ? detailsData.images.logos
          : [];
        // If still empty, make a separate unrestricted images call
        if (logos.length === 0) {
          try {
            const imgUrl = `${tmdbBase}${detailsPath}/images?api_key=${TMDB_API_KEY}`;
            const imgResp = await fetch(imgUrl);
            if (imgResp.ok) {
              const imgData = await imgResp.json();
              logos = Array.isArray(imgData.logos) ? imgData.logos : [];
            }
          } catch {
            /* non-fatal */
          }
        }
        // Pick best logo: prefer ui lang > en > highest vote_average
        logos.sort((a, b) => {
          const aScore =
            (a.vote_average || 0) +
            (a.iso_639_1 === uiLang ? 3 : 0) +
            (a.iso_639_1 === "en" ? 1 : 0);
          const bScore =
            (b.vote_average || 0) +
            (b.iso_639_1 === uiLang ? 3 : 0) +
            (b.iso_639_1 === "en" ? 1 : 0);
          return bScore - aScore;
        });
        tmdbLogoPath = logos[0]?.file_path || null;
        console.log(
          `[TMDB] ${candidate.media_type}/${candidate.id} "${detailsData?.title || detailsData?.name}" → logos:${logos.length} tmdbLogo:${!!tmdbLogoPath}`,
        );
      }
    } catch (err) {
      console.warn("TMDB details fetch failed:", err.message);
    }

    // ── Fanart.tv (better quality logos & backdrops) ────────────────────────
    const tvdbId = detailsData?.external_ids?.tvdb_id || null;
    const fanart = await fetchFanartArtwork(
      candidate.media_type,
      candidate.id,
      tvdbId,
      uiLang,
    );

    // ── Build response fields ───────────────────────────────────────────────
    const backdropPath =
      detailsData?.backdrop_path || candidate.backdrop_path || null;
    const posterPath =
      detailsData?.poster_path || candidate.poster_path || null;
    const overview = detailsData?.overview || candidate.overview || null;
    const releaseDate =
      detailsData?.release_date ||
      detailsData?.first_air_date ||
      candidate.release_date ||
      candidate.first_air_date ||
      null;
    const voteAverage =
      typeof detailsData?.vote_average === "number"
        ? detailsData.vote_average
        : typeof candidate.vote_average === "number"
          ? candidate.vote_average
          : null;
    const voteCount =
      typeof detailsData?.vote_count === "number"
        ? detailsData.vote_count
        : typeof candidate.vote_count === "number"
          ? candidate.vote_count
          : null;
    const runtime =
      Number(detailsData?.runtime) ||
      Number((detailsData?.episode_run_time || [])[0]) ||
      null;
    const genres = Array.isArray(detailsData?.genres)
      ? detailsData.genres.map((g) => g.name).filter(Boolean)
      : [];
    const cast = Array.isArray(detailsData?.credits?.cast)
      ? detailsData.credits.cast
          .slice(0, 6)
          .map((c) => c.name)
          .filter(Boolean)
      : [];
    const castMembers = Array.isArray(detailsData?.credits?.cast)
      ? detailsData.credits.cast.slice(0, 10).map((c) => ({
          id: c.id,
          name: c.name || null,
          character: c.character || null,
          profileUrl: c.profile_path
            ? `${tmdbImageBase}/w185${c.profile_path}`
            : null,
        }))
      : [];
    const crew = Array.isArray(detailsData?.credits?.crew)
      ? detailsData.credits.crew
      : [];
    const directors = crew
      .filter((c) => c?.job === "Director")
      .map((c) => c.name)
      .filter(Boolean);
    const directorMembers = crew
      .filter((c) => c?.job === "Director")
      .slice(0, 4)
      .map((c) => ({
        id: c.id,
        name: c.name || null,
        job: c.job || "Director",
        profileUrl: c.profile_path
          ? `${tmdbImageBase}/w185${c.profile_path}`
          : null,
      }));
    const writers = crew
      .filter((c) => c?.department === "Writing")
      .slice(0, 6)
      .map((c) => c.name)
      .filter(Boolean);
    const videos = Array.isArray(detailsData?.videos?.results)
      ? detailsData.videos.results
      : [];
    const trailer =
      videos.find(
        (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
      ) ||
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
      videos.find((v) => v.site === "YouTube" && v.type === "Teaser") ||
      null;
    const trailerUrl = trailer?.key
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : null;
    const imdbId =
      detailsData?.external_ids?.imdb_id || detailsData?.imdb_id || null;

    let certification = null;
    if (candidate.media_type === "movie") {
      const releases = Array.isArray(detailsData?.release_dates?.results)
        ? detailsData.release_dates.results
        : [];
      const preferredRelease =
        releases.find((r) => r.iso_3166_1 === "DE") ||
        releases.find((r) => r.iso_3166_1 === "US") ||
        releases[0];
      certification =
        preferredRelease?.release_dates?.find((r) => r.certification)
          ?.certification || null;
    } else {
      const ratings = Array.isArray(detailsData?.content_ratings?.results)
        ? detailsData.content_ratings.results
        : [];
      const preferredRating =
        ratings.find((r) => r.iso_3166_1 === "DE") ||
        ratings.find((r) => r.iso_3166_1 === "US") ||
        ratings[0];
      certification = preferredRating?.rating || null;
    }

    // Prefer Fanart.tv (higher quality) over TMDB images
    res.json({
      found: true,
      mediaType: candidate.media_type,
      id: candidate.id,
      tvdbId,
      title:
        detailsData?.title ||
        detailsData?.name ||
        candidate.title ||
        candidate.name ||
        rawTitle,
      backdropUrl:
        fanart.backdropUrl ||
        (backdropPath ? `${tmdbImageBase}/w1280${backdropPath}` : null),
      logoUrl:
        fanart.logoUrl ||
        (tmdbLogoPath ? `${tmdbImageBase}/w500${tmdbLogoPath}` : null),
      posterUrl:
        fanart.posterUrl ||
        (posterPath ? `${tmdbImageBase}/w500${posterPath}` : null),
      overview,
      releaseDate,
      voteAverage,
      voteCount,
      runtime,
      genres,
      cast,
      castMembers,
      directors,
      directorMembers,
      writers,
      popularity: detailsData?.popularity ?? candidate?.popularity ?? null,
      budget: detailsData?.budget ?? null,
      revenue: detailsData?.revenue ?? null,
      countries: Array.isArray(detailsData?.production_countries)
        ? detailsData.production_countries.map((c) => c.name).filter(Boolean)
        : [],
      originalLanguage: detailsData?.original_language || null,
      spokenLanguages: Array.isArray(detailsData?.spoken_languages)
        ? detailsData.spoken_languages
            .map((l) => l.english_name || l.name || l.iso_639_1)
            .filter(Boolean)
        : [],
      trailerUrl,
      imdbId,
      certification,
    });
  } catch (err) {
    console.error("TMDB proxy error:", err.message);
    res.status(500).json({ error: "TMDB proxy failed" });
  }
});

/**
 * TMDB season episode stills
 * GET /api/proxy/tmdb/season?seriesId=TMDB_ID&season=N&lang=de
 */
router.get("/tmdb/season", async (req, res) => {
  try {
    const seriesId = String(req.query.seriesId || "").trim();
    const seasonNum = String(req.query.season || "1").trim();
    const uiLang = String(req.query.lang || "de").toLowerCase();
    const tmdbLang = uiLang === "de" ? "de-DE" : "en-US";
    if (!seriesId) return res.status(400).json({ error: "seriesId required" });

    const url =
      `${tmdbBase}/tv/${seriesId}/season/${seasonNum}?api_key=${TMDB_API_KEY}` +
      `&language=${tmdbLang}&append_to_response=images&include_image_language=${uiLang},en,null`;
    const resp = await fetch(url);
    if (!resp.ok) return res.json({ episodes: [] });
    const data = await resp.json();
    const episodes = (data.episodes || []).map((ep) => ({
      episode_num: ep.episode_number,
      stillUrl: ep.still_path ? `${tmdbImageBase}/w300${ep.still_path}` : null,
      name: ep.name || null,
      overview: ep.overview || null,
    }));
    res.json({ episodes });
  } catch (err) {
    console.warn("TMDB season proxy error:", err.message);
    res.json({ episodes: [] });
  }
});

/**
 * Proxy images (channel logos, posters)
 * Fixes mixed content errors when loading HTTP images on HTTPS pages
 * GET /api/proxy/image?url=...
 */
router.get("/image", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch image");
    }

    const contentType = response.headers.get("content-type") || "image/png";
    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

    // Efficiently pipe the response body
    if (response.body) {
      // response.body is an AsyncIterable in standard fetch/undici
      // Readable.from converts it to a Node.js Readable stream
      const stream = Readable.from(response.body);
      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Image proxy error:", err.message);
    res.status(500).send("Image proxy error");
  }
});

module.exports = router;
