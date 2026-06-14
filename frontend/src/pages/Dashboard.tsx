// ── pages/Dashboard.tsx ───────────────────────────────────────────────────────
// FIXES:
//  - Only shows CURRENT + FUTURE scheduled posts (filters out past days)
//  - /api/user/me: 401 → auto-logout + redirect to /login
//  - Smooth CSS animations via injected keyframes (no library needed)
//  - Micro-interactions on nav, stat cards, event rows
//  - MiniBar animates bars in on mount
//  - FIX: scheduled stat uses futureEvents.length directly (not stale localStorage)

import { useState, useEffect, useCallback, useContext, useRef } from "react";
import {
  T, PLATFORMS, CAL_STATUS, Ic, CalCtx,
  type CalCtxType, type CalEvent,
  Skeleton, MiniBar, ConfirmDialog,
  apiFetch, clearAuth, injectStyles,
  getHashView, setHashView,
} from "../utils/constants";

import GeneratePage    from "./GeneratePage";
import ContentCalendar from "./ContentCalendar";
import AnalyticsPage   from "./AnalyticsPage";
import PostsPage       from "./PostsPage";
import ActivityPage    from "./ActivityPage";
import SettingsPage    from "./SettingsPage";
import ConnectModal    from "./ConnectModal";

// ── Stat helpers ──────────────────────────────────────────────────────────────
const STATS_KEY = "smedia_user_stats";
function loadLocalStats(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}"); } catch { return {}; }
}

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// ── Inject dashboard keyframes once ──────────────────────────────────────────
function injectDashStyles() {
  if (document.getElementById("smedia-dash-styles")) return;
  const style = document.createElement("style");
  style.id = "smedia-dash-styles";
  style.textContent = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes barGrow {
      from { transform: scaleY(0); }
      to   { transform: scaleY(1); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: .45; }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes dotBounce {
      0%, 80%, 100% { transform: scale(0); }
      40%            { transform: scale(1); }
    }

    .smedia-nav-link {
      transition: color .18s, border-color .18s, background .18s !important;
    }
    .smedia-nav-link:hover {
      color: rgba(255,255,255,.88) !important;
      background: rgba(255,255,255,.06) !important;
      border-radius: 6px;
    }
    .smedia-stat-card {
      transition: transform .18s, box-shadow .18s !important;
    }
    .smedia-stat-card:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 8px 28px rgba(0,0,0,.09) !important;
    }
    .smedia-event-row {
      transition: background .15s, transform .15s !important;
    }
    .smedia-event-row:hover {
      background: #F0F0FA !important;
      transform: translateX(3px) !important;
    }
    .smedia-connect-btn {
      transition: transform .14s, box-shadow .14s, background .14s !important;
    }
    .smedia-connect-btn:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 6px 20px rgba(79,70,229,.55) !important;
      background: #4338CA !important;
    }
    .smedia-logout-btn {
      transition: background .14s, color .14s, border-color .14s !important;
    }
    .smedia-logout-btn:hover {
      background: rgba(217,64,64,.22) !important;
      color: rgba(217,64,64,1) !important;
      border-color: rgba(217,64,64,.45) !important;
    }
    .smedia-day-pill {
      transition: transform .14s, box-shadow .14s !important;
    }
    .smedia-day-pill:hover {
      transform: scale(1.05) !important;
    }
    .smedia-platform-row {
      transition: background .14s !important;
    }
    .smedia-platform-row:hover {
      background: rgba(99,102,241,.07) !important;
      border-radius: 8px;
    }
    .smedia-bar-fill {
      transform-origin: bottom;
      animation: barGrow .55s cubic-bezier(.16,1,.3,1) both;
    }
    .live-dot {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #22C55E;
      animation: pulse 1.8s ease-in-out infinite;
      margin-right: 4px;
    }
    .smedia-fade-up {
      animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both;
    }
    .smedia-slide-in {
      animation: slideIn .4s cubic-bezier(.16,1,.3,1) both;
    }
  `;
  document.head.appendChild(style);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOP NAV
// ══════════════════════════════════════════════════════════════════════════════
function TopNav({ active, setActive, user, onConnect, onLogout, loading }: {
  active: string; setActive: (v: string) => void; user: any;
  onConnect: () => void; onLogout: () => void; loading: boolean;
}) {
  const [notif, setNotif] = useState(3);
  const nav = [
    { key: "home",      label: "Home",        icon: Ic.home },
    { key: "generate",  label: "AI Generate", icon: Ic.zap  },
    { key: "calendar",  label: "Calendar",    icon: Ic.cal  },
    { key: "posts",     label: "My Posts",    icon: Ic.posts },
    { key: "analytics", label: "Analytics",   icon: Ic.chart },
    { key: "activity",  label: "Activity",    icon: Ic.activity },
    { key: "settings",  label: "Settings",    icon: Ic.settings },
  ];
  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <nav style={{ background: T.navBg, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,.3)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 24px", height: 58, gap: 6 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 18, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: "rgba(99,102,241,.25)", border: "1px solid rgba(99,102,241,.5)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#818CF8" }}>{Ic.logo}</div>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "#fff", letterSpacing: -0.3 }}>
            <span style={{ color: "#818CF8" }}>S</span>Media
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", flex: 1, overflow: "hidden" }}>
          {nav.map(item => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                className="smedia-nav-link"
                onClick={() => setActive(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 13px",
                  background: isActive ? "rgba(99,102,241,.15)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,.5)",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${T.accent}` : "2px solid transparent",
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ display: "flex" }}>{item.icon}</span>
                {item.label}
                {item.key === "generate" && (
                  <span style={{ background: T.accent, color: "#16142B", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 20, letterSpacing: .3 }}>AI</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            className="smedia-connect-btn"
            onClick={onConnect}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "#4F46E5", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 3px 12px rgba(79,70,229,.4)" }}
          >
            <span style={{ display: "flex" }}>{Ic.plus}</span> Connect
          </button>

          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setNotif(0)}>
            <div style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.6)", transition: "background .15s" }}>
              {Ic.bell}
            </div>
            {notif > 0 && (
              <span style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: T.danger, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {notif}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${T.accent},#E8B84B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.textDark, flexShrink: 0 }}>
              {loading ? "…" : initials}
            </div>
            {loading
              ? <Skeleton w={56} h={13} />
              : <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.85)" }}>{user?.name?.split(" ")[0] || "User"}</span>
            }
            <button
              className="smedia-logout-btn"
              onClick={onLogout}
              style={{ background: "rgba(217,64,64,.1)", border: "1px solid rgba(217,64,64,.2)", borderRadius: 6, color: "rgba(217,64,64,.75)", cursor: "pointer", padding: "4px 7px", display: "flex", alignItems: "center", fontFamily: "inherit" }}
            >
              {Ic.logout}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Animated stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg, delay }: {
  label: string; value: number; icon: React.ReactNode;
  color: string; bg: string; delay: number;
}) {
  const displayed = useCountUp(value);

  return (
    <div
      className="smedia-stat-card smedia-fade-up"
      style={{
        background: "#fff", border: `1px solid ${T.borderLight}`,
        borderRadius: 14, padding: "18px 20px",
        animationDelay: `${delay}s`,
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        {value > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: T.success, background: "#E8F8F1", padding: "3px 9px", borderRadius: 20 }}>
            <span className="live-dot" />live
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "1.65rem", color: T.textDark }}>
        {displayed}
      </div>
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, fontWeight: 400 }}>{label}</div>
    </div>
  );
}

// ── Animated MiniBar ──────────────────────────────────────────────────────────
function AnimatedMiniBar({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 52 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
          <div
            className="smedia-bar-fill"
            style={{
              width: "100%",
              height: `${Math.max((v / max) * 100, v > 0 ? 12 : 4)}%`,
              background: v > 0
                ? `linear-gradient(180deg, ${color}cc, ${color})`
                : `${color}22`,
              borderRadius: "4px 4px 2px 2px",
              animationDelay: `${i * 0.055}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME VIEW
// ══════════════════════════════════════════════════════════════════════════════
function HomeView({ user, userLoading, onNavigate }: {
  user: any; userLoading: boolean; onNavigate: (v: string) => void;
}) {
  const calCtx    = useContext(CalCtx);
  const allEvents = calCtx?.events || [];

  const [localStats, setLocalStats] = useState(loadLocalStats);
  useEffect(() => {
    const refresh = () => setLocalStats(loadLocalStats());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    const t = setInterval(refresh, 3000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(t);
    };
  }, []);

  const firstName  = user?.name?.split(" ")[0] || "there";
  const now        = new Date();
  const todayNum   = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear  = now.getFullYear();
  const dayNames   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ── Only current + future events ─────────────────────────────────────────
  // FIX: month & year are always stored now (never undefined), so comparison is reliable
  const futureEvents = allEvents.filter(ev => {
    const evYear  = ev.year  ?? todayYear;
    const evMonth = ev.month ?? todayMonth;
    if (evYear  > todayYear)  return true;
    if (evYear  < todayYear)  return false;
    if (evMonth > todayMonth) return true;
    if (evMonth < todayMonth) return false;
    return ev.day >= todayNum;
  });

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return d;
  });

  const totalPosts  = localStats.totalPosts  || user?.stats?.totalPosts  || 0;
  const aiCaptions  = localStats.aiCaptions  || user?.stats?.aiCaptions  || 0;
  const hashtagSets = localStats.hashtagSets || user?.stats?.hashtagSets || 0;

  // FIX: always use futureEvents.length — never the stale localStorage value
  const scheduled = futureEvents.length;

  const stats = [
    { label: "Total Content Created", value: totalPosts,  icon: Ic.posts,   color: "#2D2A6E", bg: "#EEEDF9" },
    { label: "AI Captions Generated", value: aiCaptions,  icon: Ic.zap,     color: "#7C3AED", bg: "#EDE9FE" },
    { label: "Hashtag Sets Used",     value: hashtagSets, icon: Ic.hashtag, color: "#E1306C", bg: "#FFF0F6" },
    { label: "Posts Scheduled",       value: scheduled,   icon: Ic.cal,     color: "#0A66C2", bg: "#EFF6FF" },
  ];

  // Bar chart: future events by day-of-week
  const weekCounts = Array(7).fill(0);
  futureEvents.forEach(ev => {
    const d = new Date(
      ev.year  ?? todayYear,
      ev.month ?? todayMonth,
      ev.day,
    );
    weekCounts[d.getDay()] = (weekCounts[d.getDay()] || 0) + 1;
  });

  // Upcoming: next 3 future events sorted by date
  const upcomingEvents = [...futureEvents]
    .sort((a, b) => {
      const toMs = (e: CalEvent) => new Date(
        e.year  ?? todayYear,
        e.month ?? todayMonth,
        e.day,
      ).getTime();
      return toMs(a) - toMs(b);
    })
    .slice(0, 3);

  const totalCountUp = useCountUp(totalPosts);

  return (
    <div style={{ padding: "24px 28px" }}>

      {/* Welcome banner */}
      <div
        className="smedia-fade-up"
        style={{
          background: "linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4F46E5 100%)",
          borderRadius: 16, padding: "22px 28px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "relative", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(79,70,229,.25)",
        }}
      >
        <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(129,140,248,.1)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 40, bottom: -50, width: 120, height: 120, borderRadius: "50%", background: "rgba(167,139,250,.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: "40%", top: -40, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          {userLoading
            ? <><Skeleton w={220} h={22} mb={8} /><Skeleton w={280} h={13} /></>
            : <>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Hello, {firstName}! 👋
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", fontWeight: 300 }}>
                  {user?.goal ? `Goal: ${user.goal.replace(/_/g, " ")} · ` : ""}
                  {user?.plan || "Free"} Plan
                  {user?.industry ? ` · ${user.industry}` : ""}
                </div>
              </>
          }
        </div>

        <div style={{ textAlign: "right", position: "relative" }}>
          {userLoading
            ? <Skeleton w={80} h={34} />
            : <>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 34, fontWeight: 700, color: T.accent, lineHeight: 1 }}>
                  {totalCountUp}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", fontWeight: 300, marginTop: 4 }}>
                  lifetime posts created
                </div>
              </>
          }
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {stats.map((s, i) => (
          userLoading
            ? (
              <div key={i} style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "18px 20px" }}>
                <Skeleton w={38} h={38} mb={14} />
                <Skeleton w={80} h={26} mb={6} />
                <Skeleton w={110} h={13} />
              </div>
            )
            : <StatCard key={i} {...s} delay={i * 0.07} />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>

        {/* Posts scheduled by day-of-week */}
        <div
          className="smedia-fade-up"
          style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "18px 20px", animationDelay: ".28s" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: T.textDark }}>Upcoming Posts</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Scheduled (this week + future)</div>
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "1.4rem", color: T.primary }}>
              {futureEvents.length}
            </div>
          </div>
          <AnimatedMiniBar data={weekCounts} color={T.primary} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <span key={d} style={{ fontSize: 10, color: T.textMuted, fontWeight: 500 }}>{d}</span>
            ))}
          </div>
        </div>

        {/* Platform breakdown (future events only) */}
        <div
          className="smedia-fade-up"
          style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "18px 20px", animationDelay: ".34s" }}
        >
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: T.textDark, marginBottom: 14 }}>
            Platform Breakdown
          </div>
          {PLATFORMS.slice(0, 5).map((p, idx) => {
            const count = futureEvents.filter(e => e.platform === p.key).length;
            const pct   = futureEvents.length ? Math.round((count / futureEvents.length) * 100) : 0;
            return (
              <div
                key={p.key}
                className="smedia-platform-row smedia-slide-in"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 7px", animationDelay: `${.34 + idx * .06}s` }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, background: p.bg, color: p.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {p.icon}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: T.textDark, width: 70 }}>{p.label}</span>
                <div style={{ flex: 1, height: 4, background: T.bg, borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pct}%`, height: "100%",
                      background: `linear-gradient(90deg,${p.color}66,${p.color})`,
                      borderRadius: 4,
                      transition: "width .6s cubic-bezier(.16,1,.3,1)",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: p.color, minWidth: 30, textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
          {futureEvents.length === 0 && (
            <div style={{ textAlign: "center", color: T.textMuted, fontSize: 12, padding: "12px 0" }}>
              No upcoming scheduled posts
            </div>
          )}
        </div>
      </div>

      {/* Upcoming schedule */}
      <div
        className="smedia-fade-up"
        style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "18px 20px", animationDelay: ".42s" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: T.textDark }}>
            Upcoming Schedule
          </div>
          <button
            onClick={() => onNavigate("calendar")}
            style={{ background: "none", border: "none", fontSize: 12, fontWeight: 600, color: T.primary, cursor: "pointer", transition: "opacity .15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".7")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            View Full Calendar →
          </button>
        </div>

        {/* Day pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {days.map((d, i) => {
            const isToday   = d.toDateString() === now.toDateString();
            const hasEvents = futureEvents.some(ev => ev.day === d.getDate());
            return (
              <div
                key={i}
                className="smedia-day-pill"
                style={{
                  flex: 1, textAlign: "center", padding: "8px 4px",
                  borderRadius: 10,
                  background: isToday ? T.primary : T.bg,
                  border: `1px solid ${isToday ? T.primary : T.borderLight}`,
                  cursor: "default",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, color: isToday ? "rgba(255,255,255,.7)" : T.textMuted }}>
                  {dayNames[d.getDay()]}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? "#fff" : T.textDark, marginTop: 2 }}>
                  {d.getDate()}
                </div>
                {hasEvents && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: isToday ? "rgba(255,255,255,.8)" : T.accent, margin: "3px auto 0" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Event rows */}
        {upcomingEvents.length > 0
          ? upcomingEvents.map((ev, i) => {
              const pl = PLATFORMS.find(p => p.key === ev.platform) || PLATFORMS[0];
              return (
                <div
                  key={ev.id ?? i}
                  className="smedia-event-row smedia-slide-in"
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10,
                    background: T.bg, border: `1px solid ${T.borderLight}`,
                    marginBottom: 6,
                    animationDelay: `${.42 + i * .08}s`,
                    cursor: "default",
                  }}
                >
                  <div style={{ width: 3, height: 34, borderRadius: 2, background: pl.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textDark }}>{ev.text}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {pl.label} · {ev.time} · {new Date(ev.year ?? todayYear, ev.month ?? todayMonth, ev.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: CAL_STATUS[ev.status]?.color || T.primary,
                    background: CAL_STATUS[ev.status]?.bg || T.accentLight,
                    padding: "3px 8px", borderRadius: 10,
                  }}>
                    {CAL_STATUS[ev.status]?.label || "Scheduled"}
                  </span>
                </div>
              );
            })
          : (
            <div style={{ textAlign: "center", padding: "24px 0", color: T.textMuted, fontSize: 13 }}>
              No upcoming posts.{" "}
              <button
                onClick={() => onNavigate("calendar")}
                style={{ background: "none", border: "none", color: T.primary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Add one →
              </button>
            </div>
          )
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [active,      setActive]      = useState(getHashView);
  const [connectOpen, setConnectOpen] = useState(false);
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("smedia_user") || "null"); } catch { return null; }
  });
  const [userLoading, setUserLoading] = useState(true);

  // FIX: load events from localStorage (persists across sessions) not sessionStorage
  const [events, setEvents] = useState<CalEvent[]>(() => {
    try {
      const s = localStorage.getItem("smedia_events");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const addEvent = useCallback((data: Omit<CalEvent, "id">) => {
    const now = new Date();
    const ev: CalEvent = {
      id:       Date.now(),
      day:      data.day,
      // FIX: always store month & year so filter comparisons never get undefined
      month:    data.month  ?? now.getMonth(),
      year:     data.year   ?? now.getFullYear(),
      platform: data.platform,
      text:     data.text,
      time:     data.time,
      status:   data.status || "scheduled",
      ...(data.postId ? { postId: data.postId } : {}),
    };
    setEvents(prev => {
      const next = [...prev, ev];
      try { localStorage.setItem("smedia_events", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateEvent = useCallback((id: number, patch: Partial<CalEvent>) => {
    setEvents(prev => {
      const next = prev.map(ev => ev.id === id ? { ...ev, ...patch } : ev);
      try { localStorage.setItem("smedia_events", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeEvent = useCallback((id: number) => {
    setEvents(prev => {
      const next = prev.filter(ev => ev.id !== id);
      try { localStorage.setItem("smedia_events", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const calCtxValue: CalCtxType = { events, addEvent, updateEvent, removeEvent };

  const handleSetActive = useCallback((view: string) => {
    setActive(view);
    setHashView(view);
  }, []);

  useEffect(() => {
    const fn = () => setActive(getHashView());
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  useEffect(() => {
    injectStyles();
    injectDashStyles();
  }, []);

  // ── Fetch user; 401 → force re-login ───────────────────────────────────────
  useEffect(() => {
    apiFetch("/api/user/me")
      .then((data: any) => {
        setUser(data);
        localStorage.setItem("smedia_user", JSON.stringify(data));
      })
      .catch((err: Error) => {
        const is401 =
          err.message.includes("401") ||
          err.message.toLowerCase().includes("unauthorized") ||
          err.message.toLowerCase().includes("token");
        if (is401) {
          clearAuth();
          window.location.replace("/login");
        }
      })
      .finally(() => setUserLoading(false));
  }, []);

  const handleLogout = () => { clearAuth(); window.location.replace("/login"); };

  const hr = new Date().getHours();
  const greeting = hr < 12 ? "morning" : hr < 18 ? "afternoon" : "evening";

  const views: Record<string, { title: string; subtitle: string; component: React.ReactNode }> = {
    home:      { title: "Home",              subtitle: `Good ${greeting}${user?.name ? ", " + user.name.split(" ")[0] : ""} 👋  Here's your overview.`,  component: <HomeView user={user} userLoading={userLoading} onNavigate={handleSetActive} /> },
    generate:  { title: "AI Generate",      subtitle: "Create captions, hashtags & posts with AI in seconds",                                              component: <GeneratePage user={user} /> },
    calendar:  { title: "Content Calendar", subtitle: "Plan, schedule and manage content across all platforms",                                             component: <ContentCalendar /> },
    posts:     { title: "My Posts",         subtitle: "Manage your drafted, scheduled and published posts",                                                 component: <PostsPage /> },
    analytics: { title: "Analytics",        subtitle: "Track performance across all your platforms",                                                        component: <AnalyticsPage user={user} /> },
    activity:  { title: "Activity Log",     subtitle: "History of your scheduled and confirmed posts",                                                      component: <ActivityPage /> },
    settings:  { title: "Settings",         subtitle: "Manage your account, platforms and AI preferences",                                                  component: <SettingsPage user={user} onConnect={() => setConnectOpen(true)} /> },
  };

  const current = views[active] || views.home;

  return (
    <CalCtx.Provider value={calCtxValue}>
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <TopNav
          active={active}
          setActive={handleSetActive}
          user={user}
          loading={userLoading}
          onConnect={() => setConnectOpen(true)}
          onLogout={handleLogout}
        />

        {/* Page header */}
        <div style={{ background: "#fff", borderBottom: `1px solid ${T.borderLight}`, padding: "13px 28px" }}>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: "1.15rem", color: T.textDark, margin: 0 }}>
            {current.title}
          </h1>
          <p style={{ fontSize: 12, color: T.textMuted, marginTop: 3, fontWeight: 300, margin: "3px 0 0" }}>
            {current.subtitle}
          </p>
        </div>

        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 110px)" }} key={active}>
          {current.component}
        </div>

        {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} user={user} />}
      </div>
    </CalCtx.Provider>
  );
}