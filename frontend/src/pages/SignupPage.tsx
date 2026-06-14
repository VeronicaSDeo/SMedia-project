// ── pages/SignupPage.tsx ──────────────────────────────────────────────────────
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { validateSignupForm, getPasswordStrength } from "../utils/errorHandler";
import type { SignupErrors } from "../utils/errorHandler";
import { saveSession, saveUser, clearAuth } from "../utils/auth";

const API = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

const S = {
  leftBg:      "linear-gradient(145deg, #3D3580 0%, #5B4FA8 40%, #7C6FCD 100%)",
  cardBg:      "rgba(255,255,255,0.10)",
  cardBorder:  "rgba(255,255,255,0.18)",
  cardShadow:  "0 4px 24px rgba(0,0,0,.12)",
  accent:      "#6C5FBC",
  accentLight: "#8B7FD4",
  inputBg:     "#F8F7FF",
  inputBorder: "#E0DBF7",
  inputError:  "#DC2626",
  label:       "#2D2460",
  subText:     "#6B7280",
  link:        "#6C5FBC",
  divider:     "#EAE6FA",
  googleBorder:"#E5E7EB",
  errorColor:  "#DC2626",
  pageBg:      "#FDFCFF",
};

const injectStyles = () => {
  if (document.getElementById("__smedia_signup_styles")) return;
  const el = document.createElement("style");
  el.id = "__smedia_signup_styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

    html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; }

    .sm-auth * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

    @keyframes sm-fade-up  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sm-fade-in  { from { opacity:0; } to { opacity:1; } }
    @keyframes sm-spin     { to { transform:rotate(360deg); } }
    @keyframes sm-err-in   { from { opacity:0; transform:translateY(-3px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sm-slide-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sm-pulse-dot{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.3)} }
    @keyframes sm-float-a  { 0%,100%{transform:translateY(0) rotate(-1.5deg)} 50%{transform:translateY(-10px) rotate(-1.5deg)} }
    @keyframes sm-float-b  { 0%,100%{transform:translateY(0) rotate(1deg)}   50%{transform:translateY(-7px) rotate(1deg)}   }
    @keyframes sm-float-c  { 0%,100%{transform:translateY(0) rotate(.5deg)}  50%{transform:translateY(-12px) rotate(.5deg)} }
    @keyframes sm-blob     { 0%,100%{border-radius:60% 40% 55% 45% / 50% 60% 40% 50%;}
                             33%{border-radius:40% 60% 45% 55% / 60% 40% 60% 40%;}
                             66%{border-radius:55% 45% 60% 40% / 40% 55% 45% 60%;} }
    @keyframes sm-strength { from{width:0} }

    .sm-fade-up { animation: sm-fade-up .5s cubic-bezier(.22,1,.36,1) both; }
    .sm-fade-in { animation: sm-fade-in .4s ease both; }
    .sm-err-in  { animation: sm-err-in .2s ease; }
    .sm-blob    { animation: sm-blob 12s ease-in-out infinite; will-change: border-radius; }

    .sm-card-a { animation: sm-float-a 5.5s ease-in-out infinite; }
    .sm-card-b { animation: sm-float-b 7s ease-in-out infinite 1.2s; }
    .sm-card-c { animation: sm-float-c 6s ease-in-out infinite 2.4s; }

    .sm-input {
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .sm-input:focus {
      outline: none;
      border-color: #6C5FBC !important;
      background: #fff !important;
      box-shadow: 0 0 0 3px rgba(108,95,188,.14) !important;
    }
    .sm-input.error { border-color: #DC2626 !important; background: #FFF8F8 !important; }

    .sm-btn-primary {
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    .sm-btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.06);
      box-shadow: 0 8px 24px rgba(108,95,188,.38) !important;
    }
    .sm-btn-primary:active:not(:disabled) { transform: translateY(0px); }
    .sm-btn-primary:disabled { opacity:.55; cursor:not-allowed; }

    .sm-btn-google {
      transition: background .15s ease, box-shadow .15s ease, transform .15s ease;
    }
    .sm-btn-google:hover {
      background: #F5F3FF !important;
      box-shadow: 0 2px 12px rgba(108,95,188,.10) !important;
      transform: translateY(-1px);
    }
    .sm-btn-google:active { transform: translateY(0px); }

    .sm-link { cursor: pointer; transition: opacity .15s; }
    .sm-link:hover { opacity: .72; }

    .sm-stagger > *:nth-child(1) { animation: sm-fade-up .5s .04s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(2) { animation: sm-fade-up .5s .10s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(3) { animation: sm-fade-up .5s .16s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(4) { animation: sm-fade-up .5s .22s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(5) { animation: sm-fade-up .5s .28s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(6) { animation: sm-fade-up .5s .34s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(7) { animation: sm-fade-up .5s .40s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(8) { animation: sm-fade-up .5s .46s cubic-bezier(.22,1,.36,1) both; }
    .sm-stagger > *:nth-child(9) { animation: sm-fade-up .5s .52s cubic-bezier(.22,1,.36,1) both; }

    /* Scrollbar hidden */
    .sm-auth, .sm-auth * { scrollbar-width: none; -ms-overflow-style: none; }
    .sm-auth ::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(el);
};

const Icon = {
  logo:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  cal:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pen:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  zap:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  check:     <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  eyeOpen:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeClosed: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  google:    <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.5 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.4 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.2 5.2C41.3 35.1 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>,
};

// ── Left Panel ────────────────────────────────────────────────────────────────
function LeftPanel() {
  const days  = ["M","T","W","T","F","S","S"];
  const dates = [26,27,28,29,30,31,1];

  const CalCard = () => (
    <div className="sm-card-a" style={{ background:S.cardBg, border:`1px solid ${S.cardBorder}`, borderRadius:16, padding:"14px 16px", backdropFilter:"blur(20px)", boxShadow:S.cardShadow, color:"#fff" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ background:"rgba(255,255,255,.15)", borderRadius:8, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center" }}>{Icon.cal}</div>
        <span style={{ fontWeight:600, fontSize:12 }}>Content Calendar</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"rgba(255,255,255,.5)", fontWeight:500 }}>May 2026</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:8 }}>
        {days.map((d,i) => <div key={i} style={{ textAlign:"center", fontSize:9, color:"rgba(255,255,255,.45)", fontWeight:600 }}>{d}</div>)}
        {dates.map((d,i) => (
          <div key={i} style={{ textAlign:"center", fontSize:10, fontWeight:i===2?700:400, color:i===2?"#5B4FA8":"#fff", background:i===2?"#fff":"transparent", borderRadius:6, padding:"2px 0" }}>{d}</div>
        ))}
      </div>
      {[{color:"#F9A8D4",label:"Instagram Reel",time:"9:00 AM"},{color:"#C4B5FD",label:"LinkedIn Article",time:"2:00 PM"},{color:"#93C5FD",label:"Facebook Ad",time:"5:30 PM"}].map((p,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:i<2?4:0 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:p.color, flexShrink:0 }}/>
          <span style={{ fontSize:10, color:"rgba(255,255,255,.85)", flex:1 }}>{p.label}</span>
          <span style={{ fontSize:9, color:"rgba(255,255,255,.45)" }}>{p.time}</span>
        </div>
      ))}
    </div>
  );

  const CaptionCard = () => (
    <div className="sm-card-b" style={{ background:S.cardBg, border:`1px solid ${S.cardBorder}`, borderRadius:16, padding:"14px 16px", backdropFilter:"blur(20px)", boxShadow:S.cardShadow, color:"#fff" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ background:"rgba(255,255,255,.15)", borderRadius:8, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center" }}>{Icon.pen}</div>
        <span style={{ fontWeight:600, fontSize:12 }}>AI Caption Generator</span>
      </div>
      <div style={{ background:"rgba(0,0,0,.12)", borderRadius:9, padding:"9px 11px", marginBottom:9 }}>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", fontWeight:600, marginBottom:3, letterSpacing:.4 }}>TOPIC: PRODUCT LAUNCH · TONE: EXCITING</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.9)", lineHeight:1.55 }}>🚀 Launching something big today! ✨ #NewBeginnings</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:9, color:"rgba(255,255,255,.45)", fontWeight:600 }}>POST TO</span>
        {["📷","𝕏","💼","▶️","📘"].map((ic,i) => <span key={i} style={{ fontSize:13 }}>{ic}</span>)}
        <button style={{ marginLeft:"auto", background:"rgba(255,255,255,.18)", color:"#fff", border:"none", borderRadius:7, padding:"3px 11px", fontSize:9, fontWeight:600, cursor:"pointer" }}>Generate →</button>
      </div>
    </div>
  );

  const steps = [{done:true,label:"✏️ Topic Input"},{done:true,label:"🤖 AI Writes Caption"},{done:true,label:"📅 Auto-Schedule"},{done:false,label:"🚀 Post to Platforms",badge:"QUEUED"}];
  const AutoCard = () => (
    <div className="sm-card-c" style={{ background:S.cardBg, border:`1px solid ${S.cardBorder}`, borderRadius:16, padding:"14px 16px", backdropFilter:"blur(20px)", boxShadow:S.cardShadow, color:"#fff" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ background:"rgba(255,255,255,.15)", borderRadius:8, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center" }}>{Icon.zap}</div>
        <span style={{ fontWeight:600, fontSize:12 }}>Automation Engine</span>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#6EE7B7", animation:"sm-pulse-dot 1.8s ease-in-out infinite" }}/>
          <span style={{ fontSize:9, fontWeight:600, color:"#6EE7B7" }}>LIVE</span>
        </div>
      </div>
      {steps.map((s,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
          <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0, background:s.done?"rgba(255,255,255,.25)":"rgba(255,255,255,.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {s.done ? Icon.check : <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,.35)" }}/>}
          </div>
          <span style={{ fontSize:10, color:"rgba(255,255,255,.85)", flex:1 }}>{s.label}</span>
          {s.badge && <span style={{ background:"rgba(250,204,21,.15)", color:"#FDE047", fontSize:8, fontWeight:600, padding:"2px 6px", borderRadius:20 }}>{s.badge}</span>}
        </div>
      ))}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:6 }}>
        {[["1.2K","Posts"],["98%","Accuracy"],["4.3×","Faster"]].map(([v,l],i) => (
          <div key={i} style={{ background:"rgba(255,255,255,.1)", borderRadius:9, textAlign:"center", padding:"6px 4px" }}>
            <div style={{ fontSize:14, fontWeight:700 }}>{v}</div>
            <div style={{ fontSize:8, color:"rgba(255,255,255,.5)", fontWeight:500 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      width:"50%", height:"100vh", background:S.leftBg,
      position:"relative", overflow:"hidden",
      padding:"32px 24px 24px",
      display:"flex", flexDirection:"column", flexShrink:0,
    }}>
      <div className="sm-blob" style={{ position:"absolute", top:"-15%", right:"-15%", width:340, height:340, background:"rgba(255,255,255,.06)", pointerEvents:"none" }}/>
      <div className="sm-blob" style={{ position:"absolute", bottom:"-10%", left:"-12%", width:260, height:260, background:"rgba(255,255,255,.04)", pointerEvents:"none", animationDelay:"4s", animationDuration:"14s" }}/>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)", backgroundSize:"32px 32px", pointerEvents:"none" }}/>

      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:24, position:"relative", zIndex:2 }}>
        <div style={{ width:34, height:34, background:"rgba(255,255,255,.18)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>{Icon.logo}</div>
        <span style={{ fontSize:19, fontWeight:700, color:"#fff", letterSpacing:-0.3 }}>SMedia</span>
      </div>

      <div style={{ marginBottom:22, position:"relative", zIndex:2 }}>
        <h1 style={{ fontSize:23, fontWeight:700, color:"#fff", lineHeight:1.25, margin:0, fontFamily:"'DM Serif Display', serif" }}>
          Your AI marketing team —<br/><span style={{ color:"rgba(255,255,255,.65)", fontStyle:"italic" }}>ready in seconds.</span>
        </h1>
        <p style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginTop:8, lineHeight:1.65 }}>Generate captions, schedule posts, and automate your social media workflow.</p>
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10, position:"relative", zIndex:2, overflow:"hidden" }}>
        <CalCard/><CaptionCard/><AutoCard/>
      </div>
    </div>
  );
}

// ── Micro components ──────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="sm-err-in" style={{ display:"flex", alignItems:"center", gap:4, marginTop:5, fontSize:12, color:S.errorColor, fontWeight:500 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </div>
  );
}

function Toast({ message, type }: { message:string; type:"error"|"success" }) {
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:99999,
      background:type==="error"?"#FEF2F2":"#F0FDF4",
      border:`1px solid ${type==="error"?"#FECACA":"#BBF7D0"}`,
      borderRadius:12, padding:"11px 16px",
      display:"flex", alignItems:"center", gap:9,
      boxShadow:"0 8px 32px rgba(0,0,0,.10)",
      animation:"sm-slide-up .3s cubic-bezier(.22,1,.36,1)",
      maxWidth:320 }}>
      <span style={{ fontSize:14 }}>{type==="error"?"⚠️":"✓"}</span>
      <span style={{ fontSize:13, fontWeight:500, color:type==="error"?"#B91C1C":"#166534" }}>{message}</span>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, hasError }: any) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input type={show?"text":"password"} value={value} onChange={onChange} placeholder={placeholder}
        className={`sm-input${hasError?" error":""}`}
        style={{ width:"100%", padding:"10px 40px 10px 13px", borderRadius:9, fontSize:13.5, border:`1.5px solid ${hasError?S.inputError:S.inputBorder}`, background:hasError?"#FFF8F8":S.inputBg, color:"#111", fontFamily:"inherit" }}/>
      <button type="button" onClick={() => setShow(s=>!s)} style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:S.subText, display:"flex", padding:0, opacity:.6 }}>
        {show ? Icon.eyeOpen : Icon.eyeClosed}
      </button>
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  const levels = [
    { label:"Weak",   color:"#EF4444", width:"25%" },
    { label:"Fair",   color:"#F59E0B", width:"50%" },
    { label:"Good",   color:"#6C5FBC", width:"75%" },
    { label:"Strong", color:"#059669", width:"100%" },
  ];
  const lv = levels[Math.min(strength - 1, 3)] || levels[0];
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ height:3, background:"#EAE6FA", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:lv.width, background:lv.color, borderRadius:3, transition:"width .35s ease, background .35s ease", animation:"sm-strength .35s ease" }}/>
      </div>
      <span style={{ fontSize:11, color:lv.color, fontWeight:600, marginTop:3, display:"block" }}>{lv.label} password</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SIGNUP PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function SignupPage() {
  const navigate = useNavigate();
  const [name,            setName]            = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed,          setAgreed]          = useState(false);
  const [errors,          setErrors]          = useState<SignupErrors>({});
  const [loading,         setLoading]         = useState(false);
  const [toast,           setToast]           = useState<{message:string;type:"error"|"success"}|null>(null);
  const toastTimer = useRef<number|null>(null);

  // ── KEY CHANGE: clear any existing session on mount so user always signs up fresh ──
  useEffect(() => {
    injectStyles();
    clearAuth();
  }, []); // eslint-disable-line

  const showToast = (message:string, type:"error"|"success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    const errs = validateSignupForm(name, email, password, confirmPassword, agreed);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/signup`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name, email, password }) });
      const data = await res.json();
      setLoading(false);
      if (res.ok && data.success) {
        saveSession(data.token);
        saveUser(data.user);
        showToast("Account created! Setting up your profile…", "success");
        setTimeout(() => navigate("/onboarding", { replace:true }), 900);
      } else {
        const field = data.field as "email"|"general"|undefined;
        if (field === "email") setErrors(v => ({ ...v, email: data.error }));
        showToast(data.error || "Signup failed. Please try again.", "error");
      }
    } catch {
      setLoading(false);
      showToast("Server error. Please try again.", "error");
    }
  };

  const handleGoogleSignup = () => {
    sessionStorage.setItem("google_auth_source", "signup");
    window.location.href = `${API}/api/auth/google`;
  };

  return (
    <div className="sm-auth" style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      {toast && <Toast message={toast.message} type={toast.type}/>}
      <LeftPanel/>

      {/* ── Right panel ── */}
      <div style={{
        flex:1, height:"100vh", background:S.pageBg,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"0 56px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 75% 20%, rgba(167,139,250,.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(108,95,188,.05) 0%, transparent 50%)", pointerEvents:"none" }}/>

        <div className="sm-stagger" style={{ width:"100%", maxWidth:368, position:"relative", zIndex:1 }}>

          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
            <div style={{ width:36, height:36, background:"linear-gradient(135deg,#6C5FBC,#9B8FE0)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(108,95,188,.3)" }}>{Icon.logo}</div>
            <span style={{ fontSize:17, fontWeight:700, color:"#1E1B4B", letterSpacing:-0.2 }}>SMedia</span>
          </div>

          <h2 style={{ fontSize:26, fontWeight:700, color:"#1E1B4B", marginBottom:4, letterSpacing:-0.5, fontFamily:"'DM Serif Display', serif" }}>Create your account</h2>
          <p style={{ fontSize:13.5, color:S.subText, marginBottom:20, fontWeight:400 }}>
            Already have one?{" "}
            <span className="sm-link" onClick={() => navigate("/login")} style={{ color:S.link, fontWeight:600 }}>Log in</span>
          </p>

          {/* Google */}
          <button type="button" className="sm-btn-google" onClick={handleGoogleSignup}
            style={{ width:"100%", padding:"11px", borderRadius:9, fontSize:13.5, fontWeight:500, background:"#fff", color:"#111827", border:`1.5px solid ${S.googleBorder}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:9, fontFamily:"inherit", marginBottom:16, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
            {Icon.google} Continue with Google
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:S.divider }}/>
            <span style={{ fontSize:11.5, color:"#C4B5FD", fontWeight:500 }}>or sign up with email</span>
            <div style={{ flex:1, height:1, background:S.divider }}/>
          </div>

          {/* Full Name */}
          <label style={{ fontSize:11.5, fontWeight:600, color:S.label, display:"block", marginBottom:5 }}>Full Name</label>
          <input type="text" placeholder="Jane Doe" value={name} onChange={e=>{setName(e.target.value);setErrors(v=>({...v,name:undefined}));}}
            className={`sm-input${errors.name?" error":""}`}
            style={{ width:"100%", padding:"10px 13px", borderRadius:9, fontSize:13.5, border:`1.5px solid ${errors.name?S.inputError:S.inputBorder}`, background:errors.name?"#FFF8F8":S.inputBg, color:"#111", fontFamily:"inherit" }}/>
          <FieldError msg={errors.name}/>

          {/* Email */}
          <label style={{ fontSize:11.5, fontWeight:600, color:S.label, display:"block", marginBottom:5, marginTop:12 }}>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErrors(v=>({...v,email:undefined}));}}
            className={`sm-input${errors.email?" error":""}`}
            style={{ width:"100%", padding:"10px 13px", borderRadius:9, fontSize:13.5, border:`1.5px solid ${errors.email?S.inputError:S.inputBorder}`, background:errors.email?"#FFF8F8":S.inputBg, color:"#111", fontFamily:"inherit" }}/>
          <FieldError msg={errors.email}/>

          {/* Password */}
          <label style={{ fontSize:11.5, fontWeight:600, color:S.label, display:"block", marginBottom:5, marginTop:12 }}>Password</label>
          <PasswordInput placeholder="Min 8 chars, 1 uppercase, 1 number" value={password} hasError={!!errors.password} onChange={(e:any)=>{setPassword(e.target.value);setErrors(v=>({...v,password:undefined}));}}/>
          <PasswordStrengthBar password={password}/>
          <FieldError msg={errors.password}/>

          {/* Confirm Password */}
          <label style={{ fontSize:11.5, fontWeight:600, color:S.label, display:"block", marginBottom:5, marginTop:12 }}>Confirm Password</label>
          <PasswordInput placeholder="Re-enter your password" value={confirmPassword} hasError={!!errors.confirmPassword} onChange={(e:any)=>{setConfirmPassword(e.target.value);setErrors(v=>({...v,confirmPassword:undefined}));}}/>
          <FieldError msg={errors.confirmPassword}/>

          {/* Terms */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:9, marginTop:14, marginBottom:2 }}>
            <div onClick={() => setAgreed(a=>!a)}
              style={{ width:17, height:17, borderRadius:5, border:`2px solid ${agreed?"#6C5FBC":"#E0DBF7"}`, background:agreed?"#6C5FBC":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, marginTop:2, transition:"all .18s ease" }}>
              {agreed && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <p style={{ fontSize:12, color:S.subText, lineHeight:1.55, margin:0 }}>
              I agree to SMedia's <span className="sm-link" style={{ color:S.link }}>Terms of Service</span> and <span className="sm-link" style={{ color:S.link }}>Privacy Policy</span>
            </p>
          </div>
          {errors.agreed && <FieldError msg={errors.agreed}/>}

          <button type="button" className="sm-btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ width:"100%", padding:"12px", borderRadius:9, fontSize:14, fontWeight:600, background:`linear-gradient(135deg,${S.accent},${S.accentLight})`, color:"#fff", border:"none", cursor:"pointer", marginTop:16, marginBottom:8, boxShadow:"0 4px 16px rgba(108,95,188,.32)", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading ? <><span style={{ width:15, height:15, border:"2px solid rgba(255,255,255,.35)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"sm-spin .7s linear infinite" }}/> Creating account…</> : "Create Account →"}
          </button>

          <p style={{ fontSize:11.5, color:"#9CA3AF", textAlign:"center", lineHeight:1.6 }}>
            By signing up you agree to our <span className="sm-link" style={{ color:S.link }}>Terms</span> and <span className="sm-link" style={{ color:S.link }}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}