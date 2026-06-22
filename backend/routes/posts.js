// ── routes/posts.js ──────────────────────────────────────────────────────────
const express    = require("express");
const jwt        = require("jsonwebtoken");
const multer     = require("multer");
const cloudinary = require("cloudinary").v2;
const Post       = require("../models/Post");
const User       = require("../models/User");

const router = express.Router();

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer (memory storage — buffer sent to Cloudinary) ───────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/"))
      cb(null, true);
    else
      cb(new Error("Only image or video files are supported."));
  },
});

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "No token provided." });
  try {
    req.userId = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token invalid or expired." });
  }
};

// ── n8n API-key middleware ────────────────────────────────────────────────────
const requireN8nKey = (req, res, next) => {
  if (req.headers["x-api-key"] !== process.env.N8N_API_KEY)
    return res.status(401).json({ success: false, error: "Unauthorized." });
  next();
};

// ── Helper: upload buffer to Cloudinary ──────────────────────────────────────
function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith("video/") ? "video" : "image";
    const stream = cloudinary.uploader.upload_stream(
      { folder: "smedia", resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ── Helper: notify n8n (fire-and-forget) ─────────────────────────────────────
async function notifyN8n(post) {
  const webhookUrl = process.env.N8N_SCHEDULE_WEBHOOK;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        postId:      post._id,
        userId:      post.userId,
        platform:    post.platform,
        caption:     post.caption,
        hashtags:    post.hashtags,
        mediaUrl:    post.mediaUrl,
        mediaType:   post.mediaType,
        scheduledAt: post.scheduledAt,
        topic:       post.topic,
      }),
    });
  } catch (e) {
    console.warn("n8n notify failed (non-fatal):", e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FRONTEND ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/posts ───────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      platform, topic, caption = "", hashtags = [],
      mediaUrl = null, mediaType = "none",
      tone = "exciting", contentType = "both",
    } = req.body;

    if (!platform || !topic)
      return res.status(400).json({ success: false, error: "platform and topic are required." });

    const post = await Post.create({
      userId: req.userId,
      platform, topic, caption, hashtags,
      mediaUrl, mediaType,
      tone, contentType,
      status: "draft",
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error("POST /api/posts:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── POST /api/posts/upload ────────────────────────────────────────────────────
// Upload file to Cloudinary → save public URL in MongoDB (no more base64)
router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, error: "No file uploaded." });

    const { caption = "", hashtags = "[]", platform, topic, tone = "exciting" } = req.body;

    if (!platform || !topic)
      return res.status(400).json({ success: false, error: "platform and topic are required." });

    // Upload to Cloudinary — returns a public HTTPS URL
    console.log("Uploading to Cloudinary...");
    const cloudResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    const publicUrl   = cloudResult.secure_url;
    const mediaType   = req.file.mimetype.startsWith("video/") ? "uploaded_video" : "uploaded_image";
    console.log("✅ Cloudinary upload success:", publicUrl);

    const parsedHashtags = (() => {
      try { return JSON.parse(hashtags); } catch { return []; }
    })();

    const post = await Post.create({
      userId:      req.userId,
      platform,
      topic,
      caption,
      hashtags:    parsedHashtags,
      mediaUrl:    publicUrl,   // ✅ Public Cloudinary URL — LinkedIn can access this
      mediaType,
      tone,
      contentType: "uploadall",
      status:      "draft",
    });

    res.status(201).json({ success: true, post: { ...post.toObject(), mediaUrl: publicUrl } });
  } catch (err) {
    console.error("POST /api/posts/upload:", err);
    res.status(500).json({ success: false, error: err.message || "Upload failed." });
  }
});

// ── GET /api/posts ────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const { platform, status, limit = 50, skip = 0 } = req.query;
    const filter = { userId: req.userId };
    if (platform) filter.platform = platform;
    if (status)   filter.status   = status;

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Post.countDocuments(filter);
    res.json({ success: true, posts, total });
  } catch (err) {
    console.error("GET /api/posts:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── GET /api/posts/:id ────────────────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId });
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── PATCH /api/posts/:id/schedule ─────────────────────────────────────────────
router.patch("/:id/schedule", requireAuth, async (req, res) => {
  try {
    const { scheduledAt, platform } = req.body;
    if (!scheduledAt)
      return res.status(400).json({ success: false, error: "scheduledAt is required." });

    const date = new Date(scheduledAt);
    if (isNaN(date.getTime()))
      return res.status(400).json({ success: false, error: "Invalid scheduledAt date." });

    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { scheduledAt: date, status: "scheduled", ...(platform ? { platform } : {}) },
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });

    notifyN8n(post);
    res.json({ success: true, post });
  } catch (err) {
    console.error("PATCH /api/posts/:id/schedule:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── PATCH /api/posts/:id/publish ──────────────────────────────────────────────
// Called by frontend after n8n publishes — marks post as published in MongoDB.
router.patch("/:id/publish", requireAuth, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: "published", postedAt: new Date() },
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });
    res.json({ success: true, post });
  } catch (err) {
    console.error("PATCH /api/posts/:id/publish:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── PATCH /api/posts/:id ──────────────────────────────────────────────────────
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const allowed = ["caption", "hashtags", "platform", "tone", "status", "mediaUrl", "mediaType"];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      update,
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── DELETE /api/posts/:id ─────────────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// N8N ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/posts/n8n/due ────────────────────────────────────────────────────
router.get("/n8n/due", requireN8nKey, async (req, res) => {
  try {
    const now = new Date();
    const duePosts = await Post.find({
      status:      { $in: ["scheduled", "confirmed"] },
      scheduledAt: { $lte: now },
    }).lean();

    const userIds = [...new Set(duePosts.map(p => p.userId.toString()))];
    const users   = await User.find({ _id: { $in: userIds } }).select("connectedAccounts").lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const enriched = duePosts.map(post => {
      const user    = userMap[post.userId.toString()];
      const account = user?.connectedAccounts?.find(a => a.platform === post.platform);
      return {
        ...post,
        accessToken:  account?.accessToken  || null,
        refreshToken: account?.refreshToken || null,
        accountId:    account?.accountId    || null,
        accountName:  account?.accountName  || null,
      };
    });

    res.json({ success: true, count: enriched.length, posts: enriched });
  } catch (err) {
    console.error("GET /api/posts/n8n/due:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── PATCH /api/posts/n8n/mark-posted ─────────────────────────────────────────
router.patch("/n8n/mark-posted", requireN8nKey, async (req, res) => {
  try {
    const { postId, success: didPost, errorMsg, n8nJobId } = req.body;
    if (!postId) return res.status(400).json({ success: false, error: "postId required." });

    const post = await Post.findByIdAndUpdate(postId, {
      status:   didPost ? "published" : "failed",
      postedAt: didPost ? new Date()  : null,
      errorMsg: errorMsg || null,
      ...(n8nJobId ? { n8nJobId } : {}),
    }, { new: true });

    if (!post) return res.status(404).json({ success: false, error: "Post not found." });
    res.json({ success: true, post });
  } catch (err) {
    console.error("PATCH /api/posts/n8n/mark-posted:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── GET /api/posts/n8n/all ────────────────────────────────────────────────────
router.get("/n8n/all", requireN8nKey, async (req, res) => {
  try {
    const { status, platform, from, to } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (platform) filter.platform = platform;
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to)   filter.scheduledAt.$lte = new Date(to);
    }

    const posts = await Post.find(filter).sort({ scheduledAt: 1 }).lean();
    res.json({ success: true, count: posts.length, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error." });
  }
});

module.exports = router;