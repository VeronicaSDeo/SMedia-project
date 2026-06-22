const mongoose = require("mongoose");

const generatedContentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  topic: String,
  platform: String,
  tone: String,

  caption: String,

  hashtags: [String],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "GeneratedContent",
  generatedContentSchema
);