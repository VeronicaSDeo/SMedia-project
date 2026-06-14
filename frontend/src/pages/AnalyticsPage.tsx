// ── pages/AnalyticsPage.tsx ───────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { T, Ic } from "../utils/constants";

const API = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

export default function AnalyticsPage({ user }: { user: any }) {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("smedia_token") || "";
        if (!token) return;

        // Fetch all posts to compute real stats
        const res  = await fetch(`${API}/api/posts?limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) return;

        const posts: any[] = data.posts || [];
        const published  = posts.filter(p => p.status === "published").length;
        const scheduled  = posts.filter(p => p.status === "scheduled").length;
        const draft      = posts.filter(p => p.status === "draft").length;
        const total      = posts.length;
        const connected  = (user?.connectedAccounts || []).length;

        // Platform breakdown
        const byPlatform: Record<string, number> = {};
        posts.forEach(p => {
          byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1;
        });

        // Posts this week
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = posts.filter(p => new Date(p.createdAt) > weekAgo).length;

        setStats({ published, scheduled, draft, total, connected, byPlatform, thisWeek });
      } catch (e) {
        console.warn("Analytics fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const cards = [
    { label: "Posts Published",    value: stats?.published  ?? null, color: T.success,  bg: "#E8F8F1", icon: "✓" },
    { label: "Posts Scheduled",    value: stats?.scheduled  ?? null, color: T.primary,  bg: "#EEEDF9", icon: "🗓" },
    { label: "Drafts",             value: stats?.draft      ?? null, color: "#6B7280",  bg: "#F3F4F6", icon: "📝" },
    { label: "Platforms Connected",value: stats?.connected  ?? null, color: "#E1306C",  bg: "#FFF0F6", icon: "🔗" },
  ];

  const platformColors: Record<string, string> = {
    linkedin: "#0A66C2", instagram: "#E1306C", youtube: "#FF0000",
    twitter: "#111111", facebook: "#1877F2",
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 22, color: "#1E1B4B", letterSpacing: -.3 }}>Analytics</div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Track performance across all your platforms</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map((d, i) => (
          <div key={i} className="stat-card fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * .08}s` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: d.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 18 }}>
              {d.icon}
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "1.8rem", color: d.color, letterSpacing: -0.5 }}>
              {loading
                ? <span style={{ color: T.textMuted, fontSize: "1.2rem" }}>…</span>
                : d.value !== null ? d.value : <span style={{ color: T.textMuted, fontSize: "1.2rem" }}>—</span>
              }
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, fontWeight: 400 }}>{d.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Platform breakdown */}
        <div className="fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "20px" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: "#1E1B4B", marginBottom: 16 }}>Posts by Platform</div>
          {loading ? (
            <div style={{ color: T.textMuted, fontSize: 13 }}>Loading…</div>
          ) : stats?.total === 0 ? (
            <div style={{ color: T.textMuted, fontSize: 13 }}>No posts yet — generate your first post!</div>
          ) : (
            Object.entries(stats?.byPlatform || {}).map(([platform, count]: [string, any]) => (
              <div key={platform} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1E1B4B", textTransform: "capitalize" }}>{platform}</span>
                  <span style={{ fontSize: 12, color: T.textMuted }}>{count} posts</span>
                </div>
                <div style={{ height: 6, background: "#F3F4F6", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((count / stats.total) * 100)}%`, background: platformColors[platform] || T.primary, borderRadius: 10, transition: "width .4s ease" }}/>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "20px" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14, color: "#1E1B4B", marginBottom: 16 }}>Summary</div>
          {[
            { label: "Total posts created",  value: stats?.total    },
            { label: "Posts this week",       value: stats?.thisWeek },
            { label: "Platforms connected",   value: stats?.connected},
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${T.borderLight}` : "none" }}>
              <span style={{ fontSize: 13, color: "#6B7280" }}>{row.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1E1B4B" }}>
                {loading ? "…" : row.value ?? "—"}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 16, padding: "12px", borderRadius: 10, background: "#F7F5FF", border: "1px solid #EEE9FF" }}>
            <div style={{ fontSize: 12, color: T.primary, fontWeight: 600, marginBottom: 4 }}>💡 Real social analytics</div>
            <div style={{ fontSize: 11.5, color: "#6B7280", lineHeight: 1.6 }}>
              LinkedIn impressions, Instagram reach, and engagement data will be available once the platform APIs are integrated.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}