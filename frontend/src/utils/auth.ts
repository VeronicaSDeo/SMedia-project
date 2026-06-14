// ── utils/auth.ts ──────────────────────────────────────────────────────────────
// Proper auth with server-side token validation.
// isAuthenticated() = local check (fast, for UI hints only)
// verifyTokenWithServer() = real check against /api/user/me (use on page mount)

const TOKEN_KEY   = "smedia_token";
const USER_KEY    = "smedia_user";
const ONBOARD_KEY = "smedia_onboarded";

const API_BASE = (() => {
  try { return (import.meta as any).env?.VITE_API_URL || "http://localhost:5000"; }
  catch { return "http://localhost:5000"; }
})();

// ── Token / Session ───────────────────────────────────────────────────────────
export function saveSession(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getSession(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── User ──────────────────────────────────────────────────────────────────────
export function saveUser(user: object) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser(): any | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch { return null; }
}
export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

// ── Local-only check (no network) ────────────────────────────────────────────
// Use only for hints (e.g. showing a spinner while verifying).
export function isAuthenticated(): boolean {
  return !!getSession();
}

// ── Server-side token verification ───────────────────────────────────────────
// Returns the user object if the token is valid, null otherwise.
// On failure it automatically clears stale local storage.
export async function verifyTokenWithServer(): Promise<any | null> {
  const token = getSession();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const user = await res.json();
      saveUser(user); // keep local copy fresh
      return user;
    }
    // Token rejected by server → clear stale data
    clearAuth();
    return null;
  } catch {
    // Network error: don't clear auth — user may just be offline.
    // Return null so the page stays on login but doesn't erase the token.
    return null;
  }
}

// ── Onboarding flag ───────────────────────────────────────────────────────────
export function markOnboarded(userId: string | number) {
  const ids = getOnboardedIds();
  ids.add(String(userId));
  localStorage.setItem(ONBOARD_KEY, JSON.stringify([...ids]));
}
export function isOnboarded(userId?: string | number): boolean {
  if (!userId) return false;
  return getOnboardedIds().has(String(userId));
}
function getOnboardedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ONBOARD_KEY) || "[]")); }
  catch { return new Set(); }
}

// ── Full logout ───────────────────────────────────────────────────────────────
export function clearAuth() {
  clearSession();
  clearUser();
  // Intentionally keep onboarding flag — returning users skip onboarding.
}