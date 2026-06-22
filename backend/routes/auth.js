// ── routes/auth.js ────────────────────────────────────────────────────────────
const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const passport = require("passport");
const User     = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const { sendPasswordResetEmail } = require("../utils/mailer");

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const safeUser = (user) => ({
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

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "No token provided." });
  try {
    req.userId = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET).id;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Token invalid or expired." });
  }
};

const requireAuthQuery = (req, res, next) => {
  const token = req.query.token;
  if (!token)
    return res.status(401).json({ success: false, error: "No token provided." });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Token invalid or expired." });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(401).json({ success: false, error: "User not found." });
    res.json(safeUser(user));
  } catch (err) {
    console.error("GET /me error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: "All fields are required.", field: "general" });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(409).json({ success: false, error: "An account with this email already exists.", field: "email" });
    const hashed   = await bcrypt.hash(password, 12);
    const initials = name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const user     = await User.create({ name: name.trim(), email, password: hashed, avatar: initials || "U" });
    const token    = signToken(user._id);
    res.status(201).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, error: "Server error. Please try again.", field: "general" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "Email and password are required.", field: "general" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ success: false, error: "No account found with this email address.", field: "email" });
    if (user.password === "GOOGLE_OAUTH_NO_PASSWORD")
      return res.status(401).json({ success: false, error: "This account uses Google Sign-In. Please click 'Continue with Google'.", field: "general" });
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, error: "Incorrect password. Please try again.", field: "password" });
    const token = signToken(user._id);
    res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Server error. Please try again.", field: "general" });
  }
});

// ── GET /api/auth/google ──────────────────────────────────────────────────────
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false, prompt: "select_account" })
);

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.APP_URL || "http://localhost:5173"}/login?error=google_failed`,
  }),
  (req, res) => {
    try {
      const { user: rawUser, isNew } = req.user;
      const token  = signToken(rawUser._id);
      const params = new URLSearchParams({
        token,
        user:      JSON.stringify(safeUser(rawUser)),
        isNewUser: String(!!isNew),
      });
      res.redirect(`${process.env.APP_URL || "http://localhost:5173"}/auth/google/success?${params}`);
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(`${process.env.APP_URL || "http://localhost:5173"}/login?error=google_failed`);
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// LINKEDIN OAUTH  — was completely missing from routes, causing 404
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/auth/linkedin ────────────────────────────────────────────────────
router.get("/linkedin", requireAuthQuery, (req, res, next) => {
  req.session.linkedinConnectUserId = req.userId;
  req.session.save(err => {
    if (err) return res.status(500).json({ success: false, error: "Session error." });
    next();
  });
}, passport.authenticate("linkedin", {
  scope:   ["openid", "profile", "email", "w_member_social"],
  session: false,
}));

// ── GET /api/auth/linkedin/callback ──────────────────────────────────────────
router.get("/linkedin/callback",
  passport.authenticate("linkedin", {
    session:         false,
    failureRedirect: `${process.env.APP_URL || "http://localhost:5173"}/dashboard?linkedin_error=true`,
  }),
  (req, res) => {
    const APP_URL     = process.env.APP_URL || "http://localhost:5173";
    const accountName = req.user?.accountName || "LinkedIn";
    if (req.session) delete req.session.linkedinConnectUserId;
    res.redirect(`${APP_URL}/dashboard?connected=linkedin&name=${encodeURIComponent(accountName)}`);
  }
);

// ════════════════════════════════════════════════════════════════════════════
// DISCONNECT — removes platform token from MongoDB
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/auth/disconnect ─────────────────────────────────────────────────
router.post("/disconnect", requireAuth, async (req, res) => {
  try {
    const { platform } = req.body;
    if (!platform)
      return res.status(400).json({ success: false, error: "platform is required." });
    await User.findByIdAndUpdate(req.userId, {
      $pull: { connectedAccounts: { platform } },
    });
    console.log(`✅ Disconnected ${platform} for user ${req.userId}`);
    res.json({ success: true, message: `${platform} disconnected successfully.` });
  } catch (err) {
    console.error("Disconnect error:", err);
    res.status(500).json({ success: false, error: "Disconnect failed. Please try again." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET LinkedIn URN — used by n8n publish workflow to post on user's behalf
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/auth/linkedin/urn ────────────────────────────────────────────────
// n8n calls this with the user's JWT to get their LinkedIn person URN + token
router.get("/linkedin/urn", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("connectedAccounts");
    if (!user) return res.status(404).json({ success: false, error: "User not found." });

    const account = user.connectedAccounts.find(a => a.platform === "linkedin");
    if (!account)
      return res.status(404).json({ success: false, error: "LinkedIn not connected." });

    res.json({
      success:     true,
      urn:         `urn:li:person:${account.accountId}`,
      accessToken: account.accessToken,
      accountName: account.accountName,
    });
  } catch (err) {
    console.error("GET /linkedin/urn error:", err);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET
// ════════════════════════════════════════════════════════════════════════════

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email is required." });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(404).json({ success: false, error: "No account found with this email address. Please sign up first." });
    if (user.password === "GOOGLE_OAUTH_NO_PASSWORD")
      return res.status(400).json({ success: false, error: "This account uses Google Sign-In and doesn't have a password." });
    await PasswordResetToken.deleteMany({ userId: user._id });
    const rawToken  = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PasswordResetToken.create({ userId: user._id, token: rawToken, expiresAt });
    const resetUrl = `${process.env.APP_URL || "http://localhost:5173"}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
    res.json({ success: true, message: "Reset link sent! Check your inbox." });
  } catch (err) {
    console.error("Forgot-password error:", err);
    res.status(500).json({ success: false, error: "Server error. Please try again." });
  }
});

router.get("/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false, error: "Token is required." });
    const record = await PasswordResetToken.findOne({ token });
    if (!record) return res.status(400).json({ valid: false, error: "Invalid or expired reset link." });
    if (record.used) return res.status(400).json({ valid: false, error: "This reset link has already been used." });
    if (new Date() > record.expiresAt) return res.status(400).json({ valid: false, error: "This reset link has expired. Please request a new one." });
    res.json({ valid: true });
  } catch (err) {
    console.error("Verify-token error:", err);
    res.status(500).json({ valid: false, error: "Server error." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ success: false, error: "Token and new password are required.", field: "general" });
    if (password.length < 8)
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters.", field: "password" });
    const record = await PasswordResetToken.findOne({ token });
    if (!record) return res.status(400).json({ success: false, error: "Invalid or expired reset link.", field: "general" });
    if (record.used) return res.status(400).json({ success: false, error: "This reset link has already been used.", field: "general" });
    if (new Date() > record.expiresAt) return res.status(400).json({ success: false, error: "This reset link has expired. Please request a new one.", field: "general" });
    const hashed = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(record.userId, { password: hashed });
    await PasswordResetToken.findByIdAndUpdate(record._id, { used: true });
    res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset-password error:", err);
    res.status(500).json({ success: false, error: "Server error. Please try again.", field: "general" });
  }
});

module.exports = router;