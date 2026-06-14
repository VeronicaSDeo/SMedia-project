import { useState, useContext, useEffect, useRef } from "react";
import { T, PLATFORMS, CAL_STATUS, CalCtx, ConfirmDialog } from "../utils/constants";

// FIX: use the correct token key matching constants.tsx / apiFetch
const API   = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "smedia_token"; // ← was "token" (wrong), caused silent API failures

// ── Schedule Modal ────────────────────────────────────────────────────────────
function ScheduleModal({ day, month, year, onSave, onClose }: {
  day: number; month: number; year: number;
  onSave: (data: any) => void; onClose: () => void;
}) {
  const [text,     setText]     = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [time,     setTime]     = useState("09:00");
  const [status,   setStatus]   = useState("scheduled");
  const [confirm,  setConfirm]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState<string | null>(null);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: `1px solid ${T.border}`, background: T.bg,
    fontSize: 13, color: T.textDark, fontFamily: "inherit",
  };

  const handleConfirmedSave = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      // FIX: use "smedia_token" not "token"
      const token = localStorage.getItem(TOKEN_KEY);

      // 1️⃣  Create the post in DB → get back _id
      const createRes = await fetch(`${API}/api/posts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ platform, topic: text, caption: text, status: "draft" }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create post");
      const postId = createData.post._id;

      // 2️⃣  Schedule it
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledAt = new Date(year, month, day, hours, minutes).toISOString();

      const schedRes = await fetch(`${API}/api/posts/${postId}/schedule`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ scheduledAt, platform }),
      });
      const schedData = await schedRes.json();
      if (!schedRes.ok) throw new Error(schedData.error || "Failed to schedule post");

      // 3️⃣  Add to calendar — always pass month & year so filter works correctly
      onSave({ platform, text, time, status, day, month, year, postId });
      setConfirm(false);
      onClose();
    } catch (err: any) {
      setSaveErr(err.message || "Something went wrong");
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-box" style={{ background: "#fff", borderRadius: 16, padding: "24px 26px", width: 400, maxWidth: "92vw", border: `1px solid ${T.borderLight}`, boxShadow: "0 20px 60px rgba(22,20,43,.18)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 15, color: T.textDark }}>
              Schedule for {monthNames[month]} {day}, {year}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.textMuted, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ marginBottom: 13 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Content</label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="What's this post about?"
              className="generate-input"
              style={{ ...fieldStyle, height: 80, resize: "none", lineHeight: 1.55 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Platform</label>
              <div style={{ position: "relative" }}>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="generate-input" style={fieldStyle}>
                  {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: T.textMuted }}>▾</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="generate-input" style={fieldStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["scheduled", "draft"] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${status === s ? CAL_STATUS[s].color : T.border}`, background: status === s ? CAL_STATUS[s].bg : "#fff", color: status === s ? CAL_STATUS[s].color : T.textMuted, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                  {CAL_STATUS[s].label}
                </button>
              ))}
            </div>
          </div>

          {saveErr && (
            <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 500 }}>
              ⚠️ {saveErr}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { if (text.trim()) setConfirm(true); }}
              disabled={!text.trim() || saving}
              style={{ flex: 1, padding: "11px", borderRadius: 10, background: text.trim() ? T.primary : "#ccc", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: text.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              {saving ? "Scheduling…" : "Schedule Post"}
            </button>
            <button onClick={onClose} disabled={saving}
              style={{ padding: "11px 14px", borderRadius: 10, background: "none", border: `1px solid ${T.border}`, color: T.textBody, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Confirm Scheduling"
          message={`Schedule "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}" on ${PLATFORMS.find(p => p.key === platform)?.label} at ${time} on ${monthNames[month]} ${day}?`}
          confirmLabel="Yes, Schedule It"
          onConfirm={handleConfirmedSave}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ ev, onDragStart, onDelete, onPublish }: {
  ev: any;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDelete:    (id: number) => void;
  onPublish:   (id: number) => void;
}) {
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const pl = PLATFORMS.find(p => p.key === ev.platform) || PLATFORMS[0];
  const st = CAL_STATUS[ev.status] || CAL_STATUS.scheduled;

  return (
    <>
      <div draggable onDragStart={e => onDragStart(e, ev.id)}
        style={{ background: "#fff", borderRadius: 7, padding: "6px 8px", marginBottom: 4, border: `1px solid ${pl.color}28`, cursor: "grab", borderLeft: `3px solid ${pl.color}`, userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
          <span style={{ color: pl.color, display: "flex", flexShrink: 0 }}>{pl.icon}</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: pl.color }}>{pl.label}</span>
          <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: st.color, background: st.bg, padding: "1px 5px", borderRadius: 8, whiteSpace: "nowrap" }}>{st.label}</span>
        </div>

        {ev.imageUrl && (
          <img src={ev.imageUrl} alt="" style={{ width: "100%", height: 48, objectFit: "cover", borderRadius: 5, marginBottom: 4 }} />
        )}

        <div style={{ fontSize: 11, color: T.textDark, fontWeight: 500, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{ev.text}</div>
        <div style={{ fontSize: 9.5, color: T.textMuted, marginTop: 3 }}>{ev.time}</div>

        <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
          {ev.status !== "draft" && (
            <button onClick={e => { e.stopPropagation(); setPublishConfirm(true); }}
              style={{ flex: 1, padding: "3px 0", borderRadius: 5, background: "#EEF2FF", color: "#4F46E5", border: "none", fontSize: 9.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🚀 Publish</button>
          )}
          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
            style={{ padding: "3px 6px", borderRadius: 5, background: "#FEF2F2", color: "#DC2626", border: "none", fontSize: 9.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
        </div>
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete this post?"
          message={`Permanently delete "${ev.text.slice(0, 60)}${ev.text.length > 60 ? "…" : ""}"? This cannot be undone.`}
          confirmLabel="Yes, Delete"
          onConfirm={() => { onDelete(ev.id); setDeleteConfirm(false); }}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}

      {publishConfirm && (
        <ConfirmDialog
          title="Publish this post?"
          message={`Publish "${ev.text.slice(0, 60)}${ev.text.length > 60 ? "…" : ""}" on ${PLATFORMS.find(p => p.key === ev.platform)?.label}? It will be removed from the calendar once published.`}
          confirmLabel="Yes, Publish Now"
          onConfirm={() => { onPublish(ev.id); setPublishConfirm(false); }}
          onCancel={() => setPublishConfirm(false)}
        />
      )}
    </>
  );
}

// ── Content Calendar ──────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const calCtx = useContext(CalCtx);
  if (!calCtx) return null;
  const { events, addEvent, updateEvent, removeEvent } = calCtx;

  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view,  setView]  = useState<"month" | "week">("month");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [schedModal,     setSchedModal]     = useState<{ day: number } | null>(null);
  const [dragId,         setDragId]         = useState<number | null>(null);
  const [dragOver,       setDragOver]       = useState<number | null>(null);
  const [toast,          setToast]          = useState<string | null>(null);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstDay       = new Date(year, month, 1).getDay();
  const today          = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // ── Auto-remove posts that n8n has published ─────────────────────────────
  const seenPublished = useRef<Set<string>>(new Set());
  const eventsRef     = useRef(events);
  const removeRef     = useRef(removeEvent);
  const toastRef      = useRef(showToast);

  useEffect(() => { eventsRef.current = events; },       [events]);
  useEffect(() => { removeRef.current = removeEvent; },  [removeEvent]);
  useEffect(() => { toastRef.current  = showToast; });

  useEffect(() => {
    // FIX: use correct token key
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `${API}/api/posts?status=published`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const { posts } = await res.json();

        posts.forEach((post: any) => {
          if (seenPublished.current.has(post._id)) return;

          const currentEvents = eventsRef.current;

          let match = currentEvents.find(ev => (ev as any).postId === post._id);

          if (!match && post.scheduledAt) {
            const postDate = new Date(post.scheduledAt);
            match = currentEvents.find(ev =>
              ev.platform === post.platform &&
              (ev.year  ?? now.getFullYear()) === postDate.getFullYear() &&
              (ev.month ?? now.getMonth())    === postDate.getMonth() &&
              ev.day                          === postDate.getDate()
            );
          }

          if (match) {
            seenPublished.current.add(post._id);
            removeRef.current(match.id);
            toastRef.current(`🚀 "${post.caption?.slice(0, 40) || "Post"}" published & removed from calendar`);
          }
        });
      } catch {
        // silently ignore network errors
      }
    };

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const monthEvents = events.filter(ev =>
    (ev.month ?? now.getMonth())    === month &&
    (ev.year  ?? now.getFullYear()) === year
  );

  const getEventsForDay = (day: number) =>
    monthEvents.filter(ev =>
      ev.day === day &&
      (filterPlatform === "all" || ev.platform === filterPlatform) &&
      (filterStatus   === "all" || ev.status   === filterStatus)
    );

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    if (!dragId) return;
    updateEvent(dragId, { day });
    setDragId(null); setDragOver(null);
    showToast(`Post rescheduled to ${monthNames[month]} ${day}`);
  };

  const handleDelete  = (id: number) => { removeEvent(id); showToast("Post deleted"); };
  const handlePublish = (id: number) => { removeEvent(id); showToast("🚀 Post published & removed from calendar ✓"); };

  // FIX: pass month & year explicitly so they're always stored on the event
  const handleScheduleSave = (data: any) => {
    addEvent({
      day:      data.day,
      month:    data.month  ?? month,
      year:     data.year   ?? year,
      platform: data.platform,
      text:     data.text,
      time:     data.time,
      status:   data.status,
      ...(data.postId ? { postId: data.postId } : {}),
    } as any);
    showToast(`Scheduled for ${monthNames[month]} ${data.day} ✓`);
  };

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1;
    return (d >= 1 && d <= daysInMonth) ? d : null;
  });

  const getWeekDays = () => {
    const dow   = new Date(year, month, today).getDay();
    const start = today - dow;
    return Array.from({ length: 7 }, (_, i) => {
      const d = start + i;
      return (d > 0 && d <= daysInMonth) ? d : null;
    });
  };
  const weekDays = getWeekDays();

  const selectStyle: React.CSSProperties = {
    padding: "7px 28px 7px 10px", borderRadius: 8,
    border: `1px solid ${T.border}`, background: "#fff",
    fontSize: 12, color: T.textBody,
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    cursor: "pointer", appearance: "none",
  };

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, background: T.navBg, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, animation: "fadeUp .3s ease", boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.textBody, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>← Prev</button>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 16, color: T.textDark, minWidth: 150, textAlign: "center" }}>{monthNames[month]} {year}</div>
          <button onClick={nextMonth} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.textBody, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Next →</button>
        </div>

        <div style={{ display: "flex", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
          {(["month", "week"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "7px 16px", background: view === v ? T.primary : "transparent", color: view === v ? "#fff" : T.textBody, border: "none", fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={selectStyle}>
            <option value="all">All Channels</option>
            {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: T.textMuted }}>▾</span>
        </div>

        <div style={{ position: "relative" }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="draft">Draft</option>
          </select>
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: T.textMuted }}>▾</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          {Object.entries(CAL_STATUS).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: v.color }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: v.color }} />{v.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: T.bg, borderBottom: `1px solid ${T.borderLight}` }}>
            {dayNames.map(d => (
              <div key={d} style={{ padding: "10px 8px", textAlign: "center", fontSize: 10.5, fontWeight: 700, color: T.textMuted, letterSpacing: .6, textTransform: "uppercase" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {cells.map((day, i) => {
              const isToday_     = isCurrentMonth && day === today;
              const evs          = day ? getEventsForDay(day) : [];
              const isDragTarget = dragOver === day;
              return (
                <div key={i}
                  onDragOver={e => { e.preventDefault(); if (day) setDragOver(day); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { if (day) handleDrop(e, day); }}
                  style={{ minHeight: 96, padding: "6px", borderRight: i % 7 !== 6 ? `1px solid ${T.borderLight}` : "none", borderBottom: i < cells.length - 7 ? `1px solid ${T.borderLight}` : "none", background: !day ? T.bg : isDragTarget ? "#F0EDFF" : "#fff", transition: "background .15s" }}>
                  {day && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: isToday_ ? T.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 11.5, fontWeight: isToday_ ? 700 : 400, color: isToday_ ? "#fff" : T.textDark }}>{day}</span>
                        </div>
                        <button onClick={() => setSchedModal({ day })}
                          style={{ width: 16, height: 16, borderRadius: "50%", background: "transparent", border: `1px dashed ${T.border}`, color: T.textMuted, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1, fontFamily: "inherit" }}>+</button>
                      </div>
                      {evs.slice(0, 3).map(ev => (
                        <EventCard key={ev.id} ev={ev} onDragStart={handleDragStart} onDelete={handleDelete} onPublish={handlePublish} />
                      ))}
                      {evs.length > 3 && <div style={{ fontSize: 9.5, color: T.primary, fontWeight: 600, textAlign: "center" }}>+{evs.length - 3} more</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === "week" && (
        <div style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: T.bg, borderBottom: `1px solid ${T.borderLight}` }}>
            {weekDays.map((day, i) => {
              const isToday_ = isCurrentMonth && day === today;
              return (
                <div key={i} style={{ padding: "12px 8px", textAlign: "center", borderRight: i < 6 ? `1px solid ${T.borderLight}` : "none" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, letterSpacing: .5, textTransform: "uppercase" }}>{dayNames[i]}</div>
                  {day && (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: isToday_ ? T.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 0" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isToday_ ? "#fff" : T.textDark }}>{day}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", minHeight: 280 }}>
            {weekDays.map((day, i) => {
              const evs          = day ? getEventsForDay(day) : [];
              const isDragTarget = dragOver === day;
              return (
                <div key={i}
                  onDragOver={e => { e.preventDefault(); if (day) setDragOver(day); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { if (day) handleDrop(e, day); }}
                  style={{ padding: "8px 6px", borderRight: i < 6 ? `1px solid ${T.borderLight}` : "none", background: isDragTarget ? "#F0EDFF" : "#fff", transition: "background .15s" }}>
                  {day && (
                    <>
                      <button onClick={() => setSchedModal({ day })}
                        style={{ width: "100%", padding: "5px", borderRadius: 7, background: T.bg, border: `1px dashed ${T.border}`, color: T.textMuted, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginBottom: 6 }}>+ Add</button>
                      {evs.map(ev => (
                        <EventCard key={ev.id} ev={ev} onDragStart={handleDragStart} onDelete={handleDelete} onPublish={handlePublish} />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 12 }}>
        <div style={{ fontSize: 13, color: T.textMuted }}>
          <span style={{ fontWeight: 700, color: T.textDark }}>{monthEvents.filter(e => e.status !== "draft").length}</span> posts scheduled ·{" "}
          <span style={{ fontWeight: 500 }}>{monthEvents.filter(e => e.status === "draft").length}</span> drafts
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setSchedModal({ day: today })}
            style={{ padding: "8px 16px", borderRadius: 8, background: T.primary, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            📅 Schedule New Post
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11.5, color: T.textMuted, textAlign: "center", fontWeight: 300 }}>
        💡 Drag posts between days to reschedule · Click <strong style={{ color: T.textBody, fontWeight: 500 }}>+</strong> on any day to add a post · Click <strong style={{ color: T.textBody, fontWeight: 500 }}>🚀 Publish</strong> to publish & remove from calendar
      </div>

      {schedModal && (
        <ScheduleModal
          day={schedModal.day}
          month={month}
          year={year}
          onSave={handleScheduleSave}
          onClose={() => setSchedModal(null)}
        />
      )}
    </div>
  );
}