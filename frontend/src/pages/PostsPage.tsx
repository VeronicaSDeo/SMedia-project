// ── pages/PostsPage.tsx ───────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { T, PLATFORMS, Ic, ConfirmDialog } from "../utils/constants";

const API = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

export default function PostsPage() {
  const [filter,  setFilter]  = useState("All");
  const [posts,   setPosts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("smedia_token") || "";
      if (!token) { setError("Not logged in."); setLoading(false); return; }
      const res  = await fetch(`${API}/api/posts?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to fetch posts.");
      setPosts(data.posts || []);
    } catch (e: any) {
      setError(e.message || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("smedia_token") || "";
      const res = await fetch(`${API}/api/posts/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete post.");
      setPosts(prev => prev.filter(p => p._id !== deleteId));
      showToast("Post deleted successfully");
    } catch (e: any) {
      showToast(`❌ ${e.message || "Delete failed"}`);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const sColor: Record<string, string> = {
    published: T.success, scheduled: T.primary, draft: T.textMuted, failed: "#DC2626",
  };
  const sBg: Record<string, string> = {
    published: "#E8F8F1", scheduled: "#EEEDF9", draft: "#F3F4F6", failed: "#FEF2F2",
  };

  const filtered = filter === "All"
    ? posts
    : posts.filter(p => p.status === filter.toLowerCase());

  const postToDelete = posts.find(p => p._id === deleteId);
  const deletePreview = postToDelete
    ? (postToDelete.caption || postToDelete.topic || "this post").slice(0, 60)
    : "";

  return (
    <div style={{ padding: "24px 28px" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, background: T.navBg, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
          {toast}
        </div>
      )}

      <div className="fade-up" style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 15, color: T.textDark }}>
            My Posts {!loading && <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>({posts.length} total)</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Published", "Scheduled", "Draft"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${f === filter ? T.primary : T.border}`, background: f === filter ? T.primary : "#fff", color: f === filter ? "#fff" : "#6B7280", fontSize: 12, fontWeight: f === filter ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all .16s" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.textMuted }}>
            <div style={{ fontSize: 13 }}>Loading posts…</div>
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#991B1B", marginBottom: 14 }}>
            ✕ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "#1E1B4B", marginBottom: 6 }}>No posts yet</div>
            <div style={{ fontSize: 12.5, fontWeight: 300 }}>
              Posts published or scheduled via the{" "}
              <span style={{ color: T.primary, fontWeight: 600 }}>AI Generate</span> tab will appear here.
            </div>
          </div>
        )}

        {!loading && filtered.map((p, i) => {
          const pl = PLATFORMS.find((x: any) => x.key === p.platform) || PLATFORMS[0];
          const displayText = p.caption || p.topic || "Untitled post";
          const dateStr = p.scheduledAt
            ? new Date(p.scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
            : p.postedAt
            ? new Date(p.postedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
            : new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <div key={p._id || i}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px", borderRadius: 10, border: `1px solid ${T.borderLight}`, marginBottom: 8, transition: "all .16s" }}>

              {/* Platform icon */}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: (pl as any).bg || "#F5F3FF", color: (pl as any).color || T.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {(pl as any).icon}
              </div>

              {/* Thumbnail */}
              {p.mediaUrl && !p.mediaUrl.startsWith("data:") && (
                <img src={p.mediaUrl} alt="media" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${T.borderLight}` }} />
              )}

              {/* Text */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13.5, color: "#1E1B4B", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {displayText.slice(0, 80)}{displayText.length > 80 ? "…" : ""}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{p.platform}</span>
                  <span>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>{Ic.clock} {dateStr}</span>
                  {p.hashtags?.length > 0 && (
                    <><span>·</span><span>{p.hashtags.length} hashtags</span></>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <span style={{ fontSize: 11, fontWeight: 600, color: sColor[p.status] || T.textMuted, background: sBg[p.status] || "#F3F4F6", padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>
                {p.status || "draft"}
              </span>

              {/* Delete button */}
              <button
                onClick={() => setDeleteId(p._id)}
                title="Delete post"
                style={{ width: 30, height: 30, borderRadius: 7, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#DC2626"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2"; (e.currentTarget as HTMLButtonElement).style.color = "#DC2626"; }}
              >
                {Ic.trash}
              </button>
            </div>
          );
        })}
      </div>

      {/* Delete confirm dialog */}
      {deleteId && (
        <ConfirmDialog
          title="Delete this post?"
          message={`Permanently delete "${deletePreview}${deletePreview.length >= 60 ? "…" : ""}"? This cannot be undone.`}
          confirmLabel={deleting ? "Deleting…" : "Yes, Delete"}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}