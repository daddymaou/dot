require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const linkRoutes = require("./routes/links");
const portfolioRoutes = require("./routes/portfolio");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dot-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  })
);
app.use(flash());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Landing page
app.get("/", (req, res) => {
  res.render("index", { title: "Dot — Your links. One page." });
});

// Dashboard page (client-side auth guard handles redirect if not logged in)
app.get("/dashboard", (req, res) => {
  res.render("dashboard", { title: "Dashboard · Dot" });
});

// Admin pages
app.get("/admin/login", (req, res) => {
  res.render("admin/login", { title: "Admin Login - Dot" });
});

app.get("/admin", (req, res) => {
  res.render("admin/dashboard", { title: "Admin Dashboard - Dot" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/admin", adminRoutes);

// Public profile pages — must be registered after API + static + dashboard
app.use("/", publicRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", { title: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[dot] Server running at http://localhost:${PORT}`);
});