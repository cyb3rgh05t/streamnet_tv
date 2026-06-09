const fs = require("fs/promises");
const path = require("path");
const { existsSync, mkdirSync } = require("fs");

// Ensure data directory exists (sync is fine for startup)
const dataDir = path.join(__dirname, "..", "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "db.json");

// Initialize database structure
async function loadDb() {
  try {
    // Check if file exists (using fs.access is better for async, but we can catch ENOENT)
    try {
      const fileContent = await fs.readFile(dbPath, "utf-8");
      const data = JSON.parse(fileContent);
      return {
        sources: data.sources || [],
        hiddenItems: data.hiddenItems || [],
        favorites: data.favorites || [],
        settings: data.settings || getDefaultSettings(),
        userSettings: data.userSettings || {},
        users: data.users || [],
        nextId: data.nextId || 1,
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        // File doesn't exist, return default
        return {
          sources: [],
          hiddenItems: [],
          favorites: [],
          settings: getDefaultSettings(),
          userSettings: {},
          users: [],
          nextId: 1,
        };
      }
      throw error;
    }
  } catch (err) {
    console.error("Error loading database:", err);
    // Return safe default on error to prevent crashing, but log it
    return {
      sources: [],
      hiddenItems: [],
      favorites: [],
      settings: getDefaultSettings(),
      userSettings: {},
      users: [],
      nextId: 1,
    };
  }
}

// Default settings
function getDefaultSettings() {
  return {
    arrowKeysChangeChannel: true,
    overlayDuration: 5,
    defaultVolume: 80,
    rememberVolume: true,
    lastVolume: 80,
    autoPlayNextEpisode: false,
    forceProxy: false,
    forceTranscode: false, // Force Audio Transcode
    forceVideoTranscode: false, // Force Video Transcode
    forceRemux: false,
    autoTranscode: true,
    streamFormat: "m3u8",
    epgRefreshInterval: "24",
    // User-Agent settings
    userAgentPreset: "chrome", // chrome | vlc | tivimate | custom
    userAgentCustom: "", // Custom UA string when preset is 'custom'
    // Transcoding settings
    hwEncoder: "auto", // auto | nvenc | amf | qsv | vaapi | software
    maxResolution: "1080p", // 4k | 1080p | 720p | 480p
    quality: "medium", // high | medium | low
    audioMixPreset: "auto", // auto | itu | night | cinematic | passthrough
    // Probe cache settings
    probeCacheTTL: 300, // 5 minutes for URL probe cache
    seriesProbeCacheDays: 7, // 7 days for series episode probe cache
    // Upscaling settings
    upscaleEnabled: false,
    upscaleMethod: "hardware", // hardware | software
    upscaleTarget: "1080p", // 1080p | 4k | 720p
  };
}

// User-Agent presets
const USER_AGENT_PRESETS = {
  chrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  vlc: "VLC/3.0.20 LibVLC/3.0.20",
  tivimate: "TiviMate/4.7.0",
};

function getUserAgent(settings) {
  if (settings.userAgentPreset === "custom" && settings.userAgentCustom) {
    return settings.userAgentCustom;
  }
  return (
    USER_AGENT_PRESETS[settings.userAgentPreset] || USER_AGENT_PRESETS.chrome
  );
}

// Write lock to prevent concurrent writes from corrupting db.json
let writeQueue = Promise.resolve();
const tmpPath = dbPath + ".tmp";

function isTransientRenameError(err) {
  return ["EPERM", "EACCES", "EBUSY"].includes(err?.code);
}

async function saveDb(data) {
  // Queue this write operation - each write waits for the previous one
  writeQueue = writeQueue
    .then(async () => {
      try {
        const jsonString = JSON.stringify(data, null, 2);
        // Atomic write: write to temp file, then rename
        // Rename is atomic on most filesystems, preventing corruption on crash
        await fs.writeFile(tmpPath, jsonString);
        try {
          await fs.rename(tmpPath, dbPath);
        } catch (renameErr) {
          // Windows can transiently lock the destination (AV/indexer/editor).
          // Fallback to direct overwrite to avoid losing settings updates.
          if (!isTransientRenameError(renameErr)) {
            throw renameErr;
          }

          await fs.writeFile(dbPath, jsonString);
          try {
            await fs.unlink(tmpPath);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.error("Error writing database:", err);
        // Clean up temp file if it exists
        try {
          await fs.unlink(tmpPath);
        } catch {
          /* ignore */
        }
        throw err;
      }
    })
    .catch((err) => {
      console.error("Database write failed:", err);
    });

  return writeQueue;
}

// Source CRUD operations
const sources = {
  isGlobalAdminSource(source) {
    return source?.is_admin_managed_global === true;
  },

  async getAll(userId = null) {
    const db = await loadDb();
    if (userId !== null && userId !== undefined) {
      return db.sources.filter(
        (s) =>
          parseInt(s.owner_user_id) === parseInt(userId) ||
          this.isGlobalAdminSource(s),
      );
    }
    return db.sources;
  },

  async getById(id, userId = null) {
    const db = await loadDb();
    const source = db.sources.find((s) => s.id === parseInt(id));
    if (!source) return null;
    if (
      userId !== null &&
      userId !== undefined &&
      parseInt(source.owner_user_id) !== parseInt(userId) &&
      !this.isGlobalAdminSource(source)
    ) {
      return null;
    }
    return source;
  },

  async getByType(type, userId = null) {
    const db = await loadDb();
    let filtered = db.sources.filter((s) => s.type === type && s.enabled);
    if (userId !== null && userId !== undefined) {
      filtered = filtered.filter(
        (s) =>
          parseInt(s.owner_user_id) === parseInt(userId) ||
          this.isGlobalAdminSource(s),
      );
    }
    return filtered;
  },

  async create(source, userId = null) {
    const db = await loadDb();
    const newSource = {
      id: db.nextId++,
      ...source,
      owner_user_id:
        userId !== null && userId !== undefined ? parseInt(userId) : null,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.sources.push(newSource);
    await saveDb(db);
    return newSource;
  },

  async update(id, updates, userId = null) {
    const db = await loadDb();
    const index = db.sources.findIndex((s) => s.id === parseInt(id));
    if (index === -1) return null;
    if (
      userId !== null &&
      userId !== undefined &&
      parseInt(db.sources[index].owner_user_id) !== parseInt(userId)
    ) {
      return null;
    }

    db.sources[index] = {
      ...db.sources[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await saveDb(db);
    return db.sources[index];
  },

  async delete(id, userId = null) {
    const db = await loadDb();
    if (userId !== null && userId !== undefined) {
      const source = db.sources.find((s) => s.id === parseInt(id));
      if (!source || parseInt(source.owner_user_id) !== parseInt(userId)) {
        return false;
      }
    }
    db.sources = db.sources.filter((s) => s.id !== parseInt(id));
    // Also delete related hidden items and favorites
    db.hiddenItems = db.hiddenItems.filter((h) => h.source_id !== parseInt(id));
    db.favorites = db.favorites.filter((f) => f.source_id !== parseInt(id));
    await saveDb(db);
    return true;
  },

  async toggleEnabled(id, userId = null) {
    const db = await loadDb();
    const source = db.sources.find((s) => s.id === parseInt(id));
    if (
      source &&
      userId !== null &&
      userId !== undefined &&
      parseInt(source.owner_user_id) !== parseInt(userId)
    ) {
      return null;
    }
    if (source) {
      source.enabled = !source.enabled;
      source.updated_at = new Date().toISOString();
      await saveDb(db);
    }
    return source;
  },
};

// Hidden items operations
const hiddenItems = {
  async getAll(sourceId = null) {
    const db = await loadDb();
    if (sourceId) {
      return db.hiddenItems.filter((h) => h.source_id === parseInt(sourceId));
    }
    return db.hiddenItems;
  },

  async hide(sourceId, itemType, itemId) {
    const db = await loadDb();
    // Check if already hidden
    const exists = db.hiddenItems.find(
      (h) =>
        h.source_id === parseInt(sourceId) &&
        h.item_type === itemType &&
        h.item_id === itemId,
    );
    if (!exists) {
      db.hiddenItems.push({
        id: db.nextId++,
        source_id: parseInt(sourceId),
        item_type: itemType,
        item_id: itemId,
      });
      await saveDb(db);
    }
  },

  async show(sourceId, itemType, itemId) {
    const db = await loadDb();
    db.hiddenItems = db.hiddenItems.filter(
      (h) =>
        !(
          h.source_id === parseInt(sourceId) &&
          h.item_type === itemType &&
          h.item_id === itemId
        ),
    );
    await saveDb(db);
  },

  async isHidden(sourceId, itemType, itemId) {
    const db = await loadDb();
    return db.hiddenItems.some(
      (h) =>
        h.source_id === parseInt(sourceId) &&
        h.item_type === itemType &&
        h.item_id === itemId,
    );
  },

  async bulkHide(items) {
    const db = await loadDb();
    let modified = false;

    items.forEach((item) => {
      const { sourceId, itemType, itemId } = item;
      const exists = db.hiddenItems.find(
        (h) =>
          h.source_id === parseInt(sourceId) &&
          h.item_type === itemType &&
          h.item_id === itemId,
      );

      if (!exists) {
        db.hiddenItems.push({
          id: db.nextId++,
          source_id: parseInt(sourceId),
          item_type: itemType,
          item_id: itemId,
        });
        modified = true;
      }
    });

    if (modified) {
      await saveDb(db);
    }
    return true;
  },

  async bulkShow(items) {
    const db = await loadDb();
    const initialLength = db.hiddenItems.length;

    // Create a set of "signatures" for O(1) lookup of items to remove
    const toRemove = new Set(
      items.map((i) => `${i.sourceId}:${i.itemType}:${i.itemId}`),
    );

    db.hiddenItems = db.hiddenItems.filter(
      (h) => !toRemove.has(`${h.source_id}:${h.item_type}:${h.item_id}`),
    );

    if (db.hiddenItems.length !== initialLength) {
      await saveDb(db);
    }
    return true;
  },
};

// Favorites operations
const favorites = {
  async getAll(sourceId = null, itemType = null) {
    const db = await loadDb();
    let results = db.favorites;
    if (sourceId) {
      results = results.filter((f) => f.source_id === parseInt(sourceId));
    }
    if (itemType) {
      results = results.filter((f) => f.item_type === itemType);
    }
    return results;
  },

  async add(sourceId, itemId, itemType = "channel") {
    const db = await loadDb();
    // Check if already favorited
    const exists = db.favorites.find(
      (f) =>
        f.source_id === parseInt(sourceId) &&
        f.item_id === String(itemId) &&
        f.item_type === itemType,
    );
    if (!exists) {
      db.favorites.push({
        id: db.nextId++,
        source_id: parseInt(sourceId),
        item_id: String(itemId),
        item_type: itemType, // 'channel', 'movie', 'series'
        created_at: new Date().toISOString(),
      });
      await saveDb(db);
    }
    return true;
  },

  async remove(sourceId, itemId, itemType = "channel") {
    const db = await loadDb();
    db.favorites = db.favorites.filter(
      (f) =>
        !(
          f.source_id === parseInt(sourceId) &&
          f.item_id === String(itemId) &&
          f.item_type === itemType
        ),
    );
    await saveDb(db);
    return true;
  },

  async isFavorite(sourceId, itemId, itemType = "channel") {
    const db = await loadDb();
    return db.favorites.some(
      (f) =>
        f.source_id === parseInt(sourceId) &&
        f.item_id === String(itemId) &&
        f.item_type === itemType,
    );
  },
};

// Settings operations
const settings = {
  async get(userId = null) {
    const db = await loadDb();
    if (userId !== null && userId !== undefined) {
      const key = String(userId);
      const userSettings = (db.userSettings && db.userSettings[key]) || {};
      return { ...getDefaultSettings(), ...db.settings, ...userSettings };
    }
    return { ...getDefaultSettings(), ...db.settings };
  },

  async update(newSettings, userId = null) {
    const db = await loadDb();
    if (userId !== null && userId !== undefined) {
      const key = String(userId);
      db.userSettings = db.userSettings || {};
      db.userSettings[key] = {
        ...(db.userSettings[key] || {}),
        ...newSettings,
      };
      await saveDb(db);
      return db.userSettings[key];
    }
    db.settings = { ...db.settings, ...newSettings };
    await saveDb(db);
    return db.settings;
  },

  async reset(userId = null) {
    const db = await loadDb();
    if (userId !== null && userId !== undefined) {
      const key = String(userId);
      db.userSettings = db.userSettings || {};
      delete db.userSettings[key];
      await saveDb(db);
      return getDefaultSettings();
    }
    db.settings = getDefaultSettings();
    await saveDb(db);
    return db.settings;
  },
};

// User operations
const users = {
  async getAll() {
    const db = await loadDb();
    return db.users || [];
  },

  async getById(id) {
    const db = await loadDb();
    return db.users?.find((u) => u.id === parseInt(id));
  },

  async getByUsername(username) {
    const db = await loadDb();
    return db.users?.find((u) => u.username === username);
  },

  async getByOidcId(oidcId) {
    const db = await loadDb();
    return db.users?.find((u) => u.oidcId === oidcId);
  },

  async getByEmail(email) {
    const db = await loadDb();
    return db.users?.find((u) => u.email === email);
  },

  async create(userData) {
    const db = await loadDb();
    if (!db.users) {
      db.users = [];
    }

    // Check if username already exists
    if (db.users.some((u) => u.username === userData.username)) {
      throw new Error("Username already exists");
    }

    const newUser = {
      id: db.nextId++,
      username: userData.username,
      // For OIDC users, passwordHash is optional
      passwordHash: userData.passwordHash || null,
      role: userData.role || "viewer",
      oidcId: userData.oidcId || null,
      email: userData.email || null,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    await saveDb(db);

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  async update(id, updates) {
    const db = await loadDb();
    const userIndex = db.users?.findIndex((u) => u.id === parseInt(id));

    if (userIndex === -1 || userIndex === undefined) {
      throw new Error("User not found");
    }

    // Check if username is being changed and if it already exists
    if (updates.username && updates.username !== db.users[userIndex].username) {
      if (db.users.some((u) => u.username === updates.username)) {
        throw new Error("Username already exists");
      }
    }

    db.users[userIndex] = {
      ...db.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await saveDb(db);

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = db.users[userIndex];
    return userWithoutPassword;
  },

  async delete(id) {
    const db = await loadDb();
    const userIndex = db.users?.findIndex((u) => u.id === parseInt(id));

    if (userIndex === -1 || userIndex === undefined) {
      throw new Error("User not found");
    }

    // Prevent deleting the last admin
    const user = db.users[userIndex];
    if (user.role === "admin") {
      const adminCount = db.users.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Cannot delete the last admin user");
      }
    }

    db.users.splice(userIndex, 1);
    await saveDb(db);
    return true;
  },

  async count() {
    const db = await loadDb();
    return db.users?.length || 0;
  },
};

module.exports = {
  loadDb,
  saveDb,
  sources,
  hiddenItems,
  favorites,
  settings,
  users,
  getDefaultSettings,
  getUserAgent,
  USER_AGENT_PRESETS,
};
