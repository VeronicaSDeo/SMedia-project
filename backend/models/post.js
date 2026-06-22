// ── models/Post.js ────────────────────────────────────────────────────────────
// Standalone collection — every generated post lives here.
// Images are stored as base64 data URLs directly in MongoDB Atlas.

const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // ── Content ──────────────────────────────────────────────────────────────
    platform:    { type: String, required: true },
    topic:       { type: String, required: true },
    caption:     { type: String, default: "" },
    hashtags:    { type: [String], default: [] },
    tone:        { type: String, default: "exciting" },
    contentType: { type: String, default: "both" },

    // ── Media ─────────────────────────────────────────────────────────────────
    // For uploaded images: base64 data URL ("data:image/png;base64,...")
    // For AI images: Unsplash URL
    // For AI videos: Kling video URL
    mediaUrl:  { type: String, default: null },
    mediaType: { type: String, default: "none" },
    // "none" | "ai_image" | "ai_video" | "uploaded_image"

    // ── Schedule ──────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["draft", "scheduled", "confirmed", "published", "failed"],
      default: "draft",
      index:   true,
    },
    scheduledAt: { type: Date,   default: null, index: true },
    postedAt:    { type: Date,   default: null },
    errorMsg:    { type: String, default: null },

    // ── n8n tracking ──────────────────────────────────────────────────────────
    n8nJobId: { type: String, default: null },
  },
  { timestamps: true }
);

// Fast query for n8n's "fetch due posts" polling
postSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model("Post", postSchema);