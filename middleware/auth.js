const { verifyToken } = require("../utils/helpers");
const User = require("../models/User");

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

async function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: "Account not found or deactivated" });
  }
  req.user = user;
  next();
}

async function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = await User.findById(decoded.id);
      if (user && user.isActive) req.user = user;
    }
  }
  next();
}

async function requireAdmin(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
  const user = await User.findById(decoded.id);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  req.user = user;
  next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin, getTokenFromRequest };
