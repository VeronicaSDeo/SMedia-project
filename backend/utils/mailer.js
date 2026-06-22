// ── utils/mailer.js ───────────────────────────────────────────────────────────
// Sends transactional emails via Nodemailer.
// Supports Gmail (App Password), generic SMTP, or any provider.
//
// Required .env vars:
//   SMTP_HOST      e.g. smtp.gmail.com          (or leave blank to use Gmail shortcut)
//   SMTP_PORT      e.g. 587
//   SMTP_SECURE    true for port 465, false for 587 (STARTTLS)
//   SMTP_USER      your full email address
//   SMTP_PASS      Gmail App Password (16-char, no spaces) OR SMTP password
//   FROM_NAME      e.g.  SMedia
//   FROM_EMAIL     e.g.  no-reply@yourdomain.com  (can equal SMTP_USER for Gmail)

const nodemailer = require("nodemailer");

// ── Build transport once ──────────────────────────────────────────────────────
const createTransport = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true"; // true = 465, false = STARTTLS

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Keeps the connection alive for bulk sends (optional)
    pool: true,
  });
};

let _transporter = null;
const getTransporter = () => {
  if (!_transporter) _transporter = createTransport();
  return _transporter;
};

// ── Send password-reset email ─────────────────────────────────────────────────
/**
 * @param {string} toEmail   Recipient's email address
 * @param {string} toName    Recipient's display name
 * @param {string} resetUrl  Full reset link, e.g. https://app.com/reset-password?token=xxx
 */
const sendPasswordResetEmail = async (toEmail, toName, resetUrl) => {
  const from = `"${process.env.FROM_NAME || "SMedia"}" <${
    process.env.FROM_EMAIL || process.env.SMTP_USER
  }>`;

  const firstName = (toName || "there").split(" ")[0];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your SMedia password</title>
  <style>
    body { margin:0; padding:0; background:#F5F3FF; font-family:'Segoe UI',Arial,sans-serif; }
    .wrapper { max-width:560px; margin:40px auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 8px 40px rgba(109,40,217,.12); }
    .header  { background:linear-gradient(135deg,#6D28D9 0%,#7C3AED 50%,#8B5CF6 100%); padding:36px 40px 28px; text-align:center; }
    .logo    { display:inline-flex; align-items:center; gap:10px; text-decoration:none; }
    .logo-icon { width:40px; height:40px; background:rgba(255,255,255,.2); border-radius:12px; display:inline-flex; align-items:center; justify-content:center; }
    .logo-text { font-size:22px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
    .hero    { padding:36px 40px 20px; }
    .shield  { width:64px; height:64px; background:#F5F3FF; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; }
    h1 { font-size:24px; font-weight:800; color:#111827; margin:0 0 10px; text-align:center; }
    p  { font-size:15px; color:#6B7280; line-height:1.65; margin:0 0 16px; text-align:center; }
    .btn-wrap { text-align:center; margin:24px 0; }
    .btn { display:inline-block; padding:15px 40px; background:linear-gradient(135deg,#7C3AED,#6D28D9); color:#fff !important; text-decoration:none; border-radius:12px; font-size:15px; font-weight:700; letter-spacing:.2px; box-shadow:0 6px 20px rgba(109,40,217,.35); }
    .divider { border:none; border-top:1px solid #EDE9FE; margin:24px 40px; }
    .fallback { padding:0 40px 8px; font-size:13px; color:#9CA3AF; text-align:center; line-height:1.6; }
    .fallback a { color:#7C3AED; word-break:break-all; }
    .warning { margin:0 40px 28px; background:#FFF7ED; border:1px solid #FED7AA; border-radius:12px; padding:14px 18px; }
    .warning p { font-size:13px; color:#92400E; margin:0; text-align:left; }
    .footer { background:#F9F7FF; padding:20px 40px; text-align:center; }
    .footer p { font-size:12px; color:#9CA3AF; margin:0; line-height:1.7; }
  </style>
</head>
<body>
<div class="wrapper">
  <!-- Header -->
  <div class="header">
    <a class="logo" href="${process.env.APP_URL || "#"}">
      <span class="logo-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </span>
      <span class="logo-text">SMedia</span>
    </a>
  </div>

  <!-- Body -->
  <div class="hero">
    <div class="shield">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    </div>
    <h1>Reset your password</h1>
    <p>Hey ${firstName}! We received a request to reset the password for your SMedia account. Click the button below to choose a new password.</p>

    <div class="btn-wrap">
      <a href="${resetUrl}" class="btn">Reset My Password →</a>
    </div>

    <p style="font-size:13px;color:#9CA3AF;">This link expires in <strong style="color:#374151;">1 hour</strong> and can only be used once.</p>
  </div>

  <hr class="divider"/>

  <div class="fallback">
    <p>Button not working? Paste this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
  </div>

  <div class="warning">
    <p>⚠️ <strong>Didn't request this?</strong> Your account is safe — just ignore this email. No changes have been made.</p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>© ${new Date().getFullYear()} SMedia · Your AI Marketing Team<br/>
    You're receiving this because a password reset was requested for your account.</p>
  </div>
</div>
</body>
</html>
`;

  const text = `
Hi ${firstName},

We received a request to reset your SMedia password.

Reset link (expires in 1 hour):
${resetUrl}

If you didn't request this, just ignore this email.

— The SMedia Team
`;

  await getTransporter().sendMail({
    from,
    to: `"${toName}" <${toEmail}>`,
    subject: "Reset your SMedia password",
    text,
    html,
  });
};

module.exports = { sendPasswordResetEmail };