// ── ResetPasswordPage.tsx ─────────────────────────────────────────────────────
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// ── Design tokens (mirrors LoginPage) ─────────────────────────────────────────
const S = {
  leftBg:      "linear-gradient(135deg, #6D28D9 0%, #7C3AED 45%, #8B5CF6 100%)",
  accent:      "#7C3AED",
  accentHover: "#6D28D9",
  inputBg:     "#F9F7FF",
  inputBorder: "#DDD6FE",
  labelColor:  "#4C1D95",
  subText:     "#6B7280",
  linkColor:   "#7C3AED",
  errorColor:  "#EF4444",
};

// ── Style injection ───────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("__smedia_auth_styles")) return;
  const el = document.createElement("style");
  el.id = "__smedia_auth_styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    .sm-auth * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
    @keyframes sm-fade-in { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sm-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
    @keyframes sm-spin { to { transform: rotate(360deg); } }
    @keyframes sm-pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
    @keyframes sm-bounce-in { 0% { transform:scale(.7); opacity:0; } 70% { transform:scale(1.08); } 100% { transform:scale(1); opacity:1; } }
    .sm-fade-in { animation: sm-fade-in .45s ease both; }
    .sm-shake   { animation: sm-shake .4s ease; }
    .sm-bounce-in { animation: sm-bounce-in .4s cubic-bezier(.34,1.56,.64,1) both; }
    .sm-input { transition: border-color .2s, box-shadow .2s, background .2s; }
    .sm-input:focus { outline:none; border-color:#7C3AED !important; background:#fff !important; box-shadow:0 0 0 3px rgba(124,58,237,.12) !important; }
    .sm-input.error { border-color:#EF4444 !important; background:#FFF5F5 !important; }
    .sm-btn-primary { transition: background .2s, box-shadow .2s, transform .15s; }
    .sm-btn-primary:hover:not(:disabled) { background:#6D28D9 !important; box-shadow:0 8px 24px rgba(109,40,217,.4) !important; transform:translateY(-1px); }
    .sm-btn-primary:disabled { opacity:.65; cursor:not-allowed; }
    .sm-link { cursor:pointer; transition:opacity .15s; }
    .sm-link:hover { opacity:.75; text-decoration:underline; }
    .strength-bar { transition: width .3s ease, background .3s ease; }
  `;
  document.head.appendChild(el);
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  logo:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  eyeOpen:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeClosed: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  shield:    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  checkBig:  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  warn:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Password strength helper ───────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "#E5E7EB" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "#EF4444" };
  if (score <= 2) return { score, label: "Fair",   color: "#F59E0B" };
  if (score <= 3) return { score, label: "Good",   color: "#3B82F6" };
  return              { score, label: "Strong", color: "#10B981" };
}

// ── PasswordInput ─────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, hasError }: any) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`sm-input${hasError ? " error" : ""}`}
        style={{ width: "100%", padding: "11px 42px 11px 14px", borderRadius: 10, fontSize: 14, border: `1.5px solid ${hasError ? S.errorColor : S.inputBorder}`, background: hasError ? "#FFF5F5" : S.inputBg, color: "#111", fontFamily: "inherit" }}
      />
      <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: S.subText, display: "flex", padding: 0 }}>
        {show ? Icon.eyeOpen : Icon.eyeClosed}
      </button>
    </div>
  );
}

// ── FieldError ────────────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 12, color: S.errorColor, fontWeight: 500 }}><span>⚠</span>{msg}</div>;
}

// ── Left panel (simplified branding) ─────────────────────────────────────────
function LeftPanel() {
  return (
    <div style={{ width: "50%", minHeight: "100vh", background: S.leftBg, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 56px" }}>
      <div style={{ position: "absolute", top: -100, right: -100, width: 360, height: 360, borderRadius: "50%", background: "rgba(255,255,255,.07)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,.05)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: "rgba(255,255,255,.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.logo}</div>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>SMedia</span>
        </div>
        <div style={{ width: 100, height: 100, background: "rgba(255,255,255,.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", border: "2px solid rgba(255,255,255,.2)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: "0 0 12px", lineHeight: 1.25 }}>Secure Password Reset</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.65, maxWidth: 300, margin: "0 auto" }}>
          Create a strong new password. We recommend using a mix of letters, numbers, and symbols.
        </p>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["🔒", "End-to-end encrypted"],
            ["⚡", "Reset link expires in 1 hour"],
            ["🛡️", "One-time use token"],
          ].map(([ic, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, padding: "12px 18px" }}>
              <span style={{ fontSize: 18 }}>{ic}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.9)", fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── States ────────────────────────────────────────────────────────────────────
type PageState = "verifying" | "invalid" | "form" | "success";

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const navigate                  = useNavigate();
  const [searchParams]            = useSearchParams();
  const token                     = searchParams.get("token") || "";

  const [pageState, setPageState] = useState<PageState>("verifying");
  const [invalidMsg, setInvalidMsg] = useState("Invalid or expired reset link.");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [errors,    setErrors]    = useState<{ password?: string; confirm?: string }>({});
  const [loading,   setLoading]   = useState(false);
  const [shake,     setShake]     = useState(false);

  const strength = getStrength(password);
  const API      = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // ── Step 1: Verify the token on mount ────────────────────────────────────
  useEffect(() => {
    injectStyles();

    if (!token) {
      setInvalidMsg("No reset token found in the URL.");
      setPageState("invalid");
      return;
    }

    (async () => {
      try {
        const res  = await fetch(`${API}/api/auth/verify-reset-token?token=${token}`);
        const data = await res.json();
        if (data.valid) {
          setPageState("form");
        } else {
          setInvalidMsg(data.error || "Invalid or expired reset link.");
          setPageState("invalid");
        }
      } catch {
        setInvalidMsg("Could not reach the server. Please try again.");
        setPageState("invalid");
      }
    })();
  }, [token]);

  // ── Step 2: Submit new password ───────────────────────────────────────────
  const handleSubmit = async () => {
    const errs: typeof errors = {};
    if (!password)          errs.password = "Please enter a new password.";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (!confirm)           errs.confirm  = "Please confirm your new password.";
    else if (password !== confirm) errs.confirm = "Passwords do not match.";

    if (Object.keys(errs).length) {
      setErrors(errs);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setPageState("success");
      } else {
        // Token became invalid between verify and submit
        if (!data.field || data.field === "general") {
          setInvalidMsg(data.error || "Reset failed.");
          setPageState("invalid");
        } else {
          setErrors({ [data.field]: data.error });
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
      }
    } catch {
      setLoading(false);
      setErrors({ password: "Server error. Please try again." });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sm-auth" style={{ display: "flex", minHeight: "100vh" }}>
      <LeftPanel />

      <div style={{ width: "50%", minHeight: "100vh", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 56px", overflowY: "auto" }}>

        {/* ── VERIFYING ── */}
        {pageState === "verifying" && (
          <div className="sm-fade-in" style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, border: "3px solid #EDE9FE", borderTopColor: S.accent, borderRadius: "50%", animation: "sm-spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ fontSize: 15, color: S.subText, fontWeight: 600 }}>Verifying your reset link…</p>
          </div>
        )}

        {/* ── INVALID / EXPIRED ── */}
        {pageState === "invalid" && (
          <div className="sm-fade-in" style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div style={{ width: 80, height: 80, background: "#FFF7ED", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              {Icon.warn}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 10 }}>Link Invalid or Expired</h2>
            <p style={{ fontSize: 14, color: S.subText, lineHeight: 1.65, marginBottom: 28 }}>{invalidMsg}</p>
            <button
              type="button"
              className="sm-btn-primary"
              onClick={() => navigate("/login")}
              style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, background: S.accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px rgba(124,58,237,.3)", marginBottom: 12 }}
            >
              Request a New Link →
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{ width: "100%", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 600, background: "none", color: S.subText, border: "1.5px solid #EDE9FE", cursor: "pointer", fontFamily: "inherit" }}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* ── FORM ── */}
        {pageState === "form" && (
          <div className={`sm-fade-in${shake ? " sm-shake" : ""}`} style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 44, height: 44, background: "#F5F3FF", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.shield}</div>
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: "#111827", margin: 0, letterSpacing: -0.5 }}>Set New Password</h2>
              </div>
            </div>
            <p style={{ fontSize: 14, color: S.subText, marginBottom: 28 }}>Choose a strong password for your SMedia account.</p>

            {/* New Password */}
            <label style={{ fontSize: 12, fontWeight: 700, color: S.labelColor, display: "block", marginBottom: 6 }}>New Password</label>
            <PasswordInput
              value={password}
              placeholder="Min. 8 characters"
              hasError={!!errors.password}
              onChange={(e: any) => { setPassword(e.target.value); setErrors(v => ({ ...v, password: undefined })); }}
            />
            <FieldError msg={errors.password} />

            {/* Strength bar */}
            {password && (
              <div style={{ marginTop: 8, marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= strength.score ? strength.color : "#E5E7EB", transition: "background .3s" }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: strength.color }}>{strength.label}</span>
                {strength.score < 3 && (
                  <span style={{ fontSize: 11, color: S.subText, marginLeft: 8 }}>Add uppercase, numbers & symbols</span>
                )}
              </div>
            )}

            {/* Confirm Password */}
            <label style={{ fontSize: 12, fontWeight: 700, color: S.labelColor, display: "block", margin: "14px 0 6px" }}>Confirm Password</label>
            <PasswordInput
              value={confirm}
              placeholder="Re-enter your password"
              hasError={!!errors.confirm}
              onChange={(e: any) => { setConfirm(e.target.value); setErrors(v => ({ ...v, confirm: undefined })); }}
            />
            <FieldError msg={errors.confirm} />

            {/* Match indicator */}
            {confirm && password && (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: confirm === password ? "#10B981" : S.errorColor, display: "flex", alignItems: "center", gap: 5 }}>
                <span>{confirm === password ? "✓" : "✗"}</span>
                {confirm === password ? "Passwords match" : "Passwords don't match"}
              </div>
            )}

            <button
              type="button"
              className="sm-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, background: S.accent, color: "#fff", border: "none", cursor: "pointer", marginTop: 24, marginBottom: 14, boxShadow: "0 4px 18px rgba(124,58,237,.3)", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {loading
                ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "sm-spin .7s linear infinite" }} /> Resetting…</>
                : "Reset Password →"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: S.subText }}>
              Remember your password?{" "}
              <span className="sm-link" onClick={() => navigate("/login")} style={{ color: S.linkColor, fontWeight: 700 }}>Log in</span>
            </p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {pageState === "success" && (
          <div className="sm-fade-in" style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
            <div className="sm-bounce-in" style={{ width: 88, height: 88, background: "#ECFDF5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              {Icon.checkBig}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#111827", marginBottom: 10 }}>Password Reset!</h2>
            <p style={{ fontSize: 14, color: S.subText, lineHeight: 1.65, marginBottom: 32 }}>
              Your password has been updated successfully. You can now log in with your new password.
            </p>
            <button
              type="button"
              className="sm-btn-primary"
              onClick={() => navigate("/login")}
              style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700, background: S.accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px rgba(124,58,237,.3)" }}
            >
              Go to Login →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}