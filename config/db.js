const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/dot";
    await mongoose.connect(uri);
    console.log(`[dot] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("[dot] MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
