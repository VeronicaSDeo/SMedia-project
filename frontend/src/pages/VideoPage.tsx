// ── pages/VideoPage.tsx ───────────────────────────────────────────────────────
import { useState, useRef } from "react";

const API          = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";
const N8N_WEBHOOK  = "http://localhost:5678/webhook/generate-caption";
const KLING_API    = "https://api.klingai.com/v1/videos/text2video";

const T = {
  primary:     "#7C6FCD",
  accent:      "#A78BFA",
  bg:          "#F7F5FF",
  accentLight: "#EDE9FE",
  accentPale:  "#F5F3FF",
  border:      "#DDD6FE",
  borderLight: "#EEE9FF",
  textDark:    "#1E1B4B",
  textBody:    "#4B5563",
  textMuted:   "#9CA3AF",
};

const IcVideo    = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
const IcUpload   = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IcYoutube  = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>;
const IcSpark    = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const IcCopy     = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

// ── CHANGED: added 15 sec and 30 sec options ──────────────────────────────────
const DURATIONS     = [{ v: 5, l: "5 sec" }, { v: 10, l: "10 sec" }, { v: 15, l: "15 sec" }, { v: 30, l: "30 sec" }];
const ASPECT_RATIOS = [{ v: "16:9", l: "16:9 Landscape" }, { v: "9:16", l: "9:16 Portrait" }, { v: "1:1", l: "1:1 Square" }];
const TONES         = ["exciting", "professional", "casual", "funny", "inspirational"];

function parseN8nResponse(data: any): { caption: string; hashtags: string[] } {
  const d    = Array.isArray(data) ? data[0] : data;
  if (d?.caption !== undefined || d?.hashtags !== undefined)
    return { caption: d.caption || "", hashtags: Array.isArray(d.hashtags) ? d.hashtags : [] };
  const raw      = d?.text || d?.output || d?.content || "";
  const lines    = raw.split("\n");
  const hashLines = lines.filter((l: string) => l.trim().startsWith("#"));
  const captionLines = lines.filter((l: string) => !l.trim().startsWith("#"));
  return { caption: captionLines.join("\n").trim(), hashtags: hashLines.join(" ").match(/#\w+/g) || [] };
}

async function generateKlingVideo(prompt: string, duration: number, aspectRatio: string): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_KLING_API_KEY || "";
  if (!apiKey) throw new Error("VITE_KLING_API_KEY not set in frontend .env");

  const submitRes = await fetch(KLING_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "kling-v1", prompt, duration, aspect_ratio: aspectRatio, mode: "std" }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.json().catch(() => ({}));
    throw new Error(err.message || `Kling API error ${submitRes.status}`);
  }

  const submitData = await submitRes.json();
  const taskId     = submitData?.data?.task_id;
  if (!taskId) throw new Error("No task ID returned from Kling");

  const pollUrl = `https://api.klingai.com/v1/videos/text2video/${taskId}`;
  for (let i = 0; i < 36; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes  = await fetch(pollUrl, { headers: { "Authorization": `Bearer ${apiKey}` } });
    const pollData = await pollRes.json();
    const status   = pollData?.data?.task_status;
    if (status === "succeed") {
      const videoUrl = pollData?.data?.task_result?.videos?.[0]?.url;
      if (!videoUrl) throw new Error("Video generated but URL missing");
      return videoUrl;
    }
    if (status === "failed") throw new Error(pollData?.data?.task_status_msg || "Video generation failed");
  }

  throw new Error("Video generation timed out — try again");
}

export default function VideoPage({ user }: { user: any }) {
  const [tab,           setTab]           = useState<"generate" | "upload">("generate");

  const [prompt,        setPrompt]        = useState("");
  const [duration,      setDuration]      = useState(5);
  const [aspectRatio,   setAspectRatio]   = useState("16:9");
  const [tone,          setTone]          = useState("exciting");
  const [genLoading,    setGenLoading]    = useState(false);
  const [genStep,       setGenStep]       = useState("");
  const [genVideoUrl,   setGenVideoUrl]   = useState<string | null>(null);
  const [genCaption,    setGenCaption]    = useState("");
  const [genHashtags,   setGenHashtags]   = useState<string[]>([]);
  const [genError,      setGenError]      = useState("");

  const [uploadFile,    setUploadFile]    = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTopic,   setUploadTopic]   = useState("");
  const [uploadTone,    setUploadTone]    = useState("exciting");
  const [upLoading,     setUpLoading]     = useState(false);
  const [upCaption,     setUpCaption]     = useState("");
  const [upHashtags,    setUpHashtags]    = useState<string[]>([]);
  const [upError,       setUpError]       = useState("");

  const [schedDate,     setSchedDate]     = useState("");
  const [schedTime,     setSchedTime]     = useState("09:00");
  const [showSchedule,  setShowSchedule]  = useState(false);
  const [scheduled,     setScheduled]     = useState<string | null>(null);
  const [scheduling,    setScheduling]    = useState(false);
  const [copied,        setCopied]        = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenLoading(true); setGenError(""); setGenVideoUrl(null); setGenCaption(""); setGenHashtags([]);
    try {
      setGenStep("🎬 Generating AI video via Kling… (this takes ~1-3 min)");
      const videoUrl = await generateKlingVideo(prompt, duration, aspectRatio);
      setGenVideoUrl(videoUrl);
      setGenStep("✍️ Writing caption & hashtags…");
      const res  = await fetch(N8N_WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: prompt, platform: "youtube", tone, contentType: "both" }),
      });
      if (!res.ok) throw new Error(`n8n returned ${res.status}`);
      const parsed = parseN8nResponse(await res.json());
      setGenCaption(parsed.caption);
      setGenHashtags(parsed.hashtags);
    } catch (err: any) {
      setGenError(err.message || "Generation failed");
    } finally {
      setGenLoading(false); setGenStep("");
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { setUpError("File too large — max 500 MB"); return; }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setUpError("");
  };

  const handleUploadGenerate = async () => {
    if (!uploadFile || !uploadTopic.trim()) return;
    setUpLoading(true); setUpError(""); setUpCaption(""); setUpHashtags([]);
    try {
      const res    = await fetch(N8N_WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: uploadTopic, platform: "youtube", tone: uploadTone, contentType: "both" }),
      });
      if (!res.ok) throw new Error(`n8n returned ${res.status}`);
      const parsed = parseN8nResponse(await res.json());
      setUpCaption(parsed.caption);
      setUpHashtags(parsed.hashtags);
    } catch (err: any) {
      setUpError(err.message || "Failed to generate caption");
    } finally {
      setUpLoading(false);
    }
  };

  const activeCaption  = tab === "generate" ? genCaption  : upCaption;
  const activeHashtags = tab === "generate" ? genHashtags : upHashtags;
  const activeVideoUrl = tab === "generate" ? genVideoUrl : uploadPreview;
  const hasResult      = !!activeVideoUrl && (!!activeCaption || activeHashtags.length > 0);

  const handleSchedule = async () => {
    if (!schedDate || !activeCaption) return;
    setScheduling(true);
    try {
      const token = localStorage.getItem("smedia_token") || "";
      const d     = new Date(schedDate);
      await fetch(`${API}/api/content/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform: "youtube", text: `${activeCaption}\n\n${activeHashtags.join(" ")}`,
          imageUrl: activeVideoUrl, day: d.getDate(), month: d.getMonth(),
          year: d.getFullYear(), time: schedTime, status: "scheduled",
        }),
      });
      setScheduled(`${schedDate} at ${schedTime}`);
      setShowSchedule(false);
    } catch {
      alert("Schedule failed — check your connection");
    } finally {
      setScheduling(false);
    }
  };

  const handleCopy = () => {
    const txt = [activeCaption, activeHashtags.join(" ")].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 10,
    border: `1px solid ${T.border}`, background: T.bg,
    fontSize: 13, color: T.textDark, fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 22, color: T.textDark }}>🎬 Video Creator</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Generate AI videos with Kling or upload your own — add captions, hashtags & post to YouTube</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ key: "generate", label: "✨ AI Generate" }, { key: "upload", label: "📤 Upload Video" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: "10px 20px", borderRadius: 10, border: tab === t.key ? "none" : `1px solid ${T.borderLight}`, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, background: tab === t.key ? T.primary : "#fff", color: tab === t.key ? "#fff" : T.textBody, boxShadow: tab === t.key ? "0 4px 14px rgba(124,111,205,.3)" : "0 1px 4px rgba(0,0,0,.06)", transition: "all .18s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: 22 }}>

          {tab === "generate" && (
            <>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 15, color: T.textDark, marginBottom: 4 }}>AI Video Generation</div>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 18 }}>Describe your video — Kling AI creates it (~1-3 min)</div>

              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEF3C7", border: "1px solid #FDE68A", fontSize: 12, color: "#92400E", marginBottom: 16 }}>
                ⚡ Requires <strong>VITE_KLING_API_KEY</strong> in your frontend <code>.env</code> file.<br/>
                Get free credits at <a href="https://klingai.com" target="_blank" rel="noreferrer" style={{ color: "#92400E" }}>klingai.com</a>
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Video Description</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. A cinematic drone shot over a mountain lake at golden hour, with calm water reflections..."
                style={{ ...fieldStyle, height: 100, resize: "none", lineHeight: 1.6, marginBottom: 14 }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Duration</label>
                  {/* ── CHANGED: 4 options, flex-wrap so they fit ── */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {DURATIONS.map(d => (
                      <button key={d.v} onClick={() => setDuration(d.v)}
                        style={{ flex: "1 1 auto", padding: "8px", borderRadius: 8, border: `1.5px solid ${duration === d.v ? T.primary : T.border}`, background: duration === d.v ? T.accentLight : "#fff", color: duration === d.v ? T.primary : T.textBody, fontSize: 12.5, fontWeight: duration === d.v ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                        {d.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>Aspect Ratio</label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} style={fieldStyle}>
                    {ASPECT_RATIOS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 8 }}>Caption Tone</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${tone === t ? T.primary : T.border}`, background: tone === t ? T.accentLight : "#fff", color: tone === t ? T.primary : T.textMuted, fontSize: 12, fontWeight: tone === t ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleGenerate} disabled={!prompt.trim() || genLoading}
                style={{ width: "100%", padding: 12, borderRadius: 10, background: T.primary, color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: prompt.trim() && !genLoading ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: !prompt.trim() || genLoading ? 0.7 : 1 }}>
                {genLoading
                  ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} className="spin"/>Generating…</>
                  : <>{IcSpark} Generate Video + Caption</>}
              </button>
            </>
          )}

          {tab === "upload" && (
            <>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 15, color: T.textDark, marginBottom: 4 }}>Upload Your Video</div>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 18 }}>Upload a video and let AI write the perfect YouTube caption & hashtags</div>

              <div onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${uploadFile ? T.primary : T.border}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: uploadFile ? T.accentLight : T.bg, marginBottom: 16, transition: "all .18s" }}>
                <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFilePick}/>
                {uploadFile ? (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🎬</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{uploadFile.name}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{(uploadFile.size / 1024 / 1024).toFixed(1)} MB · Click to change</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📹</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.textDark }}>Drop your video here</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>MP4, MOV, AVI · Max 500 MB</div>
                    <div style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, background: T.primary, color: "#fff", fontSize: 12, fontWeight: 600, display: "inline-block" }}>Browse Files</div>
                  </>
                )}
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 6 }}>What's this video about?</label>
              <textarea value={uploadTopic} onChange={e => setUploadTopic(e.target.value)}
                placeholder="e.g. Tutorial on how to make sourdough bread from scratch..."
                style={{ ...fieldStyle, height: 80, resize: "none", lineHeight: 1.6, marginBottom: 14 }}
              />

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: "block", marginBottom: 8 }}>Caption Tone</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TONES.map(t => (
                    <button key={t} onClick={() => setUploadTone(t)}
                      style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${uploadTone === t ? T.primary : T.border}`, background: uploadTone === t ? T.accentLight : "#fff", color: uploadTone === t ? T.primary : T.textMuted, fontSize: 12, fontWeight: uploadTone === t ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleUploadGenerate} disabled={!uploadFile || !uploadTopic.trim() || upLoading}
                style={{ width: "100%", padding: 12, borderRadius: 10, background: T.primary, color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: uploadFile && uploadTopic.trim() && !upLoading ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: !uploadFile || !uploadTopic.trim() || upLoading ? 0.7 : 1 }}>
                {upLoading
                  ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} className="spin"/>Generating Caption…</>
                  : <>{IcSpark} Generate Caption + Hashtags</>}
              </button>

              {upError && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#991B1B" }}>❌ {upError}</div>}
            </>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 15, color: T.textDark }}>Preview & Publish</div>
            {hasResult && (
              <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", color: T.textBody, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? "✓ Copied!" : <>{IcCopy} Copy</>}
              </button>
            )}
          </div>

          {(genLoading || upLoading) && (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div className="dot-loader" style={{ marginBottom: 12 }}><span/><span/><span/></div>
              <div style={{ fontSize: 13, color: T.textMuted }}>{genStep || "Generating caption & hashtags…"}</div>
              {genLoading && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>Kling videos take 1-3 minutes — hang tight!</div>}
            </div>
          )}

          {genError && !genLoading && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#991B1B", marginBottom: 14 }}>❌ {genError}</div>
          )}

          {!genLoading && !upLoading && hasResult && (
            <>
              {activeVideoUrl && (
                <div style={{ marginBottom: 14, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.borderLight}` }}>
                  <video src={activeVideoUrl} controls style={{ width: "100%", display: "block", maxHeight: 240, background: "#000" }}/>
                </div>
              )}
              {activeCaption && (
                <div style={{ background: T.bg, borderRadius: 10, padding: "14px 16px", marginBottom: 14, fontSize: 13.5, color: T.textDark, lineHeight: 1.75, whiteSpace: "pre-wrap", border: `1px solid ${T.borderLight}` }}>
                  {activeCaption}
                </div>
              )}
              {activeHashtags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {activeHashtags.map(h => (
                    <span key={h} style={{ padding: "3px 10px", borderRadius: 20, background: T.accentPale, color: T.primary, fontSize: 12, fontWeight: 500 }}>{h}</span>
                  ))}
                </div>
              )}
              {scheduled && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: 12, fontSize: 13, color: "#059669", fontWeight: 600 }}>
                  ✅ Scheduled for {scheduled} — n8n will post it to YouTube!
                </div>
              )}
              {showSchedule && (
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textDark, marginBottom: 10 }}>📅 Pick date & time</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: T.textMuted, display: "block", marginBottom: 4 }}>Date</label>
                      <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", fontSize: 13, color: T.textDark, fontFamily: "inherit" }}/>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: T.textMuted, display: "block", marginBottom: 4 }}>Time</label>
                      <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", fontSize: 13, color: T.textDark, fontFamily: "inherit" }}/>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleSchedule} disabled={!schedDate || scheduling}
                      style={{ flex: 1, padding: 9, borderRadius: 8, background: schedDate ? T.primary : "#ccc", color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: schedDate ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                      {scheduling ? "Scheduling…" : "✓ Schedule to YouTube"}
                    </button>
                    <button onClick={() => setShowSchedule(false)}
                      style={{ padding: "9px 14px", borderRadius: 8, background: "none", border: `1px solid ${T.border}`, color: T.textBody, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {!scheduled && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowSchedule(s => !s)}
                    style={{ flex: 1, padding: 11, borderRadius: 10, background: T.primary, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {IcYoutube} Schedule to YouTube
                  </button>
                  <button style={{ padding: "11px 14px", borderRadius: 10, background: "#ECFDF5", color: "#059669", fontSize: 13, fontWeight: 600, border: "1px solid #A7F3D0", cursor: "pointer", fontFamily: "inherit" }}>
                    ✓ Publish Now
                  </button>
                </div>
              )}
            </>
          )}

          {!genLoading && !upLoading && !hasResult && !genError && (
            <div style={{ padding: "44px 0", textAlign: "center", color: T.textMuted }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 13.5, color: T.textDark }}>Your video preview will appear here</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                {tab === "generate" ? "Describe a video and click Generate" : "Upload a video and click Generate Caption"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}