// ── main.tsx ──────────────────────────────────────────────────────────────────
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";   // ← ADDED: loads Tailwind, fonts, and global reset
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);