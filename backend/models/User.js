// ── models/User.js ────────────────────────────────────────────────────────────
const mongoose = require("mongoose");

// ── Sub-schema: one connected social account ──────────────────────────────────
const connectedAccountSchema = new mongoose.Schema({
  platform:     { type: String, required: true },   // "instagram" | "linkedin" | "youtube" etc.
  accessToken:  { type: String, required: true },
  refreshToken: { type: String, default: null },
  accountId:    { type: String, default: null },     // platform user/page ID
  accountName:  { type: String, default: null },     // display name on that platform
  expiresAt:    { type: Date,   default: null },
  connectedAt:  { type: Date,   default: Date.now },
}, { _id: false });

// ── Sub-schema: one scheduled post ───────────────────────────────────────────
const scheduledPostSchema = new mongoose.Schema({
  platform:    { type: String, required: true },
  text:        { type: String, required: true },
  imageUrl:    { type: String, default: null },
  scheduledAt: { type: Date,   required: true },   // exact ISO datetime to post
  day:         { type: Number },
  month:       { type: Number },
  year:        { type: Number },
  time:        { type: String },                   // "HH:MM" — display only
  status: {
    type:    String,
    enum:    ["scheduled", "draft", "confirmed", "published", "failed"],
    default: "scheduled",
  },
  postedAt:  { type: Date,   default: null },
  errorMsg:  { type: String, default: null },
}, { timestamps: true });

// ── Sub-schema: usage stats ───────────────────────────────────────────────────
const statsSchema = new mongoose.Schema({
  postsGenerated: { type: Number, default: 0 },
  postsScheduled: { type: Number, default: 0 },
  postsPublished: { type: Number, default: 0 },
}, { _id: false });

// ── Main user schema ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Core identity ─────────────────────────────────────────────────────────
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    plan:      { type: String, enum: ["Free", "Pro"], default: "Free" },
    avatar:    { type: String, default: "U" },
    avatarUrl: { type: String, default: null },
    googleId:  { type: String, default: null },

    // ── Onboarding / profile fields (used by /api/user/me) ───────────────────
    role:      { type: String, default: null },   // e.g. "Founder", "Marketer"
    industry:  { type: String, default: null },   // e.g. "SaaS", "E-commerce"
    tone:      { type: String, default: null },   // e.g. "Professional", "Casual"
    goal:      { type: String, default: null },   // e.g. "Grow followers", "Drive sales"
    brandName: { type: String, default: null },

    // ── Platforms the user wants to post to (checklist during onboarding) ────
    platforms: { type: [String], default: [] },   // ["instagram","linkedin",…]

    // ── Usage stats ───────────────────────────────────────────────────────────
    stats: { type: statsSchema, default: () => ({}) },

    // ── Connected social accounts (OAuth) ────────────────────────────────────
    connectedAccounts: { type: [connectedAccountSchema], default: [] },

    // ── Scheduled posts (calendar + n8n) ─────────────────────────────────────
    scheduledPosts: { type: [scheduledPostSchema], default: [] },
  },
  { timestamps: true }
);

// ── Helper: get a specific connected account ──────────────────────────────────
userSchema.methods.getConnectedAccount = function (platform) {
  return this.connectedAccounts.find(a => a.platform === platform) || null;
};

// ── Helper: check if a platform is connected ──────────────────────────────────
userSchema.methods.isPlatformConnected = function (platform) {
  return this.connectedAccounts.some(a => a.platform === platform);
};

// ── Helper: upsert a connected account (add or update) ───────────────────────
userSchema.methods.upsertConnectedAccount = function (platform, data) {
  const idx = this.connectedAccounts.findIndex(a => a.platform === platform);
  if (idx >= 0) {
    Object.assign(this.connectedAccounts[idx], data);
  } else {
    this.connectedAccounts.push({ platform, ...data });
  }
};

module.exports = mongoose.model("User", userSchema);