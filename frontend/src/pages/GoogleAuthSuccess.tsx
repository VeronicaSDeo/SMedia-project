// ── pages/GoogleAuthSuccess.tsx ───────────────────────────────────────────────
// Lives at /auth/google/success
//
// FLOW:
//  • Returning user (isNewUser=false) → spinner → dashboard (always, regardless of source)
//  • New user      (isNewUser=true)  → name collection → onboarding

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveSession, saveUser, isOnboarded } from "../utils/auth";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const API = (() => {
  try { return (import.meta as any).env?.VITE_API_URL || "http://localhost:5000"; }
  catch { return "http://localhost:5000"; }
})();

// ── Styles injected once ──────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("__gas_styles")) return;
  const el = document.createElement("style");
  el.id = "__gas_styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

    html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; }
    .__gas * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

    @keyframes gas-spin     { to { transform: rotate(360deg); } }
    @keyframes gas-fade-up  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes gas-fade-in  { from { opacity:0; } to { opacity:1; } }
    @keyframes gas-pop      { from { opacity:0; transform: scale(.94) translateY(14px); } to { opacity:1; transform: scale(1) translateY(0); } }
    @keyframes gas-blob     {
      0%,100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
      33%      { border-radius: 40% 60% 45% 55% / 60% 40% 60% 40%; }
      66%      { border-radius: 55% 45% 60% 40% / 40% 55% 45% 60%; }
    }
    @keyframes gas-dot-b    {
      0%,80%,100% { transform: translateY(0); opacity:.4; }
      40%         { transform: translateY(-7px); opacity:1; }
    }
    @keyframes gas-err-pop  { from { opacity:0; transform: scale(.9) translateY(16px); } to { opacity:1; transform: scale(1) translateY(0); } }
    @keyframes gas-err-in   { from { opacity:0; transform: translateY(-3px); } to { opacity:1; transform:translateY(0); } }

    .__gas .gas-blob {
      animation: gas-blob 12s ease-in-out infinite;
      will-change: border-radius;
    }
    .__gas .gas-input {
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .__gas .gas-input:focus {
      outline: none;
      border-color: #6C5FBC !important;
      background: #fff !important;
      box-shadow: 0 0 0 3px rgba(108,95,188,.14) !important;
    }
    .__gas .gas-input.error {
      border-color: #DC2626 !important;
      background: #FFF8F8 !important;
    }
    .__gas .gas-btn {
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    .__gas .gas-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.06);
      box-shadow: 0 8px 24px rgba(108,95,188,.38) !important;
    }
    .__gas .gas-btn:active:not(:disabled) { transform: translateY(0px); }
    .__gas .gas-btn:disabled { opacity:.55; cursor:not-allowed; }

    .__gas .gas-stagger > *:nth-child(1) { animation: gas-fade-up .5s .04s cubic-bezier(.22,1,.36,1) both; }
    .__gas .gas-stagger > *:nth-child(2) { animation: gas-fade-up .5s .10s cubic-bezier(.22,1,.36,1) both; }
    .__gas .gas-stagger > *:nth-child(3) { animation: gas-fade-up .5s .16s cubic-bezier(.22,1,.36,1) both; }
    .__gas .gas-stagger > *:nth-child(4) { animation: gas-fade-up .5s .22s cubic-bezier(.22,1,.36,1) both; }
    .__gas .gas-stagger > *:nth-child(5) { animation: gas-fade-up .5s .28s cubic-bezier(.22,1,.36,1) both; }

    .__gas, .__gas * { scrollbar-width: none; -ms-overflow-style: none; }
    .__gas ::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(el);
};

// ── Shared page shell ─────────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="__gas" style={{
      height:"100vh", overflow:"hidden",
      display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(145deg, #F5F3FF 0%, #EDE9FE 60%, #E0DBF7 100%)",
      position:"relative",
    }}>
      <div className="gas-blob" style={{ position:"fixed", top:"-12%", right:"-10%", width:360, height:360, background:"rgba(108,95,188,.09)", pointerEvents:"none" }}/>
      <div className="gas-blob" style={{ position:"fixed", bottom:"-10%", left:"-8%", width:280, height:280, background:"rgba(167,139,250,.07)", pointerEvents:"none", animationDelay:"5s", animationDuration:"15s" }}/>
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(108,95,188,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(108,95,188,.04) 1px, transparent 1px)", backgroundSize:"36px 36px", pointerEvents:"none" }}/>
      <div style={{ position:"relative", zIndex:1 }}>{children}</div>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <PageShell>
      <div style={{
        background:"#fff", borderRadius:20, padding:"44px 52px",
        textAlign:"center",
        boxShadow:"0 24px 80px rgba(108,95,188,.16), 0 0 0 1px rgba(108,95,188,.06)",
        animation:"gas-pop .45s cubic-bezier(.22,1,.36,1) both",
        minWidth:300,
      }}>
        <div style={{ position:"relative", width:60, height:60, margin:"0 auto 22px" }}>
          <div style={{ width:60, height:60, border:"2.5px solid #EAE6FA", borderTopColor:"#6C5FBC", borderRadius:"50%", animation:"gas-spin .85s linear infinite" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="26" height="26" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.5 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.4 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.2 5.2C41.3 35.1 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
          </div>
        </div>
        <p style={{ fontSize:16, color:"#1E1B4B", fontWeight:700, margin:"0 0 5px", animation:"gas-fade-up .4s .15s cubic-bezier(.22,1,.36,1) both" }}>
          Signing you in with Google
        </p>
        <p style={{ fontSize:13, color:"#6B7280", margin:"0 0 20px", fontWeight:400, animation:"gas-fade-up .4s .25s cubic-bezier(.22,1,.36,1) both" }}>
          Verifying your account…
        </p>
        <div style={{ display:"flex", justifyContent:"center", gap:6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#9B8FE0", animation:"gas-dot-b 1.2s ease-in-out infinite", animationDelay:`${i * 0.18}s` }}/>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ErrorScreen({ message, navigate }: { message:string; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <PageShell>
      <div style={{
        background:"#fff", borderRadius:20, padding:"44px 48px",
        textAlign:"center",
        boxShadow:"0 24px 80px rgba(108,95,188,.16), 0 0 0 1px rgba(108,95,188,.06)",
        maxWidth:380, width:"90%",
        animation:"gas-err-pop .4s cubic-bezier(.22,1,.36,1) both",
      }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#FEE2E2,#FECACA)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", fontSize:30 }}>⚠</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:"#1E1B4B", marginBottom:8, fontFamily:"'DM Serif Display', serif" }}>Sign-In Failed</h2>
        <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.65, marginBottom:26, fontWeight:400 }}>{message}</p>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={() => navigate("/login")}
            style={{ padding:"10px 20px", background:"#F5F3FF", color:"#6C5FBC", border:"1.5px solid #E0DBF7", borderRadius:9, fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}
            onMouseOver={e=>(e.currentTarget.style.background="#EDE9FE")}
            onMouseOut={e=>(e.currentTarget.style.background="#F5F3FF")}>
            ← Login
          </button>
          <button onClick={() => navigate("/signup")}
            style={{ padding:"10px 20px", background:"linear-gradient(135deg,#6C5FBC,#9B8FE0)", color:"#fff", border:"none", borderRadius:9, fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(108,95,188,.3)", transition:"all .15s" }}
            onMouseOver={e=>{ (e.currentTarget.style.transform="translateY(-1px)"); (e.currentTarget.style.filter="brightness(1.06)"); }}
            onMouseOut={e=>{ (e.currentTarget.style.transform="translateY(0)"); (e.currentTarget.style.filter="none"); }}>
            Sign Up →
          </button>
        </div>
      </div>
    </PageShell>
  );
}

// ── Name collection screen (new users only) ───────────────────────────────────
interface NameScreenProps {
  onSubmit: (name: string) => void;
  loading: boolean;
}

function NameCollectionScreen({ onSubmit, loading }: NameScreenProps) {
  const [name, setName]   = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter your name."); return; }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters."); return; }
    if (trimmed.length > 60) { setError("Name is too long."); return; }
    setError("");
    onSubmit(trimmed);
  };

  return (
    <PageShell>
      <div style={{
        background:"#fff", borderRadius:20,
        boxShadow:"0 24px 80px rgba(108,95,188,.16), 0 0 0 1px rgba(108,95,188,.06)",
        width:"90vw", maxWidth:420,
        overflow:"hidden",
        animation:"gas-pop .45s cubic-bezier(.22,1,.36,1) both",
      }}>
        <div style={{ height:3, background:"linear-gradient(90deg, #6C5FBC, #9B8FE0, #C4B5FD)", borderRadius:"20px 20px 0 0" }}/>
        <div className="gas-stagger" style={{ padding:"36px 36px 32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28 }}>
            <div style={{ width:34, height:34, background:"linear-gradient(135deg,#6C5FBC,#9B8FE0)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(108,95,188,.28)" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span style={{ fontSize:16, fontWeight:700, color:"#1E1B4B", letterSpacing:-0.2 }}>SMedia</span>
          </div>

          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:20, padding:"5px 12px", marginBottom:20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontSize:11.5, fontWeight:600, color:"#166534" }}>Google account verified</span>
          </div>

          <h2 style={{ fontSize:22, fontWeight:700, color:"#1E1B4B", marginBottom:6, letterSpacing:-0.4, fontFamily:"'DM Serif Display', serif" }}>
            One last thing — your name
          </h2>
          <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.6, marginBottom:22, fontWeight:400 }}>
            What should we call you? This is how you'll appear on SMedia — type it in yourself.
          </p>

          <label style={{ fontSize:11.5, fontWeight:600, color:"#2D2460", display:"block", marginBottom:5 }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. Aisha Sharma"
            autoFocus
            className={`gas-input${error ? " error" : ""}`}
            style={{
              width:"100%", padding:"11px 13px", borderRadius:9, fontSize:13.5,
              border:`1.5px solid ${error ? "#DC2626" : "#E0DBF7"}`,
              background: error ? "#FFF8F8" : "#F8F7FF",
              color:"#111", fontFamily:"inherit",
            }}
          />
          {error && (
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:5, fontSize:12, color:"#DC2626", fontWeight:500, animation:"gas-err-in .2s ease" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div style={{ marginTop:8, padding:"10px 12px", borderRadius:9, background:"#F8F7FF", border:"1px solid #E0DBF7" }}>
            <p style={{ fontSize:11.5, color:"#6B7280", margin:0, lineHeight:1.55 }}>
              💡 We don't use your Google display name so you have full control over how you appear on the platform.
            </p>
          </div>

          <button
            type="button"
            className="gas-btn"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            style={{
              width:"100%", padding:"12px", borderRadius:9, fontSize:14, fontWeight:600,
              background:"linear-gradient(135deg,#6C5FBC,#9B8FE0)",
              color:"#fff", border:"none", cursor:"pointer", marginTop:18,
              boxShadow:"0 4px 16px rgba(108,95,188,.32)", fontFamily:"inherit",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}
          >
            {loading
              ? <><span style={{ width:15, height:15, border:"2px solid rgba(255,255,255,.35)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"gas-spin .7s linear infinite" }}/> Setting up…</>
              : "Continue to Setup →"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
type Stage = "loading" | "name_collection" | "error";

export default function GoogleAuthSuccess() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [stage,       setStage]       = useState<Stage>("loading");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [pendingData, setPendingData] = useState<{
    token: string;
    user: any;
    isNew: boolean;
  } | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  const ran = useRef(false);

  useEffect(() => {
    injectStyles();
    if (ran.current) return;
    ran.current = true;
    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCallback() {
    // Always clean up the source key — we no longer use it for routing decisions
    sessionStorage.removeItem("google_auth_source");

    const token    = searchParams.get("token");
    const userJson = searchParams.get("user");
    const isNew    = searchParams.get("isNewUser");

    if (token && userJson) {
      await handleBackendToken(token, userJson, isNew);
      return;
    }

    // Fallback: implicit flow (no backend redirect params)
    const hashParams  = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");

    if (accessToken) {
      await handleImplicitToken(accessToken);
      return;
    }

    setErrorMsg("No sign-in data received. Please try again.");
    setStage("error");
  }

  async function handleBackendToken(
    token: string,
    userJson: string,
    isNew: string | null,
  ) {
    try {
      await sleep(1200);
      const rawUser = JSON.parse(decodeURIComponent(userJson));

      // ── KEY FIX ────────────────────────────────────────────────────────────
      // isNewUser from the backend is the ONLY source of truth.
      // sessionStorage "google_auth_source" is no longer consulted here —
      // it was defaulting to "signup" for ALL flows from the signup page,
      // causing returning users to see the name collection screen.
      const isNewUser = isNew === "true";

      if (!isNewUser) {
        // RETURNING USER → dashboard immediately, no name collection
        saveSession(token);
        saveUser(rawUser);
        navigate("/dashboard", { replace: true });
      } else {
        // BRAND-NEW USER → name collection → onboarding
        setPendingData({
          token,
          user: { ...rawUser, name: "" }, // blank name; user fills it themselves
          isNew: true,
        });
        setStage("name_collection");
      }
    } catch {
      setErrorMsg("Failed to process Google sign-in. Please try again.");
      setStage("error");
    }
  }

  async function handleImplicitToken(accessToken: string) {
    try {
      const [profile] = await Promise.all([
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(r => { if (!r.ok) throw new Error("userinfo failed"); return r.json(); }),
        sleep(1200),
      ]);

      const userId = `google_${profile.sub}`;
      const baseUser = {
        id:        userId,
        email:     profile.email,
        avatar:    profile.picture,
        plan:      "Free",
        tone:      "exciting",
        goal:      "grow_audience",
        industry:  "Tech & SaaS",
        brandName: "",
      };

      // For implicit flow: treat as returning if a stored user record exists
      const storedUser = (() => {
        try { return JSON.parse(localStorage.getItem("smedia_user") || "null"); }
        catch { return null; }
      })();
      const isNewUser = !storedUser || storedUser.id !== userId;

      if (!isNewUser) {
        saveSession(accessToken);
        saveUser({ ...baseUser, name: storedUser?.name || profile.name || "" });
        navigate("/dashboard", { replace: true });
      } else {
        setPendingData({
          token: accessToken,
          user: { ...baseUser, name: "" },
          isNew: true,
        });
        setStage("name_collection");
      }
    } catch {
      setErrorMsg("Could not verify your Google account. Please try again.");
      setStage("error");
    }
  }

  // Called after user submits their name on the name collection screen
  async function handleNameSubmit(name: string) {
    if (!pendingData) return;
    setNameLoading(true);

    const finalUser = { ...pendingData.user, name };

    try {
      await fetch(`${API}/api/user/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pendingData.token}`,
        },
        body: JSON.stringify({ name }),
      });
    } catch {
      // Continue even if server update fails — save locally and move on
    }

    saveSession(pendingData.token);
    saveUser(finalUser);

    // All new Google users go to onboarding (isOnboarded check is a safety net)
    const needsOnboarding = !isOnboarded(finalUser.id);
    navigate(needsOnboarding ? "/onboarding" : "/dashboard", { replace: true });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (stage === "error") {
    return <ErrorScreen message={errorMsg} navigate={navigate}/>;
  }

  if (stage === "name_collection") {
    return <NameCollectionScreen onSubmit={handleNameSubmit} loading={nameLoading}/>;
  }

  return <LoadingScreen/>;
}