const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const { signToken } = require("../utils/helpers");
const { requireAuth } = require("../middleware/auth");

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production"
};

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    let { username, email, password } = req.body;
    username = String(username || "").trim().toLowerCase();
    email = String(email || "").trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Username, email, and password are required" });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ success: false, message: "Username must be 3-30 characters" });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Username can only contain lowercase letters, numbers, and underscores" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ success: false, message: "Username or email already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      displayName: username
    });

    const token = signToken({ id: user._id });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(201).json({ success: true, token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Registration failed", error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Username/email and password are required" });
    }
    const id = String(identifier).trim().toLowerCase();
    const user = await User.findOne({ $or: [{ username: id }, { email: id }] });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "This account has been deactivated" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({ id: user._id });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ success: true, token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed", error: err.message });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

module.exports = router;
