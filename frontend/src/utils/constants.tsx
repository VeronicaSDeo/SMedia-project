// ── utils/constants.tsx ────────────────────────────────────────────────────────
// Central hub: design tokens, shared types, icons, context, utilities.
// FIXES: Added CAL_STATUS export (was missing — caused the SyntaxError)

import React, { createContext, useContext } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS  — light lavender + off-white "pookie" palette
// ══════════════════════════════════════════════════════════════════════════════
export const T = {
  // Core backgrounds
  bg:           "#F7F5FF",          // off-white with lavender tint
  bgSoft:       "#FDFCFF",          // near-white
  navBg:        "#1E1A3C",          // deep violet-navy for nav
  cardBg:       "#FFFFFF",

  // Brand purples
  primary:      "#7C6FCD",          // soft lavender-purple
  primaryDark:  "#5B4FA8",
  accent:       "#A78BFA",          // light lavender accent
  accentLight:  "#EDE9FE",          // very light lavender tint
  accentPale:   "#F5F3FF",          // palest lavender

  // Borders
  border:       "#DDD6FE",          // lavender border
  borderLight:  "#EEE9FF",          // feather-light lavender

  // Text
  textDark:     "#1E1B4B",          // deep indigo-near-black
  textBody:     "#4B5563",
  textMuted:    "#9CA3AF",

  // Status
  success:      "#059669",
  danger:       "#EF4444",
  warning:      "#F59E0B",

  // Pookie extras
  pinkAccent:   "#F0ABFC",          // soft pink-violet
  mintAccent:   "#6EE7B7",          // soft mint
};

// ══════════════════════════════════════════════════════════════════════════════
// PLATFORMS
// ══════════════════════════════════════════════════════════════════════════════
export const PLATFORMS = [
  {
    key: "instagram", label: "Instagram", color: "#E1306C", bg: "#FFF0F6",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    key: "linkedin", label: "LinkedIn", color: "#0A66C2", bg: "#EFF6FF",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 22.271 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  {
    key: "twitter", label: "Twitter / X", color: "#111111", bg: "#F3F4F6",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    key: "facebook", label: "Facebook", color: "#1877F2", bg: "#EFF6FF",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    key: "youtube", label: "YouTube", color: "#FF0000", bg: "#FFF5F5",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>,
  },
  {
    key: "tiktok", label: "TikTok", color: "#111111", bg: "#F3F4F6",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.78 1.52V6.7a4.85 4.85 0 0 1-1.01-.01z"/></svg>,
  },
  {
    key: "pinterest", label: "Pinterest", color: "#E60023", bg: "#FFF0F1",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CAL_STATUS  — FIX: this was missing from the original constants export
// ══════════════════════════════════════════════════════════════════════════════
export const CAL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", color: "#7C6FCD",  bg: "#EDE9FE" },
  draft:     { label: "Draft",     color: "#9CA3AF",  bg: "#F3F4F6" },
  confirmed: { label: "Confirmed", color: "#059669",  bg: "#ECFDF5" },
  published: { label: "Published", color: "#0A66C2",  bg: "#DBEAFE" },
};

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════
export const Ic = {
  home:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  zap:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  cal:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  posts:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  chart:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  activity: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  bell:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  plus:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  clock:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  logout:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  logo:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  hashtag:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  trash:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  check:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR CONTEXT
// ══════════════════════════════════════════════════════════════════════════════
export interface CalEvent {
  id:       number;
  day:      number;
  month?:   number;
  year?:    number;
  platform: string;
  text:     string;
  time:     string;
  status:   string;
  imageUrl?: string;
}

export interface CalCtxType {
  events:      CalEvent[];
  addEvent:    (data: Omit<CalEvent, "id">) => void;
  updateEvent: (id: number, patch: Partial<CalEvent>) => void;
  removeEvent: (id: number) => void;
}

export const CalCtx = createContext<CalCtxType | null>(null);

// ══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ══════════════════════════════════════════════════════════════════════════════
export function Skeleton({ w, h, mb, r }: { w?: number | string; h?: number; mb?: number; r?: number }) {
  return (
    <div style={{
      width: w ?? "100%", height: h ?? 14, marginBottom: mb ?? 0,
      borderRadius: r ?? 6, background: "linear-gradient(90deg,#EDE9FE,#DDD6FE,#EDE9FE)",
      backgroundSize: "200% 100%", animation: "skeleton-shimmer 1.4s ease infinite",
    }}/>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MINI BAR CHART
// ══════════════════════════════════════════════════════════════════════════════
export function MiniBar({ data, color }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, minHeight: 2, borderRadius: 2, background: color ?? T.primary, opacity: 0.7 + (i / data.length) * 0.3 }}/>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIRM DIALOG
// ══════════════════════════════════════════════════════════════════════════════
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }} style={{ position: "fixed", inset: 0, background: "rgba(30,27,74,.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div className="modal-box" style={{ background: "#fff", borderRadius: 16, padding: "26px 28px", width: 380, maxWidth: "90vw", border: `1px solid ${T.borderLight}`, boxShadow: "0 24px 60px rgba(99,102,241,.2)" }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, color: T.textDark, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: T.textBody, lineHeight: 1.6, marginBottom: 22 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: 9, background: T.primary, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{confirmLabel}</button>
          <button onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 9, background: "none", border: `1px solid ${T.border}`, color: T.textBody, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// API FETCH HELPER
// ══════════════════════════════════════════════════════════════════════════════
const API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("smedia_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((opts.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function clearAuth() {
  localStorage.removeItem("smedia_token");
  localStorage.removeItem("smedia_user");
}

// ══════════════════════════════════════════════════════════════════════════════
// HASH ROUTING HELPERS
// ══════════════════════════════════════════════════════════════════════════════
export function getHashView(): string {
  const hash = window.location.hash.replace("#", "");
  const valid = ["home","generate","calendar","posts","analytics","activity","settings"];
  return valid.includes(hash) ? hash : "home";
}

export function setHashView(view: string) {
  window.location.hash = view === "home" ? "" : view;
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL STYLES INJECTOR
// ══════════════════════════════════════════════════════════════════════════════
export function injectStyles() {
  if (document.getElementById("__smedia_styles")) return;
  const el = document.createElement("style");
  el.id = "__smedia_styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F5FF; }
    h1,h2,h3 { font-family: 'Sora', sans-serif; }

    @keyframes skeleton-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes fade-up   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin      { to{transform:rotate(360deg)} }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
    @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .fade-up  { animation: fade-up .42s ease both; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,111,205,.18) !important; transition: all .2s; }
    .post-card:hover { background: #F7F5FF !important; }
    .nav-link { height: 58px; }
    .logout-btn:hover { background: rgba(217,64,64,.2) !important; }

    .modal-overlay { position:fixed; inset:0; background:rgba(30,27,74,.5); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; z-index:9000; animation:fade-up .2s ease; }
    .modal-box { animation: fade-up .25s ease; }

    .generate-input:focus { outline:none; border-color:#7C6FCD !important; box-shadow:0 0 0 3px rgba(124,111,205,.15) !important; }
    .field:focus { outline:none; border-color:#7C6FCD !important; box-shadow:0 0 0 3px rgba(124,111,205,.12) !important; }

    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:#DDD6FE; border-radius:10px; }
    ::-webkit-scrollbar-thumb:hover { background:#A78BFA; }
  `;
  document.head.appendChild(el);
}