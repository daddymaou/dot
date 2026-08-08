const mongoose = require("mongoose");

const LinkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  url: { type: String, required: true, trim: true },
  icon: { type: String, default: "🔗" },
  position: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

LinkSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Link", LinkSchema);
