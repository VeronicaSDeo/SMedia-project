// ── components/ConnectModal.tsx ───────────────────────────────────────────────
import { useState, useEffect } from "react";

const API = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

const T = {
  bg: "#F7F5FF", primary: "#7C6FCD", border: "#DDD6FE",
  borderLight: "#EEE9FF", textDark: "#1E1B4B", textMuted: "#9CA3AF",
};

const CONNECT_PLATFORMS = [
  {
    key: "instagram", label: "Instagram", tagline: "Share photos, reels & stories",
    color: "#E1306C", bg: "#FFF0F6", liveOAuth: true, oauthPath: "/api/auth/instagram",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    key: "linkedin", label: "LinkedIn", tagline: "Professional posts & thought leadership",
    color: "#0A66C2", bg: "#EFF6FF", liveOAuth: true, oauthPath: "/api/auth/linkedin",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 22.271 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  {
    key: "youtube", label: "YouTube", tagline: "Schedule & publish video content",
    color: "#FF0000", bg: "#FFF5F5", liveOAuth: true, oauthPath: "/api/auth/youtube",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>,
  },
  {
    key: "twitter", label: "Twitter / X", tagline: "Tweets, threads & scheduled posts",
    color: "#111111", bg: "#F3F4F6", liveOAuth: false, oauthPath: "",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    key: "facebook", label: "Facebook", tagline: "Pages, groups & ad campaigns",
    color: "#1877F2", bg: "#EFF6FF", liveOAuth: false, oauthPath: "",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    key: "tiktok", label: "TikTok", tagline: "Short-form video & trends",
    color: "#111111", bg: "#F3F4F6", liveOAuth: false, oauthPath: "",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.78 1.52V6.7a4.85 4.85 0 0 1-1.01-.01z"/></svg>,
  },
  {
    key: "pinterest", label: "Pinterest", tagline: "Visual pins & idea boards",
    color: "#E60023", bg: "#FFF0F1", liveOAuth: false, oauthPath: "",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>,
  },
];

type ConnState = "idle" | "connecting" | "connected" | "coming_soon" | "disconnecting";

// Build state purely from user object + URL param — localStorage is only a
// fallback for the OAuth redirect return, never the source of truth.
function loadConnected(user: any): Record<string, ConnState> {
  const init: Record<string, ConnState> = {};
  const params        = new URLSearchParams(window.location.search);
  const justConnected = params.get("connected");

  CONNECT_PLATFORMS.forEach(p => {
    const inUser  = (user?.connectedAccounts || []).some((a: any) => a.platform === p.key);
    const justNow = justConnected === p.key;
    // localStorage only used for the brief window between OAuth redirect and
    // the parent re-fetching the user — cleared on disconnect
    const stored  = localStorage.getItem(`smedia_platform_${p.key}`) === "connected";
    init[p.key]   = (inUser || stored || justNow) ? "connected" : "idle";
  });

  if (justConnected) {
    localStorage.setItem(`smedia_platform_${justConnected}`, "connected");
    const url = new URL(window.location.href);
    url.searchParams.delete("connected");
    url.searchParams.delete("name");
    url.searchParams.delete("channel");
    window.history.replaceState({}, "", url.toString());
  }
  return init;
}

// Fetch fresh user from backend and rebuild state — called after disconnect
async function fetchFreshStates(): Promise<Record<string, ConnState>> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token) return loadConnected(null);
  try {
    const res  = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("fetch failed");
    const freshUser = await res.json();
    // Build state from fresh user — ignore localStorage for disconnected check
    const states: Record<string, ConnState> = {};
    CONNECT_PLATFORMS.forEach(p => {
      const inUser = (freshUser?.connectedAccounts || []).some((a: any) => a.platform === p.key);
      states[p.key] = inUser ? "connected" : "idle";
    });
    return states;
  } catch {
    return loadConnected(null);
  }
}

// Call backend disconnect + clear localStorage entry
async function disconnectPlatform(platformKey: string): Promise<void> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/auth/disconnect`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ platform: platformKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("Disconnect failed:", res.status, err);
    }
  } catch (e) {
    console.warn(`Disconnect API call failed for ${platformKey}:`, e);
  }
  // Always clear local flag regardless of API result
  localStorage.removeItem(`smedia_platform_${platformKey}`);
}

export default function ConnectModal({ onClose, user, onDisconnect }: {
  onClose: () => void;
  user: any;
  onDisconnect?: (platform: string) => void;
}) {
  const [connStates, setConnStates] = useState<Record<string, ConnState>>(() => loadConnected(user));
  const [hovered,    setHovered]    = useState<string | null>(null);

  // Re-sync whenever the parent updates the user prop (e.g. after re-fetch)
  useEffect(() => { setConnStates(loadConnected(user)); }, [user]);

  const handleConnect = async (pl: typeof CONNECT_PLATFORMS[0]) => {
    const state = connStates[pl.key];

    // ── Disconnect ────────────────────────────────────────────────────────────
    if (state === "connected") {
      setConnStates(prev => ({ ...prev, [pl.key]: "disconnecting" }));
      await disconnectPlatform(pl.key);

      // Re-fetch fresh user from backend so state reflects DB truth
      const freshStates = await fetchFreshStates();
      setConnStates(freshStates);

      onDisconnect?.(pl.key);
      return;
    }

    // ── Coming soon ───────────────────────────────────────────────────────────
    if (!pl.liveOAuth) {
      setConnStates(prev => ({ ...prev, [pl.key]: "coming_soon" }));
      setTimeout(() => setConnStates(prev => ({ ...prev, [pl.key]: "idle" })), 2500);
      return;
    }

    // ── Live OAuth ────────────────────────────────────────────────────────────
    const token = localStorage.getItem("smedia_token") || "";
    if (!token) { alert("Please log in first."); return; }

    sessionStorage.setItem("smedia_oauth_return", "connect_modal");
    window.location.href = `${API}${pl.oauthPath}?token=${encodeURIComponent(token)}`;
  };

  const connectedCount = Object.values(connStates).filter(s => s === "connected").length;
  const livePlatforms  = CONNECT_PLATFORMS.filter(p => p.liveOAuth).map(p => p.label);

  return (
    <>
      <style>{`
        @keyframes cm-fade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cm-spin { to{transform:rotate(360deg)} }
        .cm-row { transition:all .18s; }
        .cm-row:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(124,111,205,.12) !important; }
        .cm-btn { transition:all .18s; }
        .cm-btn:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
      `}</style>
      <div
        style={{ position:"fixed", inset:0, background:"rgba(30,27,74,.5)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9100 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{ background:"#fff", borderRadius:22, width:580, maxWidth:"95vw", maxHeight:"90vh", display:"flex", flexDirection:"column", border:`1.5px solid ${T.borderLight}`, boxShadow:"0 32px 90px rgba(124,111,205,.22)", overflow:"hidden", animation:"cm-fade .25s ease" }}>

          {/* Header */}
          <div style={{ padding:"22px 26px 18px", borderBottom:`1px solid ${T.borderLight}`, background:"linear-gradient(135deg,#FDFCFF,#F7F5FF)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:19, color:T.textDark }}>Connect Accounts ✨</div>
                <div style={{ fontSize:12.5, color:T.textMuted, marginTop:3 }}>{connectedCount} of {CONNECT_PLATFORMS.length} platforms connected</div>
              </div>
              <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, background:T.bg, border:`1.5px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:T.textMuted }}>×</button>
            </div>
            <div style={{ marginTop:14, height:5, background:T.borderLight, borderRadius:10, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${(connectedCount/CONNECT_PLATFORMS.length)*100}%`, background:"linear-gradient(90deg,#A78BFA,#7C6FCD)", borderRadius:10, transition:"width .4s ease" }}/>
            </div>
          </div>

          {/* Live badge */}
          <div style={{ padding:"10px 26px 0", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#059669", background:"#ECFDF5", padding:"3px 10px", borderRadius:20, border:"1px solid #A7F3D0" }}>● {livePlatforms.join(", ")} — Live OAuth</span>
            <span style={{ fontSize:11, color:T.textMuted }}>Other platforms coming soon</span>
          </div>

          {/* List */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 22px 10px" }}>
            {CONNECT_PLATFORMS.map(pl => {
              const state           = connStates[pl.key];
              const isConn          = state === "connected";
              const isSoon          = state === "coming_soon";
              const isDisconnecting = state === "disconnecting";

              return (
                <div key={pl.key} className="cm-row" style={{ marginBottom:8 }}
                  onMouseEnter={() => setHovered(pl.key)} onMouseLeave={() => setHovered(null)}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderRadius:14, border:`1.5px solid ${isConn ? pl.color+"44" : hovered === pl.key ? T.border : T.borderLight}`, background:isConn ? pl.bg : "#fff" }}>

                    <div style={{ width:46, height:46, borderRadius:13, background:pl.bg, color:pl.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1.5px solid ${pl.color}22` }}>
                      {pl.icon}
                    </div>

                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:T.textDark }}>{pl.label}</span>
                        {pl.liveOAuth && !isConn && <span style={{ fontSize:9.5, fontWeight:700, color:"#059669", background:"#ECFDF5", padding:"2px 7px", borderRadius:20 }}>LIVE</span>}
                        {isConn && <span style={{ fontSize:9.5, fontWeight:700, color:"#059669", background:"#ECFDF5", padding:"2px 7px", borderRadius:20 }}>✓ CONNECTED</span>}
                        {!pl.liveOAuth && <span style={{ fontSize:9.5, fontWeight:700, color:T.textMuted, background:T.bg, padding:"2px 7px", borderRadius:20 }}>SOON</span>}
                      </div>
                      <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>{pl.tagline}</div>
                      {isSoon && <div style={{ fontSize:11, color:"#92400E", background:"#FEF3C7", padding:"4px 8px", borderRadius:6, marginTop:5, border:"1px solid #FDE68A", display:"inline-block" }}>⏳ Integration coming soon</div>}
                      {pl.key === "youtube" && !isConn && pl.liveOAuth && (
                        <div style={{ fontSize:11, color:"#1D4ED8", background:"#EFF6FF", padding:"3px 8px", borderRadius:6, marginTop:5, border:"1px solid #BFDBFE", display:"inline-block" }}>🔑 Uses your existing Google account</div>
                      )}
                    </div>

                    <button className="cm-btn" onClick={() => handleConnect(pl)}
                      disabled={isSoon || isDisconnecting}
                      style={{
                        padding:"8px 18px", borderRadius:10, flexShrink:0,
                        background: isConn ? "transparent" : !pl.liveOAuth ? T.bg : pl.color,
                        color:  isConn ? "#DC2626" : !pl.liveOAuth ? T.textMuted : "#fff",
                        border: isConn ? "1.5px solid #FECACA" : !pl.liveOAuth ? `1px solid ${T.border}` : "none",
                        fontSize:12.5, fontWeight:700,
                        cursor: (isSoon || isDisconnecting) ? "not-allowed" : "pointer",
                        fontFamily:"inherit", minWidth:110,
                        opacity: (isSoon || isDisconnecting) ? 0.6 : 1,
                      }}>
                      {isDisconnecting
                        ? <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ width:10, height:10, border:"2px solid #DC262644", borderTopColor:"#DC2626", borderRadius:"50%", display:"inline-block", animation:"cm-spin .7s linear infinite" }}/>
                            Disconnecting…
                          </span>
                        : isConn ? "Disconnect"
                        : !pl.liveOAuth ? "Coming Soon"
                        : "Connect →"
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding:"14px 24px 18px", borderTop:`1px solid ${T.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"linear-gradient(135deg,#FDFCFF,#F7F5FF)" }}>
            <div style={{ fontSize:12, color:T.textMuted }}>🔒 We never post without your approval</div>
            <button onClick={onClose} style={{ padding:"10px 26px", borderRadius:11, background:"linear-gradient(135deg,#A78BFA,#7C6FCD)", color:"#fff", border:"none", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 16px rgba(124,111,205,.35)" }}>
              Done {connectedCount > 0 ? `(${connectedCount} connected)` : ""}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}