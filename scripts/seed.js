require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dot");
    console.log("[dot] Connected to MongoDB for seeding");

    const adminUsername = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@maou.name.ng";

    const existing = await User.findOne({ username: adminUsername });
    if (existing) {
      console.log(`[dot] Admin user "${adminUsername}" already exists. Skipping.`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        displayName: "Admin",
        isAdmin: true,
        isActive: true
      });
      console.log(`[dot] Admin user created — username: "${adminUsername}", password: "${adminPassword}"`);
      console.log("[dot] IMPORTANT: Change the admin password after first login.");
    }

    await mongoose.disconnect();
    console.log("[dot] Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("[dot] Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
