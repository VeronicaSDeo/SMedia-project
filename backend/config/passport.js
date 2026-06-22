// ── config/passport.js ───────────────────────────────────────────────────────
const passport          = require("passport");
const GoogleStrategy    = require("passport-google-oauth20").Strategy;
const LinkedInStrategy  = require("passport-linkedin-oauth2").Strategy;
const User              = require("../models/User");

// ════════════════════════════════════════════════════════════════════════════
// 1. GOOGLE SIGN-IN STRATEGY  (unchanged)

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email  = profile.emails?.[0]?.value?.toLowerCase();
        const name   = profile.displayName || "User";
        const avatar = profile.photos?.[0]?.value || null;

        if (!email) return done(new Error("No email from Google"), null);

        let user = await User.findOne({ email });

        if (user) {
          let dirty = false;
          if (!user.googleId)            { user.googleId  = profile.id; dirty = true; }
          if (avatar && !user.avatarUrl) { user.avatarUrl = avatar;     dirty = true; }
          if (dirty) await user.save();
          return done(null, { user, isNew: false });
        }

        const initials = name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
        user = await User.create({
          name, email,
          googleId:  profile.id,
          avatarUrl: avatar,
          avatar:    initials || "U",
          password:  "GOOGLE_OAUTH_NO_PASSWORD",
        });

        return done(null, { user, isNew: true });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ════════════════════════════════════════════════════════════════════════════
// 2. YOUTUBE CONNECT STRATEGY  (unchanged)
//    — reuses Google credentials with YouTube scopes
//    — attaches channel to existing user, does NOT sign in
// ════════════════════════════════════════════════════════════════════════════
passport.use(
  "youtube",
  new GoogleStrategy(
    {
      clientID:          process.env.GOOGLE_CLIENT_ID,
      clientSecret:      process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:       process.env.YOUTUBE_CALLBACK_URL || "http://localhost:5000/api/auth/youtube/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userId = req.session?.youtubeConnectUserId;
        if (!userId) return done(new Error("No authenticated user found for YouTube connect"), null);

        const user = await User.findById(userId);
        if (!user) return done(new Error("User not found"), null);

        const channelId   = profile.id;
        const channelName = profile.displayName || "YouTube Channel";

        user.connectedAccounts = user.connectedAccounts.filter(a => a.platform !== "youtube");
        user.connectedAccounts.push({
          platform:     "youtube",
          accessToken,
          refreshToken: refreshToken || null,
          accountId:    channelId,
          accountName:  channelName,
          expiresAt:    null,
          connectedAt:  new Date(),
        });

        await user.save();
        return done(null, { user, channelName });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ════════════════════════════════════════════════════════════════════════════
// 3. LINKEDIN CONNECT STRATEGY  (new)
//    — attaches LinkedIn account to existing logged-in user
//    — does NOT sign in; reads linkedinConnectUserId from session
//    — required scopes: openid, profile, email, w_member_social
// ════════════════════════════════════════════════════════════════════════════
passport.use(
  "linkedin",
  new LinkedInStrategy(
    {
      clientID:          process.env.LINKEDIN_CLIENT_ID,
      clientSecret:      process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL:       process.env.LINKEDIN_CALLBACK_URL || "http://localhost:5000/api/auth/linkedin/callback",
      scope:             ["openid", "profile", "email", "w_member_social"],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userId = req.session?.linkedinConnectUserId;
        if (!userId) return done(new Error("No authenticated user found for LinkedIn connect"), null);

        const user = await User.findById(userId);
        if (!user) return done(new Error("User not found"), null);

        const accountId   = profile.id;
        const accountName =
          profile.displayName ||
          `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim() ||
          "LinkedIn User";

        // Remove any existing LinkedIn entry then add a fresh one
        user.connectedAccounts = user.connectedAccounts.filter(a => a.platform !== "linkedin");
        user.connectedAccounts.push({
          platform:     "linkedin",
          accessToken,
          refreshToken: refreshToken || null,
          accountId,
          accountName,
          expiresAt:    null,
          connectedAt:  new Date(),
        });

        await user.save();
        return done(null, { user, accountName });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ── Session serialization (JWT-based; sessions only used for OAuth handshake) ──
passport.serializeUser((payload, done) => {
  done(null, payload.user?.id || payload.user?._id);
});

passport.deserializeUser(async (id, done) => {
  try   { done(null, await User.findById(id)); }
  catch (err) { done(err, null); }
});

module.exports = passport;