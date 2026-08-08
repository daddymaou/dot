const express = require("express");
const router = express.Router();
const Link = require("../models/Link");
const { requireAuth } = require("../middleware/auth");
const { isValidUrl, sanitizeText } = require("../utils/helpers");

// GET /api/links (own links)
router.get("/", requireAuth, async (req, res) => {
  try {
    const links = await Link.find({ user: req.user._id }).sort({ position: 1 });
    res.json({ success: true, links });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load links", error: err.message });
  }
});

// POST /api/links
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, url, icon } = req.body;
    if (!title || !url) {
      return res.status(400).json({ success: false, message: "Title and URL are required" });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ success: false, message: "Invalid URL" });
    }
    const count = await Link.countDocuments({ user: req.user._id });
    const link = await Link.create({
      user: req.user._id,
      title: sanitizeText(title, 80),
      url: sanitizeText(url, 500),
      icon: icon ? sanitizeText(icon, 10) : "🔗",
      position: count
    });
    res.status(201).json({ success: true, link });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add link", error: err.message });
  }
});

// PUT /api/links/reorder (must be defined before /:id)
router.put("/reorder", requireAuth, async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: "order must be an array of ids" });
    }
    await Promise.all(
      order.map((id, index) => Link.updateOne({ _id: id, user: req.user._id }, { position: index }))
    );
    res.json({ success: true, message: "Links reordered" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reorder links", error: err.message });
  }
});

// PUT /api/links/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, user: req.user._id });
    if (!link) return res.status(404).json({ success: false, message: "Link not found" });

    const { title, url, icon, active } = req.body;
    if (title !== undefined) link.title = sanitizeText(title, 80);
    if (url !== undefined) {
      if (!isValidUrl(url)) return res.status(400).json({ success: false, message: "Invalid URL" });
      link.url = sanitizeText(url, 500);
    }
    if (icon !== undefined) link.icon = sanitizeText(icon, 10);
    if (active !== undefined) link.active = active === "true" || active === true;

    await link.save();
    res.json({ success: true, link });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update link", error: err.message });
  }
});

// DELETE /api/links/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!link) return res.status(404).json({ success: false, message: "Link not found" });
    res.json({ success: true, message: "Link deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete link", error: err.message });
  }
});

module.exports = router;
