const express = require("express");
const router = express.Router();
const { favorites } = require("../db/sqlite");
const { sources } = require("../db");
const { requireAuth } = require("../auth");

// All favorites routes require authentication
router.use(requireAuth);

async function ensureSourceOwned(userId, sourceId) {
  const source = await sources.getById(sourceId, userId);
  return !!source;
}

// Get all favorites for current user
router.get("/", async (req, res) => {
  try {
    const { sourceId, itemType } = req.query;
    const items = favorites.getAll(
      req.user.id,
      sourceId || null,
      itemType || null,
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add favorite for current user
router.post("/", async (req, res) => {
  try {
    const { sourceId, itemId, itemType = "channel" } = req.body;
    if (!sourceId || !itemId) {
      return res
        .status(400)
        .json({ error: "Source ID and Item ID are required" });
    }

    const parsedSourceId = parseInt(sourceId, 10);
    if (!Number.isFinite(parsedSourceId)) {
      return res.status(400).json({ error: "Invalid Source ID" });
    }

    if (!(await ensureSourceOwned(req.user.id, parsedSourceId))) {
      return res.status(404).json({ error: "Source not found" });
    }

    favorites.add(req.user.id, parsedSourceId, itemId, itemType);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove favorite for current user
router.delete("/", async (req, res) => {
  try {
    const { sourceId, itemId, itemType = "channel" } = req.body;
    if (!sourceId || !itemId) {
      return res
        .status(400)
        .json({ error: "Source ID and Item ID are required" });
    }

    const parsedSourceId = parseInt(sourceId, 10);
    if (!Number.isFinite(parsedSourceId)) {
      return res.status(400).json({ error: "Invalid Source ID" });
    }

    if (!(await ensureSourceOwned(req.user.id, parsedSourceId))) {
      return res.status(404).json({ error: "Source not found" });
    }

    favorites.remove(req.user.id, parsedSourceId, itemId, itemType);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if item is favorited by current user
router.get("/check", async (req, res) => {
  try {
    const { sourceId, itemId, itemType = "channel" } = req.query;
    if (!sourceId || !itemId) {
      return res
        .status(400)
        .json({ error: "Source ID and Item ID are required" });
    }

    const parsedSourceId = parseInt(sourceId, 10);
    if (!Number.isFinite(parsedSourceId)) {
      return res.status(400).json({ error: "Invalid Source ID" });
    }

    if (!(await ensureSourceOwned(req.user.id, parsedSourceId))) {
      return res.status(404).json({ error: "Source not found" });
    }

    const isFav = favorites.isFavorite(
      req.user.id,
      parsedSourceId,
      itemId,
      itemType,
    );
    res.json({ isFavorite: isFav });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
