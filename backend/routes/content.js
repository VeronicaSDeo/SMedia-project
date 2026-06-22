// ── routes/content.js ────────────────────────────────────────────────────────
const express  = require("express");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const User     = require("../models/User");
const GeneratedContent = require("../models/GeneratedContent");

const router = express.Router();

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "No token provided." });
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Token invalid or expired." });
  }
};

// ── Helper: build Kling JWT (HMAC-SHA256) ─────────────────────────────────────
function buildKlingJWT(accessKey, secretKey) {
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: accessKey,
    exp: now + 1800,
    nbf: now - 5,
  })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

// ════════════════════════════════════════════════════════════════════════════
// GENERATED CONTENT
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/content/save ────────────────────────────────────────────────────
// FIX: now protected by requireAuth — userId comes from JWT, not request body
router.post("/save", requireAuth, async (req, res) => {
  try {
    const { topic, platform, tone, caption, hashtags } = req.body;
    const content = await GeneratedContent.create({
      userId: req.userId,   // ← secure: from JWT, not from client body
      topic,
      platform,
      tone,
      caption,
      hashtags,
    });
    res.json({ success: true, content });
  } catch (err) {
    console.error("POST /api/content/save:", err);
    res.status(500).json({ success: false, error: err.message || "Server error." });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    const history = await GeneratedContent.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// KLING AI VIDEO GENERATION
// ════════════════════════════════════════════════════════════════════════════

router.post("/generate-video", requireAuth, async (req, res) => {
  const { prompt, duration = 5, aspectRatio = "16:9" } = req.body;

  if (!prompt?.trim())
    return res.status(400).json({ success: false, error: "Prompt is required." });

  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;

  if (!accessKey || !secretKey)
    return res.status(500).json({
      success: false,
      error: "KLING_ACCESS_KEY and KLING_SECRET_KEY not set in backend .env — get them at klingai.com",
    });

  try {
    const token     = buildKlingJWT(accessKey, secretKey);
    const submitRes = await fetch("https://api.klingai.com/v1/videos/text2video", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body:    JSON.stringify({
        model:        "kling-v1",
        prompt:       prompt.trim(),
        duration,
        aspect_ratio: aspectRatio,
        mode:         "std",
      }),
    });

    const submitData = await submitRes.json();

    if (!submitRes.ok || submitData.code !== 0) {
      console.error("Kling submit error:", submitData);
      return res.status(502).json({
        success: false,
        error: submitData.message || `Kling API error ${submitRes.status}`,
      });
    }

    const taskId = submitData?.data?.task_id;
    if (!taskId)
      return res.status(502).json({ success: false, error: "No task ID from Kling — check your API keys" });

    console.log(`✅ Kling task submitted: ${taskId}`);

    const pollUrl = `https://api.klingai.com/v1/videos/text2video/${taskId}`;

    for (let i = 0; i < 36; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const freshToken = buildKlingJWT(accessKey, secretKey);
      const pollRes    = await fetch(pollUrl, {
        headers: { "Authorization": `Bearer ${freshToken}` },
      });
      const pollData = await pollRes.json();
      const status   = pollData?.data?.task_status;

      console.log(`  Kling poll ${i + 1}/36: status = ${status}`);

      if (status === "succeed") {
        const videoUrl = pollData?.data?.task_result?.videos?.[0]?.url;
        if (!videoUrl)
          return res.status(502).json({ success: false, error: "Video ready but URL missing" });
        console.log(`✅ Kling video ready: ${videoUrl}`);
        return res.json({ success: true, videoUrl, taskId });
      }

      if (status === "failed") {
        const msg = pollData?.data?.task_status_msg || "Video generation failed";
        console.error("Kling failed:", msg);
        return res.status(502).json({ success: false, error: msg });
      }
    }

    return res.status(504).json({
      success: false,
      error: "Video generation timed out (3 min). Try a simpler/shorter prompt.",
    });

  } catch (err) {
    console.error("Kling video route error:", err);
    res.status(500).json({ success: false, error: err.message || "Server error" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULED POSTS
// ════════════════════════════════════════════════════════════════════════════

router.post("/schedule", requireAuth, async (req, res) => {
  try {
    const { platform, text, imageUrl, day, month, year, time, status } = req.body;

    if (!platform || !text || !day || month == null || !year || !time)
      return res.status(400).json({ success: false, error: "Missing required fields." });

    const paddedMonth = String(month + 1).padStart(2, "0");
    const paddedDay   = String(day).padStart(2, "0");
    const scheduledAt = new Date(`${year}-${paddedMonth}-${paddedDay}T${time}:00`);

    if (isNaN(scheduledAt.getTime()))
      return res.status(400).json({ success: false, error: "Invalid date/time." });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    user.scheduledPosts.push({
      platform, text, imageUrl: imageUrl || null,
      scheduledAt, day, month, year, time,
      status: status || "scheduled",
    });

    await user.save();
    const newPost = user.scheduledPosts[user.scheduledPosts.length - 1];
    res.status(201).json({ success: true, post: newPost });
  } catch (err) {
    console.error("Schedule post error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

router.get("/schedule", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("scheduledPosts");
    if (!user) return res.status(404).json({ success: false, error: "User not found." });
    res.json({ success: true, posts: user.scheduledPosts });
  } catch (err) {
    console.error("Get schedule error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

router.patch("/schedule/:postId", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    const post = user.scheduledPosts.id(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });

    const allowed = ["platform", "text", "imageUrl", "day", "month", "year", "time", "status"];
    allowed.forEach(field => { if (req.body[field] !== undefined) post[field] = req.body[field]; });

    if (req.body.day || req.body.month != null || req.body.year || req.body.time) {
      const d = String(post.day).padStart(2, "0");
      const m = String(post.month + 1).padStart(2, "0");
      post.scheduledAt = new Date(`${post.year}-${m}-${d}T${post.time}:00`);
    }

    await user.save();
    res.json({ success: true, post });
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

router.delete("/schedule/:postId", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    const post = user.scheduledPosts.id(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });

    post.deleteOne();
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── n8n routes ────────────────────────────────────────────────────────────────
router.get("/schedule/due", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.N8N_API_KEY)
      return res.status(401).json({ success: false, error: "Unauthorized." });

    const now   = new Date();
    const users = await User.find({
      scheduledPosts: { $elemMatch: { status: { $in: ["scheduled", "confirmed"] }, scheduledAt: { $lte: now } } }
    }).select("scheduledPosts connectedAccounts email name");

    const duePosts = [];
    users.forEach(user => {
      user.scheduledPosts.forEach(post => {
        if (["scheduled", "confirmed"].includes(post.status) && post.scheduledAt <= now) {
          const account = user.connectedAccounts.find(a => a.platform === post.platform);
          duePosts.push({
            userId: user._id, postId: post._id,
            platform: post.platform, text: post.text, imageUrl: post.imageUrl,
            scheduledAt: post.scheduledAt,
            accessToken: account?.accessToken || null,
            accountId:   account?.accountId   || null,
          });
        }
      });
    });

    res.json({ success: true, posts: duePosts });
  } catch (err) {
    console.error("Due posts error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

router.patch("/schedule/mark-posted", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.N8N_API_KEY)
      return res.status(401).json({ success: false, error: "Unauthorized." });

    const { userId, postId, success: didPost, errorMsg } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    const post = user.scheduledPosts.id(postId);
    if (!post) return res.status(404).json({ success: false, error: "Post not found." });

    post.status   = didPost ? "published" : "failed";
    post.postedAt = didPost ? new Date() : null;
    post.errorMsg = errorMsg || null;

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Mark posted error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

module.exports = router;