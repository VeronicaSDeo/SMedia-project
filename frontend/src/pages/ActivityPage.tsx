// ── pages/ActivityPage.tsx ────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { T, PLATFORMS, Ic } from "../utils/constants";

const API = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

const ACTION_LABELS: Record<string, string> = {
  published: "Published on",
  scheduled: "Scheduled on",
  draft:     "Draft saved for",
  failed:    "Failed to post on",
};

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  published: { color: "#059669", bg: "#ECFDF5" },
  scheduled: { color: "#7C6FCD", bg: "#F5F3FF" },
  draft:     { color: "#6B7280", bg: "#F3F4F6" },
  failed:    { color: "#DC2626", bg: "#FEF2F2" },
};

export default function ActivityPage() {
  const [posts,   setPosts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState("All");

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("smedia_token") || "";
        if (!token) { setError("Not logged in."); setLoading(false); return; }

        const res  = await fetch(`${API}/api/posts?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to fetch activity.");
        setPosts(data.posts || []);
      } catch (e: any) {
        setError(e.message || "Failed to load activity.");
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const filtered = filter === "All"
    ? posts
    : posts.filter(p => p.status === filter.toLowerCase());

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 22, color: "#1E1B4B", letterSpacing: -.3 }}>Activity</div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Your recent post activity across all platforms</div>
      </div>

      <div className="fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "20px" }}>

        {/* Filter tabs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 15, color: "#1E1B4B" }}>
            Activity Log
            {!loading && <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 400, marginLeft: 8 }}>({filtered.length} entries)</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Published", "Scheduled", "Draft", "Failed"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${f === filter ? T.primary : "#DDD6FE"}`, background: f === filter ? T.primary : "#fff", color: f === filter ? "#fff" : "#6B7280", fontSize: 11.5, fontWeight: f === filter ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all .16s" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
            <div style={{ fontSize: 13 }}>Loading activity…</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#991B1B" }}>
            ✕ {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 300 }}>
              {filter === "All"
                ? "No activity yet. Start by generating a post or scheduling content."
                : `No ${filter.toLowerCase()} posts yet.`}
            </div>
          </div>
        )}

        {/* Activity list */}
        {!loading && !error && filtered.map((post, i) => {
          const pl     = PLATFORMS.find((p: any) => p.key === post.platform) || PLATFORMS[0];
          const status = post.status || "draft";
          const sc     = STATUS_COLOR[status] || STATUS_COLOR.draft;
          const action = ACTION_LABELS[status] || "Activity on";
          const text   = post.caption || post.topic || "Untitled post";
          const date   = post.postedAt || post.scheduledAt || post.updatedAt || post.createdAt;

          return (
            <div key={post._id || i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>

              {/* Platform icon */}
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${(pl as any).color}15`, color: (pl as any).color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${(pl as any).color}22` }}>
                {(pl as any).icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: "#1E1B4B", fontWeight: 500, lineHeight: 1.5 }}>
                  <span style={{ color: "#6B7280" }}>{action}</span>{" "}
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{(pl as any).label}</span>
                  {" — "}
                  <span style={{ color: "#374151" }}>"{text.slice(0, 60)}{text.length > 60 ? "…" : ""}"</span>
                </div>

                <div style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {Ic.clock} {formatDate(date)}
                  </span>
                  {post.hashtags?.length > 0 && (
                    <span>{post.hashtags.slice(0, 3).join(" ")}{post.hashtags.length > 3 ? ` +${post.hashtags.length - 3}` : ""}</span>
                  )}
                  {post.mediaUrl && !post.mediaUrl.startsWith("data:") && (
                    <span style={{ color: "#7C6FCD" }}>📎 Media attached</span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <span style={{ fontSize: 10.5, fontWeight: 700, color: sc.color, background: sc.bg, padding: "3px 10px", borderRadius: 20, flexShrink: 0, textTransform: "uppercase", letterSpacing: .3 }}>
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}