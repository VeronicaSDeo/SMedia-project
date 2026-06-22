// ── server.js ─────────────────────────────────────────────────────────────────
require("dotenv").config();

const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const session  = require("express-session");
const jwt      = require("jsonwebtoken");
const cron     = require("node-cron");
const passport = require("./config/passport");

const authRoutes    = require("./routes/auth");
const contentRoutes = require("./routes/content");
const postsRoutes   = require("./routes/posts");
const User          = require("./models/User");
const Post          = require("./models/Post");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.APP_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.JWT_SECRET || "smedia_session_secret",
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, maxAge: 15 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── MongoDB ───────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    startCronJobs(); // start cron only after DB is ready
  })
  .catch(err => console.error("❌ MongoDB:", err));

// ── Shared requireAuth middleware ─────────────────────────────────────────────
// NOTE: sets req.userId (not req.user) — consistent with routes/auth.js
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "No token provided." });
  try {
    req.userId = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token invalid or expired." });
  }
}

function requireAuthQuery(req, res, next) {
  const token = req.query.token;
  if (!token)
    return res.status(401).json({ success: false, error: "No token provided." });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token invalid or expired." });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
// ALL /api/auth/* routes (login, signup, google, linkedin, youtube, disconnect, urn)
// are handled in routes/auth.js — do NOT re-define any of them here
app.use("/api/auth",    authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/posts",   postsRoutes);

// ── GET /api/user/me ──────────────────────────────────────────────────────────
app.get("/api/user/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(401).json({ success: false, error: "User not found." });
    res.json({
      id:        user._id,
      name:      user.name,
      email:     user.email,
      plan:      user.plan      || "Free",
      role:      user.role      || null,
      industry:  user.industry  || null,
      tone:      user.tone      || null,
      goal:      user.goal      || null,
      brandName: user.brandName || null,
      platforms: user.platforms || [],
      avatar:    user.avatar    || null,
      avatarUrl: user.avatarUrl || null,
      joinedAt:  user.createdAt,
      stats:     user.stats     || {},
      connectedAccounts: (user.connectedAccounts || []).map(a => ({
        platform:    a.platform,
        accountName: a.accountName,
        accountId:   a.accountId,
        connectedAt: a.connectedAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/user/me:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── PATCH /api/user/me ────────────────────────────────────────────────────────
app.patch("/api/user/me", requireAuth, async (req, res) => {
  const allowed = ["name", "email", "tone", "goal", "industry", "brandName"];
  const update  = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  try {
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, error: "User not found." });
    res.json({ success: true, user });
  } catch (err) {
    console.error("PATCH /api/user/me:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/", (_, res) => res.send("✅ SMedia Backend Running"));

// ════════════════════════════════════════════════════════════════════════════
// CRON — Auto-publish scheduled posts every minute
// ════════════════════════════════════════════════════════════════════════════
function startCronJobs() {
  const N8N_PUBLISH = process.env.N8N_PUBLISH_WEBHOOK || "http://localhost:5678/webhook/publish-post";

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find all posts that are scheduled and due
      const duePosts = await Post.find({
        status:      "scheduled",
        scheduledAt: { $lte: now },
      }).lean();

      if (duePosts.length === 0) return;

      console.log(`⏰ Cron: found ${duePosts.length} due post(s)`);

      for (const post of duePosts) {
        try {
          // Get user's connected account for this platform
          const user    = await User.findById(post.userId).select("connectedAccounts");
          const account = user?.connectedAccounts?.find(a => a.platform === post.platform);

          if (!account?.accessToken) {
            console.warn(`⚠️ No ${post.platform} token for user ${post.userId} — skipping post ${post._id}`);
            await Post.findByIdAndUpdate(post._id, { status: "failed", errorMsg: "Platform not connected" });
            continue;
          }

          // Mark as processing immediately to avoid duplicate triggers
          await Post.findByIdAndUpdate(post._id, { status: "published", postedAt: new Date() });

          // Build JWT for this user so n8n can call /api/auth/linkedin/urn
          const userJwt = jwt.sign({ id: post.userId }, process.env.JWT_SECRET, { expiresIn: "1h" });

          // Trigger n8n publish workflow
          const res = await fetch(N8N_PUBLISH, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              platform:  post.platform,
              caption:   post.caption  || "",
              hashtags:  post.hashtags || [],
              mediaUrl:  post.mediaUrl || "",
              postId:    post._id.toString(),
              userToken: userJwt,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            console.error(`❌ n8n publish failed for post ${post._id}:`, err);
            await Post.findByIdAndUpdate(post._id, { status: "failed", errorMsg: `n8n error: ${res.status}` });
          } else {
            console.log(`✅ Auto-published post ${post._id} on ${post.platform}`);
          }
        } catch (postErr) {
          console.error(`❌ Error processing post ${post._id}:`, postErr.message);
          await Post.findByIdAndUpdate(post._id, { status: "failed", errorMsg: postErr.message });
        }
      }
    } catch (err) {
      console.error("❌ Cron job error:", err.message);
    }
  });

  console.log("⏰ Cron job started — checking for scheduled posts every minute");
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));