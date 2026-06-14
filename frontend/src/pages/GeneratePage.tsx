// ── pages/GeneratePage.tsx ────────────────────────────────────────────────────
import { useState, useContext, useRef } from "react";
import { T, Ic, CalCtx, ConfirmDialog } from "../utils/constants";

const API                 = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";
const N8N_WEBHOOK         = "http://localhost:5678/webhook/generate-caption";
const N8N_PUBLISH_WEBHOOK = "http://localhost:5678/webhook/publish-post";
const UNSPLASH_ACCESS_KEY = (import.meta as any).env?.VITE_UNSPLASH_KEY || "";

const ACTIVE_PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "linkedin",  label: "LinkedIn"  },
  { key: "youtube",   label: "YouTube"   },
];

const STATS_KEY = "smedia_user_stats";
function loadStats() { try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}"); } catch { return {}; } }
function bumpStat(key: string, amount = 1) {
  const s = loadStats(); s[key] = (s[key] || 0) + amount;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

const IMAGE_STYLES = [
  { key: "photorealistic", label: "Photorealistic" },
  { key: "illustration",   label: "Illustration"   },
  { key: "minimalist",     label: "Minimalist"     },
  { key: "cinematic",      label: "Cinematic"      },
  { key: "flat design",    label: "Flat Design"    },
  { key: "3d render",      label: "3D Render"      },
];

const KLING_DURATIONS     = [{ v: 5, l: "5s" }, { v: 10, l: "10s" }, { v: 15, l: "15s" }, { v: 30, l: "30s" }];
const KLING_ASPECT_RATIOS = [{ v: "16:9", l: "16:9" }, { v: "9:16", l: "9:16" }, { v: "1:1", l: "1:1" }];

type SourceTab = "ai" | "upload";

const UPLOAD_TYPES = [
  { key: "both",     label: "Caption + Hashtags" },
  { key: "caption",  label: "Caption Only"       },
  { key: "hashtags", label: "Hashtags Only"      },
];

async function generateKlingVideo(prompt: string, duration: number, aspectRatio: string): Promise<string> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token) throw new Error("Not logged in — please refresh and try again");
  const res = await fetch(`${API}/api/content/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt, duration, aspectRatio }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || `Video generation failed (${res.status})`);
  return data.videoUrl;
}

function parseN8nResponse(data: any): { caption: string; hashtags: string[] } {
  const d = Array.isArray(data) ? data[0] : data;
  if (d?.caption !== undefined || d?.hashtags !== undefined)
    return { caption: d.caption || "", hashtags: Array.isArray(d.hashtags) ? d.hashtags : [] };
  const raw: string = d?.text || d?.output || d?.content || "";
  const lines = raw.split("\n");
  return {
    caption:  lines.filter((l: string) => !l.trim().startsWith("#")).join("\n").trim(),
    hashtags: lines.filter((l: string) => l.trim().startsWith("#")).join(" ").match(/#\w+/g) || [],
  };
}

async function fetchUnsplashImage(prompt: string, style: string): Promise<string> {
  const styleMap: Record<string, string> = {
    photorealistic: "", illustration: "illustration art", minimalist: "minimal clean",
    cinematic: "cinematic dramatic", "flat design": "flat design graphic", "3d render": "3d render product",
  };
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(`${prompt} ${styleMap[style] || ""}`.trim())}&orientation=squarish&content_filter=high`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  if (!res.ok) throw new Error(`Unsplash error ${res.status}`);
  const data = await res.json();
  if (!data?.urls?.regular) throw new Error("No image found — try a different keyword");
  return data.urls.regular;
}

async function saveGeneratedContent(payload: {
  topic: string; platform: string; tone: string;
  caption: string; hashtags: string[];
}): Promise<void> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/content/save`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) console.warn("generatedcontents save failed:", data.error);
    else console.log("✅ Saved to generatedcontents:", data.content?._id);
  } catch (e) { console.warn("generatedcontents save error:", e); }
}

async function savePost(payload: {
  platform: string; topic: string; caption: string; hashtags: string[];
  mediaUrl?: string; mediaType?: string; tone: string; contentType: string;
}): Promise<string | null> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token) return null;
  try {
    const res = await fetch(`${API}/api/posts`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    return data?.post?._id || null;
  } catch (e) { console.warn("Failed to save post:", e); return null; }
}

async function uploadFileAndGenerate(
  file: File, caption: string, hashtags: string[],
  platform: string, topic: string, tone: string,
): Promise<{ mediaUrl: string; postId: string | null }> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token) throw new Error("Not logged in.");
  const form = new FormData();
  form.append("file", file);
  form.append("caption",  caption);
  form.append("hashtags", JSON.stringify(hashtags));
  form.append("platform", platform);
  form.append("topic",    topic);
  form.append("tone",     tone);
  const res = await fetch(`${API}/api/posts/upload`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    console.error("Non-JSON upload response:", text.slice(0, 200));
    throw new Error(`Upload failed — server returned ${res.status}. Is the backend running?`);
  }
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Upload failed.");
  return { mediaUrl: data.post.mediaUrl, postId: data.post._id || null };
}

async function schedulePost(postId: string, scheduledAt: string): Promise<boolean> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token || !postId) return false;
  try {
    const res = await fetch(`${API}/api/posts/${postId}/schedule`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ scheduledAt }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Publish Now via n8n ───────────────────────────────────────────────────────
async function publishPostNow(payload: {
  postId: string | null; platform: string;
  caption: string; hashtags: string[]; mediaUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const token = localStorage.getItem("smedia_token") || "";
  if (!token) return { success: false, error: "Not logged in" };
  try {
    // Update post status in DB
    if (payload.postId) {
      await fetch(`${API}/api/posts/${payload.postId}/publish`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: "published" }),
      }).catch(() => {}); // non-blocking
    }
    // Trigger n8n publish workflow
    const res = await fetch(N8N_PUBLISH_WEBHOOK, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        platform:  payload.platform,
        caption:   payload.caption,
        hashtags:  payload.hashtags,
        mediaUrl:  payload.mediaUrl || "",
        postId:    payload.postId   || "",
        userToken: token,
      }),
    });
    if (!res.ok) throw new Error(`n8n publish failed (${res.status}) — make sure the publish-post workflow is active in n8n`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Inline styles ─────────────────────────────────────────────────────────────
const css = `
  .gp-tab { transition: all .18s ease; cursor: pointer; }
  .gp-tab:hover { opacity: .85; }
  .gp-tab.active { background: #fff !important; color: #1E1B4B !important; box-shadow: 0 1px 6px rgba(0,0,0,.10); }
  .gp-select { appearance: none; -webkit-appearance: none; cursor: pointer; }
  .gp-select:focus { outline: none; border-color: #7C6FCD; box-shadow: 0 0 0 3px rgba(124,111,205,.14); }
  .gp-input:focus { outline: none; border-color: #7C6FCD; box-shadow: 0 0 0 3px rgba(124,111,205,.14); }
  .gp-textarea:focus { outline: none; border-color: #7C6FCD; box-shadow: 0 0 0 3px rgba(124,111,205,.14); }
  .gp-btn-gen { transition: all .17s ease; }
  .gp-btn-gen:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,111,205,.35) !important; }
  .gp-btn-gen:active:not(:disabled) { transform: translateY(0); }
  .gp-btn-gen:disabled { opacity: .55; cursor: not-allowed; }
  .gp-chip { transition: all .15s; cursor: pointer; }
  .gp-chip:hover { opacity: .8; }
  .gp-drop:hover { border-color: #7C6FCD !important; background: #F7F5FF !important; }
  .gp-type-opt { transition: all .15s; cursor: pointer; }
  .gp-type-opt:hover { border-color: #7C6FCD !important; }
  @keyframes gp-spin { to { transform: rotate(360deg); } }
  @keyframes gp-fade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .gp-result { animation: gp-fade .3s ease; }
  .gp-dot-1, .gp-dot-2, .gp-dot-3 {
    display: inline-block; width: 6px; height: 6px; border-radius: 50%;
    background: #7C6FCD; margin: 0 2px;
    animation: gp-dot-bounce 1.2s ease-in-out infinite;
  }
  .gp-dot-2 { animation-delay: .2s; }
  .gp-dot-3 { animation-delay: .4s; }
  @keyframes gp-dot-bounce { 0%,80%,100%{transform:scale(.8);opacity:.6} 40%{transform:scale(1.2);opacity:1} }
`;

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, color: "#6B7280", letterSpacing: .4, textTransform: "uppercase", marginBottom: 6 }}>{children}</div>;
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>;
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} className="gp-select"
        style={{ width: "100%", padding: "10px 34px 10px 12px", borderRadius: 9, border: "1.5px solid #E5E0F8", background: "#FDFCFF", fontSize: 13, color: "#1E1B4B", fontFamily: "inherit" }}>
        {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#9CA3AF", pointerEvents: "none" }}>▾</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GeneratePage({ user }: { user: any }) {
  const calCtx   = useContext(CalCtx);
  const addEvent = calCtx?.addEvent;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceTab, setSourceTab] = useState<SourceTab>("ai");

  const [topic,    setTopic]    = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone,     setTone]     = useState(user?.tone || "exciting");

  const [aiType,           setAiType]           = useState("both");
  const [imageStyle,       setImageStyle]       = useState("photorealistic");
  const [klingDuration,    setKlingDuration]    = useState(5);
  const [klingAspectRatio, setKlingAspectRatio] = useState("16:9");

  const [uploadType,        setUploadType]        = useState("both");
  const [uploadedFile,      setUploadedFile]      = useState<File | null>(null);
  const [uploadedPreview,   setUploadedPreview]   = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<"image" | "video" | null>(null);
  const [uploadDragOver,    setUploadDragOver]    = useState(false);

  const [loading,     setLoading]     = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error,       setError]       = useState("");
  const [result, setResult] = useState<{
    caption: string | null; hashtags: string[]; imageUrl: string | null; videoUrl: string | null; postId: string | null;
  } | null>(null);
  const [copied,       setCopied]       = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedDate,    setSchedDate]    = useState("");
  const [schedTime,    setSchedTime]    = useState("09:00");
  const [scheduled,    setScheduled]    = useState<{ date: string; time: string } | null>(null);
  const [schedConfirm, setSchedConfirm] = useState(false);
  const [scheduling,   setScheduling]   = useState(false);
  const [savedToDb,    setSavedToDb]    = useState(false);

  // ── Publish Now state ─────────────────────────────────────────────────────
  const [publishing,     setPublishing]     = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError,   setPublishError]   = useState("");

  const tones = ["exciting", "professional", "casual", "funny", "inspirational", "urgent"];

  const isUpload   = sourceTab === "upload";
  const activeType = isUpload ? uploadType : aiType;

  const needsText    = ["caption", "hashtags", "both", "all", "videoall"].includes(activeType) || isUpload;
  const needsAiImage = !isUpload && ["image", "all"].includes(aiType);
  const needsVideo   = !isUpload && ["video", "videoall"].includes(aiType);

  const handleFileSelect = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { setError("Please upload an image or video file."); return; }
    setUploadedFile(file);
    setUploadedMediaType(isVideo ? "video" : "image");
    setUploadedPreview(URL.createObjectURL(file));
    setError("");
  };

  const clearUpload = () => {
    setUploadedFile(null); setUploadedPreview(null); setUploadedMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (isUpload && !uploadedFile) { setError("Please upload a file first."); return; }

    setLoading(true); setResult(null); setError("");
    setShowSchedule(false); setScheduled(null); setSavedToDb(false);
    setPublishSuccess(false); setPublishError("");

    try {
      let caption:  string        = "";
      let hashtags: string[]      = [];
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let postId:   string | null = null;

      // ── Step 1: n8n text generation ───────────────────────────────────────
      if (needsText) {
        setLoadingStep("text");
        const contentType = isUpload ? uploadType : aiType;
        const res = await fetch(N8N_WEBHOOK, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            topic,
            platform,
            tone,
            contentType,
            brandName: user?.brandName || "",
            industry:  user?.industry  || "",
          }),
        });
        if (!res.ok) {
          if (!res.headers.get("content-type")?.includes("application/json"))
            throw new Error(`n8n webhook not active — start the workflow in n8n first (got ${res.status})`);
          throw new Error(`n8n returned ${res.status}`);
        }
        const parsed = parseN8nResponse(await res.json());
        if (activeType !== "hashtags") caption  = parsed.caption;
        if (activeType !== "caption")  hashtags = parsed.hashtags;

        if (caption || hashtags.length) {
          setLoadingStep("saving");
          await saveGeneratedContent({ topic, platform, tone, caption, hashtags });
        }
      }

      // ── Step 2: upload file ───────────────────────────────────────────────
      if (isUpload && uploadedFile) {
        setLoadingStep("upload");
        const { mediaUrl: cloudUrl, postId: pid } = await uploadFileAndGenerate(uploadedFile, caption, hashtags, platform, topic, tone);
        imageUrl = cloudUrl;
        postId   = pid;
        setSavedToDb(true);
        bumpStat("uploadedPosts");
      }

      // ── Step 3: Kling video ───────────────────────────────────────────────
      if (needsVideo) {
        setLoadingStep("video");
        videoUrl = await generateKlingVideo(topic, klingDuration, klingAspectRatio);
        bumpStat("aiVideos");
      }

      // ── Step 4: Unsplash image ────────────────────────────────────────────
      if (needsAiImage) {
        setLoadingStep("image");
        imageUrl = await fetchUnsplashImage(topic, imageStyle);
      }

      // ── Step 5: save non-upload posts ─────────────────────────────────────
      if (!isUpload) {
        setLoadingStep("saving");
        postId = await savePost({
          platform, topic, caption, hashtags,
          mediaUrl:  imageUrl || videoUrl || undefined,
          mediaType: needsVideo ? "ai_video" : needsAiImage ? "ai_image" : "none",
          tone, contentType: aiType,
        });
        setSavedToDb(true);
      }

      setResult({ caption: caption || null, hashtags, imageUrl, videoUrl, postId });
      if (caption)         bumpStat("aiCaptions");
      if (hashtags.length) bumpStat("hashtagSets");
      bumpStat("totalPosts");

    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false); setLoadingStep("");
    }
  };

  // ── Publish Now ───────────────────────────────────────────────────────────
  const handlePublishNow = async () => {
    if (!result) return;
    setPublishing(true);
    setPublishError("");
    setPublishSuccess(false);

    const res = await publishPostNow({
      postId:   result.postId,
      platform,
      caption:  result.caption || "",
      hashtags: result.hashtags,
      mediaUrl: result.imageUrl || result.videoUrl || undefined,
    });

    if (res.success) {
      setPublishSuccess(true);
      bumpStat("publishedPosts");
    } else {
      setPublishError(res.error || "Publish failed — check that the publish-post n8n workflow is active");
    }
    setPublishing(false);
  };

  const handleCopy = () => {
    if (!result) return;
    const txt = [result.caption, result.hashtags?.join(" ")].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = async () => {
    if (!result?.imageUrl) return;
    try {
      const blob = await fetch(result.imageUrl).then(r => r.blob());
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a"); a.href = url; a.download = `smedia-${Date.now()}.jpg`; a.click();
      URL.revokeObjectURL(url);
    } catch { window.open(result.imageUrl, "_blank"); }
  };

  const handleConfirmSchedule = async () => {
    if (!schedDate || !addEvent) return;
    setScheduling(true);
    const d           = new Date(schedDate);
    const scheduledAt = new Date(`${schedDate}T${schedTime}`).toISOString();
    addEvent({ platform, text: result?.caption || topic, time: schedTime, status: "scheduled", day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), imageUrl: result?.imageUrl || result?.videoUrl || undefined } as any);
    if (result?.postId) await schedulePost(result.postId, scheduledAt);
    bumpStat("scheduledPosts");
    setScheduled({ date: schedDate, time: schedTime });
    setShowSchedule(false); setSchedConfirm(false); setScheduling(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 9,
    border: "1.5px solid #E5E0F8", background: "#FDFCFF",
    fontSize: 13, color: "#1E1B4B", fontFamily: "inherit",
    transition: "border-color .18s, box-shadow .18s",
  };

  const loadingMsg =
    loadingStep === "upload" ? "Uploading & saving to database…"   :
    loadingStep === "video"  ? "Kling AI is rendering your video…" :
    loadingStep === "text"   ? "Writing caption & hashtags…"       :
    loadingStep === "image"  ? "Finding the perfect image…"        :
    loadingStep === "saving" ? "Saving to database…"               :
    "Generating…";

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{css}</style>

      {schedConfirm && (
        <ConfirmDialog
          title="Schedule this post?"
          message={`"${(result?.caption || topic).slice(0, 60)}…" will be added to your calendar on ${new Date(`${schedDate}T${schedTime}`).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. n8n will auto-publish at that time.`}
          confirmLabel={scheduling ? "Scheduling…" : "Schedule"}
          onConfirm={handleConfirmSchedule}
          onCancel={() => setSchedConfirm(false)}
        />
      )}

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 22, color: "#1E1B4B", letterSpacing: -.3 }}>AI Generate</div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Create captions, hashtags & posts in seconds</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ══ LEFT: Input panel ══════════════════════════════════════════════ */}
        <div style={{ background: "#fff", border: "1.5px solid #EEE9FF", borderRadius: 16, overflow: "hidden" }}>

          {/* ── Source tabs ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#F7F5FF", padding: 5, gap: 4 }}>
            {([["ai", "✦ AI Generate"], ["upload", "↑ Upload Content"]] as [SourceTab, string][]).map(([key, label]) => (
              <button key={key} className={`gp-tab${sourceTab === key ? " active" : ""}`}
                onClick={() => setSourceTab(key)}
                style={{ padding: "9px 0", borderRadius: 8, border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: sourceTab === key ? "#1E1B4B" : "#9CA3AF", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px 22px 22px" }}>

            {/* ── AI tab ── */}
            {sourceTab === "ai" && (
              <>
                <FieldWrap>
                  <Label>What to generate</Label>
                  <SelectField value={aiType} onChange={setAiType}
                    options={[
                      { key: "both",     label: "Caption + Hashtags"         },
                      { key: "caption",  label: "Caption Only"               },
                      { key: "hashtags", label: "Hashtags Only"              },
                      { key: "image",    label: "Image + Caption + Hashtags" },
                      { key: "all",      label: "Image Only"                 },
                      { key: "video",    label: "AI Video Only (Kling)"      },
                      { key: "videoall", label: "Video + Caption + Hashtags" },
                    ]}
                  />
                </FieldWrap>

                <FieldWrap>
                  <Label>{needsVideo ? "Video description" : "Topic / Idea"}</Label>
                  <textarea value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder={needsVideo ? "e.g. Cinematic drone shot over a mountain lake at golden hour…" : "e.g. New product launch — wireless earbuds with 48hr battery life"}
                    className="gp-textarea"
                    style={{ ...inputStyle, height: 88, resize: "none", lineHeight: 1.65 }}
                  />
                </FieldWrap>

                {needsVideo && (
                  <FieldWrap>
                    <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "14px" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7C3AED", marginBottom: 10, letterSpacing: .3 }}>KLING AI SETTINGS</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <Label>Duration</Label>
                          <div style={{ display: "flex", gap: 5 }}>
                            {KLING_DURATIONS.map(d => (
                              <button key={d.v} onClick={() => setKlingDuration(d.v)} className="gp-chip"
                                style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1.5px solid ${klingDuration === d.v ? "#7C3AED" : "#E5E0F8"}`, background: klingDuration === d.v ? "#7C3AED15" : "#fff", color: klingDuration === d.v ? "#7C3AED" : "#6B7280", fontSize: 12, fontWeight: klingDuration === d.v ? 700 : 400, fontFamily: "inherit" }}>{d.l}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>Aspect ratio</Label>
                          <div style={{ display: "flex", gap: 5 }}>
                            {KLING_ASPECT_RATIOS.map(r => (
                              <button key={r.v} onClick={() => setKlingAspectRatio(r.v)} className="gp-chip"
                                style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1.5px solid ${klingAspectRatio === r.v ? "#7C3AED" : "#E5E0F8"}`, background: klingAspectRatio === r.v ? "#7C3AED15" : "#fff", color: klingAspectRatio === r.v ? "#7C3AED" : "#6B7280", fontSize: 12, fontWeight: klingAspectRatio === r.v ? 700 : 400, fontFamily: "inherit" }}>{r.l}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </FieldWrap>
                )}

                {needsAiImage && (
                  <FieldWrap>
                    <Label>Image style</Label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {IMAGE_STYLES.map(s => (
                        <button key={s.key} onClick={() => setImageStyle(s.key)} className="gp-chip"
                          style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${imageStyle === s.key ? "#059669" : "#E5E0F8"}`, background: imageStyle === s.key ? "#ECFDF5" : "#fff", color: imageStyle === s.key ? "#059669" : "#6B7280", fontSize: 12, fontWeight: imageStyle === s.key ? 600 : 400, fontFamily: "inherit" }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </FieldWrap>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                  <div>
                    <Label>Platform</Label>
                    <SelectField value={platform} onChange={setPlatform}
                      options={ACTIVE_PLATFORMS.map(p => ({ key: p.key, label: p.label }))} />
                  </div>
                  <div>
                    <Label>Tone</Label>
                    <SelectField value={tone} onChange={setTone}
                      options={tones.map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
                  </div>
                </div>

                <button className="gp-btn-gen" onClick={handleGenerate}
                  disabled={!topic.trim() || loading}
                  style={{ width: "100%", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg,#7C6FCD,#9B8FE0)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(124,111,205,.28)" }}>
                  {loading
                    ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "gp-spin .7s linear infinite" }}/>{loadingStep === "video" ? "Rendering video…" : "Generating…"}</>
                    : <>{needsVideo ? "✦ Generate Video" : "✦ Generate Post"}</>
                  }
                </button>
              </>
            )}

            {/* ── Upload tab ── */}
            {sourceTab === "upload" && (
              <>
                <FieldWrap>
                  <Label>Your image or video</Label>
                  {!uploadedFile ? (
                    <div
                      className="gp-drop"
                      onDragOver={e => { e.preventDefault(); setUploadDragOver(true); }}
                      onDragLeave={() => setUploadDragOver(false)}
                      onDrop={e => { e.preventDefault(); setUploadDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ border: `2px dashed ${uploadDragOver ? "#7C6FCD" : "#DDD6FE"}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", background: uploadDragOver ? "#F7F5FF" : "#FDFCFF", cursor: "pointer", transition: "all .18s" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>↑</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1E1B4B", marginBottom: 3 }}>Drop file here or click to browse</div>
                      <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>JPG, PNG, GIF, MP4, MOV — max 10 MB</div>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                    </div>
                  ) : (
                    <div style={{ border: "1.5px solid #DDD6FE", borderRadius: 12, overflow: "hidden" }}>
                      {uploadedMediaType === "image"
                        ? <img src={uploadedPreview!} alt="preview" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />
                        : <video src={uploadedPreview!} controls style={{ width: "100%", maxHeight: 180, display: "block", background: "#000" }} />}
                      <div style={{ padding: "8px 12px", background: "#F7F5FF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "72%" }}>{uploadedFile.name}</span>
                        <button onClick={clearUpload} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
                      </div>
                    </div>
                  )}
                </FieldWrap>

                <FieldWrap>
                  <Label>What to generate</Label>
                  <SelectField value={uploadType} onChange={setUploadType}
                    options={UPLOAD_TYPES.map(t => ({ key: t.key, label: t.label }))} />
                </FieldWrap>

                <FieldWrap>
                  <Label>Describe your post (for AI)</Label>
                  <textarea value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Sharing my latest GitHub project — a full-stack social media tool"
                    className="gp-textarea"
                    style={{ ...inputStyle, height: 72, resize: "none", lineHeight: 1.65 }}
                  />
                </FieldWrap>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                  <div>
                    <Label>Platform</Label>
                    <SelectField value={platform} onChange={setPlatform}
                      options={ACTIVE_PLATFORMS.map(p => ({ key: p.key, label: p.label }))} />
                  </div>
                  <div>
                    <Label>Tone</Label>
                    <SelectField value={tone} onChange={setTone}
                      options={tones.map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
                  </div>
                </div>

                <button className="gp-btn-gen" onClick={handleGenerate}
                  disabled={!topic.trim() || loading || !uploadedFile}
                  style={{ width: "100%", padding: "12px", borderRadius: 10, background: "linear-gradient(135deg,#0A66C2,#1D81D8)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(10,102,194,.28)" }}>
                  {loading
                    ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "gp-spin .7s linear infinite" }}/>{loadingStep === "upload" ? "Uploading…" : "Generating…"}</>
                    : "↑ Upload & Generate"
                  }
                </button>
              </>
            )}
          </div>
        </div>

        {/* ══ RIGHT: Result panel ════════════════════════════════════════════ */}
        <div style={{ background: "#fff", border: "1.5px solid #EEE9FF", borderRadius: 16, padding: "22px", minHeight: 420 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, color: "#1E1B4B" }}>Generated Post</div>
            {result && (result.caption || result.hashtags.length > 0) && (
              <button onClick={handleCopy}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1.5px solid #E5E0F8", background: copied ? "#ECFDF5" : "#fff", color: copied ? "#059669" : "#6B7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            )}
          </div>

          {error && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#991B1B", marginBottom: 14, lineHeight: 1.6 }}>
              ✕ {error}
            </div>
          )}

          {loading && (
            <div style={{ padding: "50px 0", textAlign: "center" }}>
              <div style={{ marginBottom: 14 }}>
                <span className="gp-dot-1"/><span className="gp-dot-2"/><span className="gp-dot-3"/>
              </div>
              <div style={{ fontSize: 13, color: "#9CA3AF" }}>{loadingMsg}</div>
            </div>
          )}

          {!loading && !result && !error && (
            <div style={{ padding: "50px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: .35 }}>✦</div>
              <div style={{ fontSize: 13, color: "#9CA3AF" }}>Your generated post will appear here</div>
              <div style={{ fontSize: 12, color: "#C4B5FD", marginTop: 5 }}>Fill in the form and click Generate</div>
            </div>
          )}

          {!loading && result && (
            <div className="gp-result">
              {savedToDb && (
                <div style={{ padding: "7px 11px", borderRadius: 8, background: "#ECFDF5", border: "1px solid #A7F3D0", fontSize: 11.5, color: "#059669", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  ✓ Saved to MongoDB · <span style={{ fontFamily: "monospace", fontWeight: 400 }}>{result.postId?.slice(-8) || "—"}</span>
                </div>
              )}

              {result.videoUrl && (
                <div style={{ marginBottom: 14, borderRadius: 12, overflow: "hidden", border: "1px solid #EEE9FF", position: "relative" }}>
                  <video src={result.videoUrl} controls style={{ width: "100%", display: "block", maxHeight: 240, background: "#000" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 10px", background: "rgba(0,0,0,.5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,.7)" }}>Kling AI</span>
                    <button onClick={() => { const a = document.createElement("a"); a.href = result.videoUrl!; a.download = `smedia-video-${Date.now()}.mp4`; a.click(); }}
                      style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Download</button>
                  </div>
                </div>
              )}

              {result.imageUrl && (
                <div style={{ marginBottom: 14, borderRadius: 12, overflow: "hidden", border: "1px solid #EEE9FF", position: "relative" }}>
                  <img src={result.imageUrl} alt="media" style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 10px", background: "rgba(0,0,0,.4)", borderRadius: "0 0 12px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,.7)" }}>
                      {isUpload ? "Your upload · saved to database" : "via Unsplash"}
                    </span>
                    {!isUpload && (
                      <button onClick={handleDownloadImage}
                        style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Download</button>
                    )}
                  </div>
                </div>
              )}

              {result.caption && (
                <div style={{ background: "#FDFCFF", borderRadius: 10, padding: "13px 15px", marginBottom: 12, fontSize: 13.5, color: "#1E1B4B", lineHeight: 1.75, whiteSpace: "pre-wrap", border: "1.5px solid #EEE9FF" }}>
                  {result.caption}
                </div>
              )}

              {result.hashtags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {result.hashtags.map(h => (
                    <span key={h} style={{ padding: "3px 10px", borderRadius: 20, background: "#F5F3FF", color: "#7C6FCD", fontSize: 12, fontWeight: 500 }}>{h}</span>
                  ))}
                </div>
              )}

              {scheduled && (
                <div style={{ padding: "9px 13px", borderRadius: 9, background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: 12, fontSize: 12.5, color: "#059669", fontWeight: 600 }}>
                  ✓ Scheduled for {new Date(`${scheduled.date}T${scheduled.time}`).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              )}

              {publishSuccess && (
                <div style={{ padding: "9px 13px", borderRadius: 9, background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: 12, fontSize: 12.5, color: "#059669", fontWeight: 600 }}>
                  ✓ Published to {platform.charAt(0).toUpperCase() + platform.slice(1)} successfully!
                </div>
              )}

              {publishError && (
                <div style={{ padding: "9px 13px", borderRadius: 9, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 12, fontSize: 12.5, color: "#991B1B" }}>
                  ✕ {publishError}
                </div>
              )}

              {showSchedule && (
                <div style={{ background: "#FDFCFF", border: "1.5px solid #EEE9FF", borderRadius: 11, padding: "14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1E1B4B", marginBottom: 10 }}>Pick date & time</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 11 }}>
                    <div>
                      <Label>Date</Label>
                      <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="gp-input"
                        min={new Date().toISOString().split("T")[0]}
                        style={{ ...inputStyle, padding: "9px 11px" }}/>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className="gp-input"
                        style={{ ...inputStyle, padding: "9px 11px" }}/>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { if (schedDate) setSchedConfirm(true); }} disabled={!schedDate}
                      style={{ flex: 1, padding: "9px", borderRadius: 8, background: schedDate ? "#7C6FCD" : "#E5E0F8", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: schedDate ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                      Confirm
                    </button>
                    <button onClick={() => setShowSchedule(false)}
                      style={{ padding: "9px 14px", borderRadius: 8, background: "none", border: "1.5px solid #E5E0F8", color: "#6B7280", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ── Action buttons ── */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setShowSchedule(s => !s); setPublishSuccess(false); setPublishError(""); }}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#7C6FCD", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Schedule Post
                </button>
                <button
                  onClick={handlePublishNow}
                  disabled={publishing || publishSuccess}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, background: publishSuccess ? "#ECFDF5" : "#ECFDF5", color: "#059669", fontSize: 13, fontWeight: 600, border: "1.5px solid #A7F3D0", cursor: publishing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: publishing ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {publishing
                    ? <><span style={{ width: 12, height: 12, border: "2px solid #05966944", borderTopColor: "#059669", borderRadius: "50%", display: "inline-block", animation: "gp-spin .7s linear infinite" }}/> Publishing…</>
                    : publishSuccess ? "✓ Published!" : "Publish Now"
                  }
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}