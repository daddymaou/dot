const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dot-dev-secret";

function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function isValidUrl(str) {
  if (!str) return true; // optional fields
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function sanitizeText(str, maxLength = 500) {
  if (!str) return "";
  return String(str).trim().slice(0, maxLength);
}

function daysAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const val = row[h] === undefined || row[h] === null ? "" : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
  }
  return lines.join("\n");
}

module.exports = {
  signToken,
  verifyToken,
  isValidUrl,
  normalizeUsername,
  sanitizeText,
  daysAgo,
  toCSV
};
