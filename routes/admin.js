const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const Link = require("../models/Link");
const Portfolio = require("../models/Portfolio");
const { requireAdmin } = require("../middleware/auth");
const { signToken, daysAgo, toCSV } = require("../utils/helpers");

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production"
};

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Username/email and password are required" });
    }
    const id = String(identifier).trim().toLowerCase();
    const user = await User.findOne({ $or: [{ username: id }, { email: id }], isAdmin: true });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }
    user.lastLoginAt = new Date();
    await user.save();
    const token = signToken({ id: user._id });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ success: true, token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Admin login failed", error: err.message });
  }
});

// GET /api/admin/profile
router.get("/profile", requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, username: req.user.username, email: req.user.email });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load profile", error: err.message });
  }
});

// GET /api/admin/stats
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isAdmin: true })
    ]);
    const inactiveUsers = totalUsers - activeUsers;

    // Last 7 days registrations
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const registrationsLast7Days = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      registrationsLast7Days
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load stats", error: err.message });
  }
});

// GET /api/admin/users
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "50", 10);
    const search = req.query.q || "";

    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users: users.map((u) => u.toSafeJSON()),
      total,
      page,
      limit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load users", error: err.message });
  }
});

// GET /api/admin/users/search
router.get("/users/search", requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ success: true, users: [] });
    const users = await User.find({
      $or: [{ username: new RegExp(q, "i") }, { email: new RegExp(q, "i") }]
    }).limit(50);
    res.json({ success: true, users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Search failed", error: err.message });
  }
});

// GET /api/admin/users/export
router.get("/users/export", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("username email displayName isActive isAdmin createdAt");
    const rows = users.map((u) => ({
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      isActive: u.isActive,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt.toISOString()
    }));
    const csv = toCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=dot-users-export.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: "Export failed", error: err.message });
  }
});

// PUT /api/admin/users/:id/activate
router.put("/users/:id/activate", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = true;
    await user.save();
    res.json({ success: true, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to activate user", error: err.message });
  }
});

// PUT /api/admin/users/:id/deactivate
router.put("/users/:id/deactivate", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = false;
    await user.save();
    res.json({ success: true, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to deactivate user", error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.isAdmin) {
      return res.status(400).json({ success: false, message: "Cannot delete an admin account" });
    }
    await Promise.all([
      Link.deleteMany({ user: user._id }),
      Portfolio.deleteMany({ user: user._id }),
      User.deleteOne({ _id: user._id })
    ]);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete user", error: err.message });
  }
});

// POST /api/admin/cleanup
router.post("/cleanup", requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ isActive: false, isAdmin: false });
    const toDelete = users.filter((u) => daysAgo(u.updatedAt) >= 90);
    const ids = toDelete.map((u) => u._id);
    await Promise.all([
      Link.deleteMany({ user: { $in: ids } }),
      Portfolio.deleteMany({ user: { $in: ids } }),
      User.deleteMany({ _id: { $in: ids } })
    ]);
    res.json({ success: true, message: `Cleaned up ${ids.length} inactive user(s)`, deletedCount: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, message: "Cleanup failed", error: err.message });
  }
});

// GET /api/admin/logs
router.get("/logs", requireAdmin, async (req, res) => {
  try {
    const recentSignups = await User.find().sort({ createdAt: -1 }).limit(20).select("username createdAt");
    const recentLogins = await User.find({ lastLoginAt: { $ne: null } })
      .sort({ lastLoginAt: -1 })
      .limit(20)
      .select("username lastLoginAt");

    const logs = [
      ...recentSignups.map(u => ({
        timestamp: u.createdAt,
        action: "User registered",
        details: `@${u.username} created an account`
      })),
      ...recentLogins.map(u => ({
        timestamp: u.lastLoginAt,
        action: "User logged in",
        details: `@${u.username} signed in`
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30);

    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load logs", error: err.message });
  }
});

// PUT /api/admin/profile
router.put("/profile", requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (email !== undefined) req.user.email = String(email).trim().toLowerCase();
    await req.user.save();
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update admin profile", error: err.message });
  }
});

// PUT /api/admin/password
router.put("/password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    const match = await bcrypt.compare(currentPassword, req.user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }
    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();
    res.json({ success: true, message: "Admin password updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update password", error: err.message });
  }
});

module.exports = router;