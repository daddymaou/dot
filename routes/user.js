const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const Link = require("../models/Link");
const Portfolio = require("../models/Portfolio");
const { requireAuth } = require("../middleware/auth");
const { upload, handleUploadError } = require("../middleware/upload");
const { isValidUrl, sanitizeText, normalizeUsername } = require("../utils/helpers");

// GET /api/user/:username (public profile data)
router.get("/:username", async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const [links, portfolio] = await Promise.all([
      Link.find({ user: user._id, active: true }).sort({ position: 1 }),
      Portfolio.find({ user: user._id, active: true }).sort({ position: 1 })
    ]);
    res.json({ success: true, user: user.toPublicJSON(), links, portfolio });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load user", error: err.message });
  }
});

// PUT /api/user/profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { displayName, bio, location } = req.body;
    if (displayName !== undefined) req.user.displayName = sanitizeText(displayName, 60);
    if (bio !== undefined) req.user.bio = sanitizeText(bio, 160);
    if (location !== undefined) req.user.location = sanitizeText(location, 80);
    await req.user.save();
    res.json({ success: true, user: req.user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update profile", error: err.message });
  }
});

// PUT /api/user/social
router.put("/social", requireAuth, async (req, res) => {
  try {
    const { twitter, github, linkedin, youtube, instagram } = req.body;
    const fields = { twitter, github, linkedin, youtube, instagram };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        if (value && !isValidUrl(value)) {
          return res.status(400).json({ success: false, message: `Invalid URL for ${key}` });
        }
        req.user.social[key] = sanitizeText(value, 300);
      }
    }
    await req.user.save();
    res.json({ success: true, user: req.user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update social links", error: err.message });
  }
});

// PUT /api/user/password
router.put("/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }
    const match = await bcrypt.compare(currentPassword, req.user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }
    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update password", error: err.message });
  }
});

// POST /api/user/avatar
router.post("/avatar", requireAuth, upload.single("avatar"), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    req.user.avatarUrl = req.file.path;
    await req.user.save();
    res.json({ success: true, avatarUrl: req.user.avatarUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to upload avatar", error: err.message });
  }
});

module.exports = router;