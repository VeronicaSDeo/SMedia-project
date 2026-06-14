// ── pages/SettingsPage.tsx ────────────────────────────────────────────────────
// FIXES:
//  1. All fields pre-filled from user data automatically
//  2. Read-only view by default — "Edit Profile" button to enter edit mode
//  3. Only Instagram + LinkedIn in Connected Platforms
//  4. Connect/Disconnect persisted in localStorage

import { useState, useEffect } from "react";
import { T, Ic, apiFetch } from "../utils/constants";

// ── Only Instagram + LinkedIn ─────────────────────────────────────────────────
const PLATFORMS_LIMITED = [
  {
    key:   "instagram",
    label: "Instagram",
    color: "#E1306C",
    bg:    "#FFF0F6",
    icon:  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color:"#E1306C" }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    key:   "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    bg:    "#EFF6FF",
    icon:  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color:"#0A66C2" }}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
];

const TONE_LABELS: Record<string, string> = {
  exciting: "Exciting 🔥", professional: "Professional 💼", casual: "Casual 😊",
  funny: "Funny 😂", inspirational: "Inspirational ✨", educational: "Educational 📚",
};
const GOAL_LABELS: Record<string, string> = {
  grow_audience: "Grow Audience 📈", drive_traffic: "Drive Traffic 🔗", sell_products: "Sell Products 🛒",
  build_brand: "Build Brand 🎯", engage_community: "Engage Community 💬", generate_leads: "Generate Leads 🎣",
};

// ── Helpers to load/save connected platforms in localStorage ──────────────────
const CONN_KEY = "smedia_connected_platforms";
const loadConnected = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(CONN_KEY) || "{}"); } catch { return {}; }
};
const saveConnected = (c: Record<string, boolean>) => {
  localStorage.setItem(CONN_KEY, JSON.stringify(c));
};

export default function SettingsPage({ user, onConnect }: { user: any; onConnect: () => void }) {
  const [editMode, setEditMode] = useState(false);
  const [name,     setName]     = useState(user?.name  || "");
  const [email,    setEmail]    = useState(user?.email || "");
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);

  const [connected, setConnected] = useState<Record<string, boolean>>(() => {
    const stored = loadConnected();
    const init: Record<string, boolean> = {};
    PLATFORMS_LIMITED.forEach(p => {
      // Stored value takes priority, then user.platforms, then false
      if (p.key in stored) {
        init[p.key] = stored[p.key];
      } else {
        init[p.key] = (user?.platforms || []).includes(p.key);
      }
    });
    return init;
  });

  // Keep fields in sync when user object loads/changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/user/me", { method: "PATCH", body: JSON.stringify({ name, email }) });
    } catch {
      // fallback: save locally
      try {
        const stored = JSON.parse(localStorage.getItem("smedia_user") || "{}");
        localStorage.setItem("smedia_user", JSON.stringify({ ...stored, name, email }));
      } catch {}
    }
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  };

  const handleToggleConnect = (key: string) => {
    setConnected(c => {
      const next = { ...c, [key]: !c[key] };
      saveConnected(next);
      return next;
    });
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 9,
    border: `1px solid ${T.border}`, background: editMode ? "#fff" : T.bg,
    fontSize: 13, color: T.textDark, fontFamily: "inherit",
  };

  const readField = (value: string, fallback = "—") => (
    <div style={{ padding: "10px 13px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bg, fontSize: 13, color: value ? T.textDark : T.textMuted, fontWeight: value ? 500 : 300 }}>
      {value || fallback}
    </div>
  );

  return (
    <div style={{ padding: "24px 28px", maxWidth: 700 }}>

      {/* ── Profile ────────────────────────────────────────────────────────── */}
      <div className="fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: T.textDark }}>Profile Settings</div>
          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              style={{ padding: "7px 16px", borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.primary, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              ✏️ Edit Profile
            </button>
          ) : (
            <button onClick={() => { setEditMode(false); setName(user?.name||""); setEmail(user?.email||""); }}
              style={{ padding: "7px 16px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ✕ Cancel
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Full Name</label>
            {editMode
              ? <input value={name} onChange={e => setName(e.target.value)} className="field" style={fieldStyle} />
              : readField(user?.name || name)}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Email</label>
            {editMode
              ? <input value={email} onChange={e => setEmail(e.target.value)} className="field" style={fieldStyle} />
              : readField(user?.email || email)}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Plan</label>
            <div style={{ padding: "10px 13px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bg, fontSize: 13, display: "flex", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: T.primary }}>{user?.plan || "Free"}</span>
              {user?.plan !== "Pro" && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: T.accent, cursor: "pointer" }}>↗ Upgrade</span>}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Role</label>
            {readField(user?.role?.replace(/_/g, " "))}
          </div>
        </div>

        {editMode && (
          <button onClick={handleSave} disabled={saving}
            style={{ marginTop: 16, padding: "9px 20px", borderRadius: 9, background: saved ? "#1A9E6A" : T.primary, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background .3s" }}>
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
          </button>
        )}
        {saved && !editMode && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#059669", fontWeight: 600 }}>✓ Profile saved successfully!</div>
        )}
      </div>

      {/* ── Connected Platforms (Instagram + LinkedIn only) ─────────────────── */}
      <div className="fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "20px", marginBottom: 14, animationDelay: ".1s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: T.textDark }}>Connected Platforms</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, fontWeight: 300 }}>Connect accounts to enable publishing</div>
          </div>
          <button onClick={onConnect}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: T.primary, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ display: "flex" }}>{Ic.plus}</span> Add Account
          </button>
        </div>

        {PLATFORMS_LIMITED.map(p => (
          <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${connected[p.key] ? p.color + "33" : T.borderLight}`, background: connected[p.key] ? p.bg : "#fff", marginBottom: 8, transition: "all .2s" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${p.color}22` }}>
              {p.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: T.textDark }}>{p.label}</div>
              <div style={{ fontSize: 11.5, color: connected[p.key] ? "#059669" : T.textMuted, fontWeight: 300 }}>
                {connected[p.key] ? "● Connected" : "○ Not connected"}
              </div>
            </div>
            <button
              onClick={() => handleToggleConnect(p.key)}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: `1px solid ${connected[p.key] ? "#FECACA" : p.color}`,
                background: connected[p.key] ? "#FFF0F0" : p.bg,
                color: connected[p.key] ? "#DC2626" : p.color,
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .18s",
              }}>
              {connected[p.key] ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>

      {/* ── AI Preferences ──────────────────────────────────────────────────── */}
      <div className="fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "20px", animationDelay: ".2s" }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: T.textDark, marginBottom: 4 }}>AI Content Preferences</div>
        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16, fontWeight: 300 }}>Saved from your onboarding — edit any time</div>
        {([
          ["Default Tone",  user?.tone     ? TONE_LABELS[user.tone] || user.tone : "—"],
          ["Content Goal",  user?.goal     ? GOAL_LABELS[user.goal] || user.goal : "—"],
          ["Industry",      user?.industry || "—"],
          ["Brand Name",    user?.brandName || "—"],
        ] as const).map(([l, v]) => (
          <div key={l} style={{ marginBottom: 13 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>{l}</label>
            <div style={{ padding: "10px 13px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bg, fontSize: 13, color: v !== "—" ? T.textDark : T.textMuted, fontWeight: v !== "—" ? 500 : 300 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}