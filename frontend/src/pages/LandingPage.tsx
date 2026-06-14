import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";

// ── SVG icon map ───────────────────────────────────────────────────────────────
const ICONS: Record<string, JSX.Element> = {
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.78 1.52V6.7a4.85 4.85 0 0 1-1.01-.01z" />
    </svg>
  ),
  threads: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.286.02 5.241 2.19 5.373 5.987.573.385 1.098.835 1.562 1.35 1.718 1.9 1.718 4.652-.003 6.951C17.498 22.096 15.064 23.961 12.186 24z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
};

const ICON_DATA = [
  { key: "youtube",   x: "2%",   y: "15%", size: 56, blur: 0, opacity: 0.82, color: "#FF0000" },
  { key: "linkedin",  x: "9%",   y: "30%", size: 44, blur: 0, opacity: 0.72, color: "#0A66C2" },
  { key: "threads",   x: "3%",   y: "47%", size: 46, blur: 0, opacity: 0.68, color: "#111111" },
  { key: "facebook",  x: "13%",  y: "61%", size: 42, blur: 0, opacity: 0.76, color: "#1877F2" },
  { key: "tiktok",    x: "1%",   y: "76%", size: 44, blur: 1, opacity: 0.65, color: "#111111" },
  { key: "instagram", x: "10%",  y: "88%", size: 40, blur: 0, opacity: 0.72, color: "#E1306C" },
  { key: "twitter",   x: "16%",  y: "21%", size: 38, blur: 0, opacity: 0.62, color: "#111111" },
  { key: "pinterest", x: "7%",   y: "54%", size: 36, blur: 0, opacity: 0.60, color: "#E60023" },
  { key: "youtube",   x: "17%",  y: "8%",  size: 32, blur: 6, opacity: 0.28, color: "#FF0000" },
  { key: "facebook",  x: "5%",   y: "38%", size: 28, blur: 7, opacity: 0.22, color: "#1877F2" },
  { key: "tiktok",    x: "14%",  y: "72%", size: 30, blur: 5, opacity: 0.25, color: "#111111" },
  { key: "instagram", x: "3%",   y: "93%", size: 26, blur: 8, opacity: 0.18, color: "#E1306C" },
  { key: "twitter",   x: "89%",  y: "11%", size: 52, blur: 0, opacity: 0.82, color: "#111111" },
  { key: "pinterest", x: "93%",  y: "27%", size: 56, blur: 0, opacity: 0.88, color: "#E60023" },
  { key: "instagram", x: "85%",  y: "44%", size: 46, blur: 0, opacity: 0.72, color: "#E1306C" },
  { key: "threads",   x: "93%",  y: "59%", size: 44, blur: 0, opacity: 0.68, color: "#111111" },
  { key: "youtube",   x: "81%",  y: "74%", size: 44, blur: 0, opacity: 0.75, color: "#FF0000" },
  { key: "linkedin",  x: "90%",  y: "87%", size: 40, blur: 1, opacity: 0.68, color: "#0A66C2" },
  { key: "facebook",  x: "80%",  y: "19%", size: 38, blur: 0, opacity: 0.60, color: "#1877F2" },
  { key: "tiktok",    x: "96%",  y: "40%", size: 38, blur: 0, opacity: 0.62, color: "#111111" },
  { key: "twitter",   x: "83%",  y: "7%",  size: 34, blur: 5, opacity: 0.26, color: "#111111" },
  { key: "pinterest", x: "97%",  y: "53%", size: 30, blur: 8, opacity: 0.20, color: "#E60023" },
  { key: "instagram", x: "87%",  y: "94%", size: 32, blur: 6, opacity: 0.24, color: "#C13584" },
  { key: "linkedin",  x: "95%",  y: "72%", size: 28, blur: 7, opacity: 0.20, color: "#0A66C2" },
];

let _pid = 0;

export default function LandingPage() {
  const navigate = useNavigate();
  const [hoverLogin,  setHoverLogin]  = useState(false);
  const [hoverSignup, setHoverSignup] = useState(false);
  const [hoverCta,    setHoverCta]    = useState(false);
  const [loaded,      setLoaded]      = useState(false);
  const [particles,   setParticles]   = useState<any[]>([]);

  const innerRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number | null>(null);
  const mousePos     = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    setLoaded(true);
    const ID = "smedia-burst-kf";
    if (document.getElementById(ID)) return;
    const s = document.createElement("style");
    s.id = ID;
    s.textContent = `
      @keyframes smBurst {
        0%   { opacity:0;    transform:translateY(0px)    scale(0.1); }
        18%  { opacity:0.55; transform:translateY(-24px)  scale(1.05); }
        100% { opacity:0;    transform:translateY(-160px) scale(0.3); }
      }
    `;
    document.head.appendChild(s);
    return () => { const el = document.getElementById(ID); if (el) el.remove(); };
  }, []);

  const handleIconHover = useCallback((e: React.MouseEvent, key: string, color: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const COUNT = 18;
    const batch = Array.from({ length: COUNT }, (_, i) => ({
      id:       ++_pid,
      key,
      color,
      cx,
      cy,
      angle:    (360 / COUNT) * i + (Math.random() * 22 - 11),
      size:     13 + Math.floor(Math.random() * 11),
      duration: 720 + Math.floor(Math.random() * 220),
      delay:    Math.floor(Math.random() * 90),
    }));
    setParticles(prev => [...prev, ...batch]);
    setTimeout(() => {
      setParticles(prev => {
        const ids = new Set(batch.map(p => p.id));
        return prev.filter(p => !ids.has(p.id));
      });
    }, 1150);
  }, []);

  const applyMagnet = useCallback(() => {
    const { x, y } = mousePos.current;
    innerRefs.current.forEach(el => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const icx  = rect.left + rect.width  / 2;
      const icy  = rect.top  + rect.height / 2;
      const dx   = x - icx;
      const dy   = y - icy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const RADIUS = 170;
      if (dist < RADIUS && dist > 0) {
        const pull = (1 - dist / RADIUS) * 12;
        el.style.transform  = `translate(${((dx / dist) * pull).toFixed(2)}px, ${((dy / dist) * pull).toFixed(2)}px)`;
        el.style.transition = "transform 0.22s ease";
      } else {
        el.style.transform  = "translate(0,0)";
        el.style.transition = "transform 0.5s ease";
      }
    });
    rafRef.current = null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(applyMagnet);
  }, [applyMagnet]);

  const handleMouseLeave = useCallback(() => {
    mousePos.current = { x: -9999, y: -9999 };
    innerRefs.current.forEach(el => {
      if (el) { el.style.transform = "translate(0,0)"; el.style.transition = "transform 0.55s ease"; }
    });
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" />

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          minHeight: "100vh",
          background: "#F5F3FF",
          fontFamily: "'DM Sans', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, #C4B5FD 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.15,
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* Background icons */}
        {ICON_DATA.map((ic, i) => (
          <div
            key={i}
            onMouseEnter={e => handleIconHover(e, ic.key, ic.color)}
            style={{
              position: "absolute",
              left: ic.x,
              top: ic.y,
              width: ic.size,
              height: ic.size,
              color: ic.color,
              opacity: loaded ? ic.opacity : 0,
              filter: ic.blur > 0 ? `blur(${ic.blur}px)` : "none",
              zIndex: 2,
              cursor: "pointer",
              transition: `opacity 0.65s ease ${(i * 0.04).toFixed(2)}s`,
            }}
          >
            <div
              ref={el => { innerRefs.current[i] = el; }}
              style={{ width: "100%", height: "100%" }}
            >
              {ICONS[ic.key]}
            </div>
          </div>
        ))}

        {/* Burst particles */}
        {particles.map((p: any) => (
          <div
            key={p.id}
            style={{
              position: "fixed",
              left: p.cx - p.size / 2,
              top:  p.cy - p.size / 2,
              width: p.size,
              height: p.size,
              color: p.color,
              transform: `rotate(${p.angle}deg)`,
              transformOrigin: "center center",
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            <div style={{
              width: "100%", height: "100%",
              animation: `smBurst ${p.duration}ms ease-out ${p.delay}ms forwards`,
            }}>
              {ICONS[p.key]}
            </div>
          </div>
        ))}

        {/* ── Navbar ── */}
        <nav style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 48px",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/logo.png"
              alt="SMedia logo"
              style={{ width: "42px", height: "42px", objectFit: "contain" }}
            />
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: "1.5rem",
              color: "#1E1B4B",
              letterSpacing: "-0.5px",
            }}>
              <span style={{ color: "#6366F1" }}>S</span>Media
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate("/login")}
              onMouseEnter={() => setHoverLogin(true)}
              onMouseLeave={() => setHoverLogin(false)}
              style={{
                padding: "10px 28px",
                borderRadius: "999px",
                border: "1.5px solid #6366F1",
                background: hoverLogin ? "#EEF2FF" : "transparent",
                color: "#4F46E5",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              onMouseEnter={() => setHoverSignup(true)}
              onMouseLeave={() => setHoverSignup(false)}
              style={{
                padding: "10px 28px",
                borderRadius: "999px",
                border: "1.5px solid transparent",
                background: hoverSignup
                  ? "#4338CA"
                  : "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                color: "#FFFFFF",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: hoverSignup
                  ? "0 6px 20px rgba(99,102,241,0.5)"
                  : "0 3px 12px rgba(99,102,241,0.35)",
              }}
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* ── Hero section ── */}
        <section style={{
          position: "relative", zIndex: 5,
          maxWidth: 780, margin: "0 auto",
          padding: "60px 48px 100px",
        }}>
          {/* Tagline pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#EDE9FE",
            color: "#5B21B6",
            borderRadius: "999px",
            padding: "8px 20px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: "0.875rem",
            marginBottom: 32,
            border: "1px solid #DDD6FE",
            letterSpacing: "0.01em",
          }}>
            <span style={{ fontSize: "0.75rem" }}>✦</span>
            Think Less. Post More.
          </div>

          {/* Main heading */}
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2.8rem, 6vw, 4.8rem)",
            lineHeight: 1.05,
            letterSpacing: "-2px",
            color: "#1E1B4B",
            margin: "0 0 24px",
            textAlign: "left",
          }}>
            AI Content<br />
            <span style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Generator</span> Bot
          </h1>

          {/* Sub heading */}
          <p style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
            color: "#3730A3",
            margin: "0 0 20px",
            textAlign: "left",
            letterSpacing: "-0.3px",
            lineHeight: 1.4,
          }}>
            Don't Stress.<br />Let AI Handle The Rest!!
          </p>

          {/* Body text */}
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "1.05rem",
            lineHeight: 1.75,
            color: "#6B7280",
            margin: "0 0 48px",
            maxWidth: 520,
            textAlign: "left",
          }}>
            Generate captions, hashtags, post ideas, reels content, and
            engaging social media posts instantly using AI — all in one place.
          </p>

          {/* CTA row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/signup")}
              onMouseEnter={() => setHoverCta(true)}
              onMouseLeave={() => setHoverCta(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 38px",
                borderRadius: "999px",
                border: "none",
                background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                color: "#FFFFFF",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: hoverCta
                  ? "0 10px 36px rgba(99,102,241,0.5)"
                  : "0 4px 24px rgba(99,102,241,0.32)",
                transform: hoverCta ? "translateY(-2px)" : "translateY(0)",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
              }}
            >
              Start Free Trial →
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 32px",
                borderRadius: "999px",
                border: "1.5px solid #DDD6FE",
                background: "transparent",
                color: "#4F46E5",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer",
                transition: "border-color 0.18s ease",
              }}
            >
              
            </button>
          </div>

          <p style={{
            marginTop: 28,
            fontSize: "0.85rem",
            color: "#9CA3AF",
            fontFamily: "'DM Sans', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            <span>✦ No credit card required</span>
            <span style={{ color: "#D1D5DB" }}>·</span>
            <span>Free forever plan available</span>
          </p>

          {/* Trust badges */}
          <div style={{
            marginTop: 52,
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}>
            {[
              { icon: "🚀", label: "10K+ posts generated" },
              { icon: "⚡", label: "AI-powered in seconds" },
              { icon: "📅", label: "Auto-schedule & publish" },
            ].map((b, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.7)",
                border: "1px solid #E9D5FF",
                borderRadius: 12,
                padding: "10px 16px",
                backdropFilter: "blur(8px)",
              }}>
                <span style={{ fontSize: "1rem" }}>{b.icon}</span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "#4B5563",
                }}>{b.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}