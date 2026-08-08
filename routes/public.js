const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Link = require("../models/Link");
const Portfolio = require("../models/Portfolio");
const { normalizeUsername } = require("../utils/helpers");

const RESERVED = ["api", "admin", "dashboard", "login", "register", "uploads", "public", "assets", "css", "js", "images"];

// GET /:username (public profile page)
router.get("/:username", async (req, res) => {
  try {
    const username = normalizeUsername(req.params.username);
    if (RESERVED.includes(username)) {
      return res.status(404).render("404", { title: "Not Found" });
    }
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(404).render("404", { title: "Not Found" });
    }
    const [links, portfolio] = await Promise.all([
      Link.find({ user: user._id, active: true }).sort({ position: 1 }),
      Portfolio.find({ user: user._id, active: true }).sort({ position: 1 })
    ]);
    res.render("link", {
      title: `${user.displayName || user.username} · Dot`,
      profile: user,
      links,
      portfolio
    });
  } catch (err) {
    res.status(500).send("Something went wrong loading this page.");
  }
});

module.exports = router;
