// ── OnboardingPage.tsx ────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, saveUser, markOnboarded } from "../utils/auth";
import { apiFetch } from "../utils/constants";

const injectStyles = () => {
  if (document.getElementById("__smedia_onboard_styles")) return;
  const el = document.createElement("style");
  el.id = "__smedia_onboard_styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

    html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; }

    .ob-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

    @keyframes ob-fade-up  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes ob-fade-in  { from { opacity:0; } to { opacity:1; } }
    @keyframes ob-scale-in { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
    @keyframes ob-spin     { to { transform:rotate(360deg); } }
    @keyframes ob-blob     {
      0%,100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
      33%      { border-radius: 40% 60% 45% 55% / 60% 40% 60% 40%; }
      66%      { border-radius: 55% 45% 60% 40% / 40% 55% 45% 60%; }
    }

    .ob-blob { animation: ob-blob 12s ease-in-out infinite; will-change: border-radius; }

    .ob-chip {
      transition: all .16s ease;
      cursor: pointer;
      user-select: none;
    }
    .ob-chip:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(108,95,188,.16);
    }
    .ob-chip.selected {
      background: linear-gradient(135deg, #6C5FBC, #8B7FD4) !important;
      color: #fff !important;
      border-color: transparent !important;
      box-shadow: 0 4px 16px rgba(108,95,188,.32);
    }

    .ob-tone-chip {
      transition: all .16s ease;
      cursor: pointer;
    }
    .ob-tone-chip:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(108,95,188,.14); }
    .ob-tone-chip.selected {
      background: linear-gradient(135deg, #6C5FBC, #8B7FD4) !important;
      border-color: transparent !important;
      box-shadow: 0 4px 16px rgba(108,95,188,.3);
    }

    .ob-btn-next {
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    .ob-btn-next:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.06);
      box-shadow: 0 8px 22px rgba(108,95,188,.4) !important;
    }
    .ob-btn-next:active:not(:disabled) { transform: translateY(0); }
    .ob-btn-next:disabled { opacity: .5; cursor: not-allowed; }

    .ob-btn-back {
      transition: background .15s ease, border-color .15s ease;
    }
    .ob-btn-back:hover { background: #EDE9FE !important; border-color: #C4B5FD !important; }

    .ob-input {
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .ob-input:focus {
      outline: none;
      border-color: #6C5FBC !important;
      background: #fff !important;
      box-shadow: 0 0 0 3px rgba(108,95,188,.13) !important;
    }

    .ob-step { animation: ob-fade-up .4s cubic-bezier(.22,1,.36,1) both; }

    /* scrollbar hidden */
    .ob-root, .ob-root * { scrollbar-width: none; -ms-overflow-style: none; }
    .ob-root ::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(el);
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES = [
  { value:"solo_creator",  label:"Solo Creator",  emoji:"🎨" },
  { value:"marketer",      label:"Marketer",       emoji:"📈" },
  { value:"agency",        label:"Agency / Team",  emoji:"🏢" },
  { value:"entrepreneur",  label:"Entrepreneur",   emoji:"🚀" },
  { value:"influencer",    label:"Influencer",     emoji:"⭐" },
  { value:"student",       label:"Student",        emoji:"🎓" },
];

const INDUSTRIES = [
  "E-Commerce","Fashion & Beauty","Food & Beverage","Tech & SaaS",
  "Health & Wellness","Finance","Travel","Education",
  "Real Estate","Entertainment","Sports","Other",
];

// Only Instagram + LinkedIn
const PLATFORMS_LIST = [
  { key:"instagram", label:"Instagram", emoji:"📷" },
  { key:"linkedin",  label:"LinkedIn",  emoji:"💼" },
];

const TONES = [
  { value:"exciting",      label:"Exciting",      desc:"High energy, hype, exclamation marks",  emoji:"🔥" },
  { value:"professional",  label:"Professional",  desc:"Formal, authoritative, polished",        emoji:"💼" },
  { value:"casual",        label:"Casual",        desc:"Friendly, conversational, relaxed",      emoji:"😊" },
  { value:"funny",         label:"Funny",         desc:"Humor, wit, memes & pop culture",        emoji:"😂" },
  { value:"inspirational", label:"Inspirational", desc:"Motivational, uplifting, story-driven",  emoji:"✨" },
  { value:"educational",   label:"Educational",   desc:"Informative, how-to, step-by-step",      emoji:"📚" },
];

const GOALS = [
  { value:"grow_audience",    label:"Grow Audience",    emoji:"📈" },
  { value:"drive_traffic",    label:"Drive Traffic",    emoji:"🔗" },
  { value:"sell_products",    label:"Sell Products",    emoji:"🛒" },
  { value:"build_brand",      label:"Build Brand",      emoji:"🎯" },
  { value:"engage_community", label:"Engage Community", emoji:"💬" },
  { value:"generate_leads",   label:"Generate Leads",   emoji:"🎣" },
];

// ── Shared components ─────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step:number; total:number }) {
  return (
    <div style={{ width:"100%", height:3, background:"#EAE6FA", borderRadius:3, marginBottom:28 }}>
      <div style={{ height:"100%", width:`${(step/total)*100}%`, background:"linear-gradient(90deg,#6C5FBC,#9B8FE0)", borderRadius:3, transition:"width .4s cubic-bezier(.22,1,.36,1)" }}/>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected:boolean; onClick:()=>void; children:React.ReactNode }) {
  return (
    <div className={`ob-chip${selected ? " selected" : ""}`} onClick={onClick}
      style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${selected ? "transparent" : "#E0DBF7"}`, background: selected ? "" : "#fff", color: selected ? "#fff" : "#374151", fontSize:13.5, fontWeight:500, display:"flex", alignItems:"center", gap:8 }}>
      {children}
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────
function StepRole({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <div className="ob-step">
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:36, marginBottom:10 }}>👋</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:"#1E1B4B", marginBottom:6, fontFamily:"'DM Serif Display', serif" }}>What's your role?</h2>
        <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.6, margin:0 }}>This helps us personalise your AI content experience.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {ROLES.map(r => (
          <Chip key={r.value} selected={value===r.value} onClick={() => onChange(r.value)}>
            <span style={{ fontSize:18 }}>{r.emoji}</span><span>{r.label}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

function StepBrand({ brandName, setBrandName, industry, setIndustry }: any) {
  return (
    <div className="ob-step">
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:36, marginBottom:10 }}>🏷️</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:"#1E1B4B", marginBottom:6, fontFamily:"'DM Serif Display', serif" }}>Tell us about your brand</h2>
        <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.6, margin:0 }}>We'll use this to give your content the right voice.</p>
      </div>
      <label style={{ fontSize:11.5, fontWeight:600, color:"#2D2460", display:"block", marginBottom:5 }}>
        Brand / Business Name <span style={{ color:"#9CA3AF", fontWeight:400 }}>(optional)</span>
      </label>
      <input value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="e.g. Cosmic Coffee Co."
        className="ob-input"
        style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:"1.5px solid #E0DBF7", background:"#F8F7FF", fontSize:13.5, fontFamily:"inherit", color:"#111", marginBottom:18 }}/>
      <label style={{ fontSize:11.5, fontWeight:600, color:"#2D2460", display:"block", marginBottom:9 }}>Industry</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
        {INDUSTRIES.map(ind => (
          <Chip key={ind} selected={industry===ind} onClick={() => setIndustry(ind)}>{ind}</Chip>
        ))}
      </div>
    </div>
  );
}

function StepPlatforms({ platforms, setPlatforms, tone, setTone }: any) {
  const toggle = (key: string) =>
    setPlatforms((prev: string[]) => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);

  return (
    <div className="ob-step">
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:36, marginBottom:10 }}>📱</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:"#1E1B4B", marginBottom:6, fontFamily:"'DM Serif Display', serif" }}>Where do you post?</h2>
        <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.6, margin:0 }}>Select your active platforms & preferred content tone.</p>
      </div>

      <label style={{ fontSize:11.5, fontWeight:600, color:"#2D2460", display:"block", marginBottom:8 }}>
        Platforms <span style={{ color:"#9CA3AF", fontWeight:400 }}>(pick all that apply)</span>
      </label>
      {/* Only 2 platforms — side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:22 }}>
        {PLATFORMS_LIST.map(p => (
          <Chip key={p.key} selected={platforms.includes(p.key)} onClick={() => toggle(p.key)}>
            <span style={{ fontSize:18 }}>{p.emoji}</span><span>{p.label}</span>
          </Chip>
        ))}
      </div>

      <label style={{ fontSize:11.5, fontWeight:600, color:"#2D2460", display:"block", marginBottom:8 }}>Default Content Tone</label>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {TONES.map(t => (
          <div key={t.value}
            className={`ob-tone-chip${tone===t.value ? " selected" : ""}`}
            onClick={() => setTone(t.value)}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, border:`1.5px solid ${tone===t.value ? "transparent" : "#E0DBF7"}`, background: tone===t.value ? "" : "#fff" }}>
            <span style={{ fontSize:20 }}>{t.emoji}</span>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600, color: tone===t.value ? "#fff" : "#1E1B4B" }}>{t.label}</div>
              <div style={{ fontSize:12, color: tone===t.value ? "rgba(255,255,255,.7)" : "#9CA3AF" }}>{t.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepGoal({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <div className="ob-step">
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:36, marginBottom:10 }}>🎯</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:"#1E1B4B", marginBottom:6, fontFamily:"'DM Serif Display', serif" }}>What's your main goal?</h2>
        <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.6, margin:0 }}>We'll focus your AI content to hit this target.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {GOALS.map(g => (
          <Chip key={g.value} selected={value===g.value} onClick={() => onChange(g.value)}>
            <span style={{ fontSize:18 }}>{g.emoji}</span><span>{g.label}</span>
          </Chip>
        ))}
      </div>
      {value && (
        <div style={{ marginTop:20, padding:"13px 15px", borderRadius:10, background:"linear-gradient(135deg,#F5F3FF,#EDE9FE)", border:"1px solid #DDD6FE", animation:"ob-scale-in .3s ease" }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:"#4C1D95", marginBottom:3 }}>✅ YOU'RE ALL SET</div>
          <div style={{ fontSize:12.5, color:"#5B21B6", lineHeight:1.55 }}>
            AI content will focus on <strong>{GOALS.find(g=>g.value===value)?.label}</strong>.
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ONBOARDING PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function OnboardingPage() {
  const navigate  = useNavigate();
  const user      = getUser();
  const firstName = user?.name?.split(" ")[0] || "there";

  const [step,      setStep]      = useState(1);
  const [role,      setRole]      = useState("");
  const [brandName, setBrandName] = useState("");
  const [industry,  setIndustry]  = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [tone,      setTone]      = useState("");
  const [goal,      setGoal]      = useState("");
  const [saving,    setSaving]    = useState(false);

  const TOTAL = 4;

  useEffect(() => { injectStyles(); }, []);

  const canNext = () => {
    if (step === 1) return !!role;
    if (step === 2) return !!industry;
    if (step === 3) return platforms.length > 0 && !!tone;
    if (step === 4) return !!goal;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const patch = { role, brandName, industry, platforms, tone, goal };
    try {
      const updated = await apiFetch("/api/user/me", { method:"PATCH", body:JSON.stringify(patch) });
      saveUser({ ...user, ...updated });
    } catch {
      saveUser({ ...user, ...patch });
    }
    markOnboarded(user.id);
    navigate("/dashboard", { replace:true });
    setSaving(false);
  };

  return (
    <div className="ob-root" style={{
      height:"100vh", overflow:"hidden",
      background:"linear-gradient(145deg, #F5F3FF 0%, #EDE9FE 60%, #E0DBF7 100%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      position:"relative",
    }}>
      {/* Blobs */}
      <div className="ob-blob" style={{ position:"fixed", top:"-12%", right:"-10%", width:360, height:360, background:"rgba(108,95,188,.08)", pointerEvents:"none" }}/>
      <div className="ob-blob" style={{ position:"fixed", bottom:"-10%", left:"-8%", width:280, height:280, background:"rgba(167,139,250,.07)", pointerEvents:"none", animationDelay:"5s", animationDuration:"15s" }}/>
      {/* Grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(108,95,188,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(108,95,188,.04) 1px, transparent 1px)", backgroundSize:"36px 36px", pointerEvents:"none" }}/>

      {/* Card — fixed height with internal scroll */}
      <div style={{
        width:"90vw", maxWidth:520,
        maxHeight:"90vh",
        background:"#fff", borderRadius:20,
        boxShadow:"0 24px 80px rgba(108,95,188,.16), 0 0 0 1px rgba(108,95,188,.06)",
        display:"flex", flexDirection:"column",
        position:"relative", zIndex:1,
        animation:"ob-fade-up .45s cubic-bezier(.22,1,.36,1) both",
        overflow:"hidden",
      }}>
        {/* Top accent line */}
        <div style={{ height:3, background:"linear-gradient(90deg, #6C5FBC, #9B8FE0, #C4B5FD)", flexShrink:0 }}/>

        {/* Scrollable content area */}
        <div style={{ flex:1, overflowY:"auto", padding:"28px 32px 0" }}>

          {/* Header row */}
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:20 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#6C5FBC,#9B8FE0)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span style={{ fontWeight:700, fontSize:16, color:"#1E1B4B" }}>SMedia</span>
            <div style={{ marginLeft:"auto", fontSize:12, fontWeight:500, color:"#9CA3AF" }}>Step {step} of {TOTAL}</div>
          </div>

          <ProgressBar step={step} total={TOTAL}/>

          {/* Welcome banner — step 1 only */}
          {step === 1 && (
            <div style={{ background:"linear-gradient(135deg,#F5F3FF,#EDE9FE)", borderRadius:10, padding:"11px 14px", marginBottom:20, display:"flex", alignItems:"center", gap:10, border:"1px solid #DDD6FE" }}>
              <span style={{ fontSize:20 }}>🎉</span>
              <div>
                <div style={{ fontSize:12.5, fontWeight:700, color:"#4C1D95" }}>Welcome, {firstName}!</div>
                <div style={{ fontSize:12, color:"#5B21B6" }}>Let's set up your workspace in 60 seconds.</div>
              </div>
            </div>
          )}

          {/* Step content */}
          <div key={step}>
            {step === 1 && <StepRole value={role} onChange={setRole}/>}
            {step === 2 && <StepBrand brandName={brandName} setBrandName={setBrandName} industry={industry} setIndustry={setIndustry}/>}
            {step === 3 && <StepPlatforms platforms={platforms} setPlatforms={setPlatforms} tone={tone} setTone={setTone}/>}
            {step === 4 && <StepGoal value={goal} onChange={setGoal}/>}
          </div>
        </div>

        {/* Footer — always visible, never scrolls away */}
        <div style={{
          flexShrink:0, padding:"16px 32px 24px",
          borderTop:"1px solid #F0EDF9",
          background:"#fff",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <button type="button" className="ob-btn-back"
            onClick={() => step > 1 ? setStep(s => s-1) : navigate("/signup")}
            style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid #E0DBF7", background:"#F8F7FF", color:"#4C1D95", fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            ← {step === 1 ? "Back" : "Previous"}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {step < TOTAL && (
              <span
                onClick={() => setStep(s => s+1)}
                style={{ fontSize:12, color:"#9CA3AF", cursor:"pointer", fontWeight:500, transition:"color .15s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#6C5FBC")}
                onMouseOut={e  => (e.currentTarget.style.color = "#9CA3AF")}>
                Skip →
              </span>
            )}

            {step < TOTAL ? (
              <button type="button" className="ob-btn-next" disabled={!canNext()} onClick={() => setStep(s => s+1)}
                style={{ padding:"10px 22px", borderRadius:9, background:"linear-gradient(135deg,#6C5FBC,#8B7FD4)", color:"#fff", fontSize:13.5, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(108,95,188,.3)" }}>
                Continue →
              </button>
            ) : (
              <button type="button" className="ob-btn-next" disabled={!canNext() || saving} onClick={handleFinish}
                style={{ padding:"10px 22px", borderRadius:9, background:"linear-gradient(135deg,#6C5FBC,#8B7FD4)", color:"#fff", fontSize:13.5, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(108,95,188,.3)", display:"flex", alignItems:"center", gap:7 }}>
                {saving
                  ? <><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.35)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"ob-spin .7s linear infinite" }}/> Saving…</>
                  : "Go to Dashboard 🚀"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}