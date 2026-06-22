// ── models/PasswordResetToken.js ──────────────────────────────────────────────
const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    // MongoDB TTL index — auto-deletes expired docs
    index: { expires: 0 },
  },
  used: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);