const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"]
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  displayName: { type: String, default: "", maxlength: 60 },
  bio: { type: String, default: "", maxlength: 160 },
  location: { type: String, default: "", maxlength: 80 },
  avatarUrl: { type: String, default: "" },
  social: {
    twitter: { type: String, default: "" },
    github: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    youtube: { type: String, default: "" },
    instagram: { type: String, default: "" }
  },
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    bio: this.bio,
    location: this.location,
    avatarUrl: this.avatarUrl,
    social: this.social,
    createdAt: this.createdAt
  };
};

UserSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    displayName: this.displayName,
    bio: this.bio,
    location: this.location,
    avatarUrl: this.avatarUrl,
    social: this.social,
    isAdmin: this.isAdmin,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model("User", UserSchema);
