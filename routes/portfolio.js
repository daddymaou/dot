const express = require("express");
const router = express.Router();
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { upload, handleUploadError } = require("../middleware/upload");
const { isValidUrl, sanitizeText, normalizeUsername } = require("../utils/helpers");

const MAX_PORTFOLIO_ITEMS = parseInt(process.env.MAX_PORTFOLIO_ITEMS || "6", 10);

// GET /api/portfolio (own items)
router.get("/", requireAuth, async (req, res) => {
  try {
    const items = await Portfolio.find({ user: req.user._id }).sort({ position: 1 });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load portfolio", error: err.message });
  }
});

// GET /api/portfolio/:username (public)
router.get("/:username", async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    const user = await User.findOne({ username, isActive: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const items = await Portfolio.find({ user: user._id, active: true }).sort({ position: 1 });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load portfolio", error: err.message });
  }
});

// POST /api/portfolio (add item, optional image)
router.post("/", requireAuth, upload.single("image"), handleUploadError, async (req, res) => {
  try {
    const count = await Portfolio.countDocuments({ user: req.user._id });
    if (count >= MAX_PORTFOLIO_ITEMS) {
      return res.status(400).json({ success: false, message: `Maximum of ${MAX_PORTFOLIO_ITEMS} portfolio items allowed` });
    }
    const { caption, url } = req.body;
    if (url && !isValidUrl(url)) {
      return res.status(400).json({ success: false, message: "Invalid URL" });
    }
    const imageUrl = req.file ? `/uploads/${req.user.username}/${req.file.filename}` : "";
    const item = await Portfolio.create({
      user: req.user._id,
      imageUrl,
      caption: sanitizeText(caption, 200),
      url: sanitizeText(url, 300),
      position: count
    });
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add portfolio item", error: err.message });
  }
});

// PUT /api/portfolio/reorder (must be defined before /:id)
router.put("/reorder", requireAuth, async (req, res) => {
  try {
    const { order } = req.body; // array of item ids in new order
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: "order must be an array of ids" });
    }
    await Promise.all(
      order.map((id, index) =>
        Portfolio.updateOne({ _id: id, user: req.user._id }, { position: index })
      )
    );
    res.json({ success: true, message: "Portfolio reordered" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reorder portfolio", error: err.message });
  }
});

// PUT /api/portfolio/:id
router.put("/:id", requireAuth, upload.single("image"), handleUploadError, async (req, res) => {
  try {
    const item = await Portfolio.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Portfolio item not found" });

    const { caption, url, active } = req.body;
    if (url !== undefined) {
      if (url && !isValidUrl(url)) {
        return res.status(400).json({ success: false, message: "Invalid URL" });
      }
      item.url = sanitizeText(url, 300);
    }
    if (caption !== undefined) item.caption = sanitizeText(caption, 200);
    if (active !== undefined) item.active = active === "true" || active === true;
    if (req.file) item.imageUrl = `/uploads/${req.user.username}/${req.file.filename}`;

    await item.save();
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update portfolio item", error: err.message });
  }
});

// DELETE /api/portfolio/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Portfolio.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: "Portfolio item not found" });
    res.json({ success: true, message: "Portfolio item deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete portfolio item", error: err.message });
  }
});

module.exports = router;
