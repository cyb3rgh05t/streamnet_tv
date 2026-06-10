const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "..", "data");
const dbPath = path.join(dataDir, "content.db");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function isCorruptionError(err) {
  if (!err) return false;
  const code = String(err.code || "").toUpperCase();
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "SQLITE_CORRUPT" ||
    code === "SQLITE_NOTADB" ||
    msg.includes("database disk image is malformed") ||
    msg.includes("file is not a database")
  );
}

function configurePragmas(database) {
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = NORMAL");
}

function openDatabaseFile() {
  const database = new Database(dbPath);
  configurePragmas(database);
  return database;
}

function moveIfExists(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) return;
  fs.renameSync(srcPath, destPath);
}

function backupCorruptDatabaseFiles(reason) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const recoveryDir = path.join(dataDir, "recovery");
  if (!fs.existsSync(recoveryDir)) {
    fs.mkdirSync(recoveryDir, { recursive: true });
  }

  const baseName = `content-corrupt-${stamp}`;
  const files = [
    { from: dbPath, to: path.join(recoveryDir, `${baseName}.db`) },
    {
      from: `${dbPath}-wal`,
      to: path.join(recoveryDir, `${baseName}.db-wal`),
    },
    {
      from: `${dbPath}-shm`,
      to: path.join(recoveryDir, `${baseName}.db-shm`),
    },
  ];

  for (const file of files) {
    try {
      moveIfExists(file.from, file.to);
    } catch (err) {
      console.error("[SQLite] Failed to move corrupt file:", file.from, err);
    }
  }

  console.error(
    `[SQLite] Corrupt database files were moved to ${recoveryDir}. Cause: ${reason}`,
  );
}

function recoverFromCorruption(cause) {
  try {
    if (db) {
      db.close();
    }
  } catch {
    // Ignore close errors during recovery.
  }

  db = null;
  backupCorruptDatabaseFiles(cause?.message || cause || "unknown");

  // Recreate an empty database so the server can continue operating.
  db = openDatabaseFile();
  initSchema();
  console.warn(
    "[SQLite] New SQLite database created after corruption recovery.",
  );
}

function getDb() {
  if (!db) {
    console.log("[SQLite] Opening database at", dbPath);
    try {
      db = openDatabaseFile();
      initSchema();
    } catch (err) {
      if (!isCorruptionError(err)) {
        throw err;
      }

      console.error(
        "[SQLite] Corruption detected while opening database:",
        err,
      );
      recoverFromCorruption(err);
    }
  }
  return db;
}

function initSchema() {
  if (!db) throw new Error("Database not initialized");

  // Categories (Groups)
  db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY, -- Composite key: sourceId:categoryId
            source_id INTEGER NOT NULL,
            category_id TEXT NOT NULL,
            type TEXT NOT NULL, -- 'live', 'movie', 'series'
            name TEXT NOT NULL,
            parent_id TEXT, -- For nested categories
            is_hidden INTEGER DEFAULT 0,
            data JSON -- Extra provider data
        );
        CREATE INDEX IF NOT EXISTS idx_categories_source_type ON categories(source_id, type);
    `);

  // Playlist Items (Channels, Movies, Series, Episodes)
  db.exec(`
        CREATE TABLE IF NOT EXISTS playlist_items (
            id TEXT PRIMARY KEY, -- Composite key: sourceId:itemId
            source_id INTEGER NOT NULL,
            item_id TEXT NOT NULL, -- Original ID from provider
            type TEXT NOT NULL, -- 'live', 'movie', 'series', 'episode'
            name TEXT NOT NULL,
            category_id TEXT, -- maps to categories.category_id (not our composite id)
            parent_id TEXT, -- For episodes -> series_id
            
            -- Common Media Fields
            stream_icon TEXT,
            stream_url TEXT, -- Direct link if available
            container_extension TEXT,
            
            -- VOD/Series Specific
            rating REAL,
            year TEXT,
            added_at TEXT,
            
            -- App State
            is_hidden INTEGER DEFAULT 0,
            is_favorite INTEGER DEFAULT 0,
            
            data JSON -- Full original JSON object
        );
        CREATE INDEX IF NOT EXISTS idx_items_source_type ON playlist_items(source_id, type);
        CREATE INDEX IF NOT EXISTS idx_items_category ON playlist_items(source_id, category_id);
    `);

  // EPG Programs
  // Optimized for range queries
  db.exec(`
        CREATE TABLE IF NOT EXISTS epg_programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT NOT NULL, -- matches playlist_items.id if possible, or mapping key
            source_id INTEGER NOT NULL,
            start_time INTEGER NOT NULL, -- Unix timestamp (ms)
            end_time INTEGER NOT NULL,   -- Unix timestamp (ms)
            title TEXT,
            description TEXT,
            data JSON
        );
        CREATE INDEX IF NOT EXISTS idx_epg_channel_time ON epg_programs(channel_id, start_time, end_time);
        CREATE INDEX IF NOT EXISTS idx_epg_cleanup ON epg_programs(end_time); -- For deleting old programs
    `);

  // Sync Status
  db.exec(`
        CREATE TABLE IF NOT EXISTS sync_status (
            source_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- 'live', 'vod', 'series', 'epg'
            last_sync INTEGER NOT NULL,
            status TEXT, -- 'success', 'error', 'syncing'
            error TEXT,
            PRIMARY KEY (source_id, type)
        );
    `);

  // User Favorites (per-user)
  db.exec(`
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            source_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            item_type TEXT NOT NULL, -- 'channel', 'movie', 'series'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, source_id, item_id, item_type)
        );
        CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
        CREATE INDEX IF NOT EXISTS idx_favorites_user_type ON favorites(user_id, item_type);
    `);

  // Watch History (per-user)
  db.exec(`
        CREATE TABLE IF NOT EXISTS watch_history (
            id TEXT PRIMARY KEY, -- Composite key: user_id:item_id
            user_id INTEGER NOT NULL,
            source_id INTEGER, -- Source ID for Xtream/M3U
            item_type TEXT NOT NULL, -- 'movie', 'episode'
            item_id TEXT NOT NULL, -- The original item ID (stream_id or composite)
            parent_id TEXT, -- For episodes (series ID)
            progress INTEGER DEFAULT 0, -- Current position in seconds
            duration INTEGER DEFAULT 0, -- Total duration in seconds
            updated_at INTEGER NOT NULL, -- Timestamp
            data JSON -- Snapshot of item data (title, poster, etc)
        );
        CREATE INDEX IF NOT EXISTS idx_history_user_updated ON watch_history(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_history_user_item ON watch_history(user_id, item_id);
    `);

  // Watch Events (append-only analytics timeline)
  db.exec(`
        CREATE TABLE IF NOT EXISTS watch_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            source_id INTEGER,
            item_type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            event_type TEXT NOT NULL, -- 'session_start', 'progress_ping', 'ended'
            created_at INTEGER NOT NULL,
            meta JSON
        );
        CREATE INDEX IF NOT EXISTS idx_watch_events_time ON watch_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_watch_events_user_time ON watch_events(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_watch_events_source_time ON watch_events(source_id, created_at DESC);
    `);

  // Migration: Add source_id column if missing (for existing databases)
  try {
    db.exec(`ALTER TABLE watch_history ADD COLUMN source_id INTEGER`);
    console.log("[SQLite] Added source_id column to watch_history");
  } catch (e) {
    // Column already exists, ignore
  }

  console.log("[SQLite] Schema initialized");
}

// ============================================================
// Favorites CRUD Operations
// ============================================================
const favorites = {
  getAll(userId, sourceId = null, itemType = null) {
    const db = getDb();
    let sql = "SELECT * FROM favorites WHERE user_id = ?";
    const params = [userId];

    if (sourceId) {
      sql += " AND source_id = ?";
      params.push(sourceId);
    }
    if (itemType) {
      sql += " AND item_type = ?";
      params.push(itemType);
    }

    sql += " ORDER BY created_at DESC";
    return db.prepare(sql).all(...params);
  },

  add(userId, sourceId, itemId, itemType = "channel") {
    const db = getDb();
    const stmt = db.prepare(`
            INSERT OR IGNORE INTO favorites (user_id, source_id, item_id, item_type)
            VALUES (?, ?, ?, ?)
        `);
    const result = stmt.run(userId, sourceId, itemId, itemType);
    return result.changes > 0;
  },

  remove(userId, sourceId, itemId, itemType = "channel") {
    const db = getDb();
    const stmt = db.prepare(`
            DELETE FROM favorites 
            WHERE user_id = ? AND source_id = ? AND item_id = ? AND item_type = ?
        `);
    const result = stmt.run(userId, sourceId, itemId, itemType);
    return result.changes > 0;
  },

  isFavorite(userId, sourceId, itemId, itemType = "channel") {
    const db = getDb();
    const row = db
      .prepare(
        `
            SELECT 1 FROM favorites 
            WHERE user_id = ? AND source_id = ? AND item_id = ? AND item_type = ?
        `,
      )
      .get(userId, sourceId, itemId, itemType);
    return !!row;
  },

  // Get all favorites for a user, grouped by type (for bulk checks)
  getAllAsSet(userId) {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT source_id, item_id, item_type FROM favorites WHERE user_id = ?",
      )
      .all(userId);
    const set = new Set();
    for (const row of rows) {
      set.add(`${row.source_id}:${row.item_id}:${row.item_type}`);
    }
    return set;
  },
};

module.exports = {
  getDb,
  initSchema,
  favorites,
};
