// ── App.tsx ───────────────────────────────────────────────────────────────────
// Route guard logic:
//
//  PublicRoute   → /login, /signup: always clears any existing session so the
//                  user must authenticate fresh every time.
//
//  PrivateRoute  → /dashboard: if no token → /login
//                  Dashboard also calls /api/user/me on mount and redirects to
//                  /login itself if the server rejects the token (401).
//
//  OnboardingRoute → /onboarding: must be logged in. If already onboarded → /dashboard

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSession, getUser, isOnboarded, clearAuth } from "./utils/auth";

import LandingPage       from "./pages/LandingPage";
import LoginPage         from "./pages/LoginPage";
import SignupPage        from "./pages/SignupPage";
import DashboardPage     from "./pages/Dashboard";
import OnboardingPage    from "./pages/OnboardingPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";

// ── Route guards ──────────────────────────────────────────────────────────────

/**
 * Public: always clears any stored session so the user must log in fresh.
 * No auto-redirect to dashboard even if a token exists.
 */
function PublicRoute({ children }: { children: JSX.Element }) {
  clearAuth();
  return children;
}

/** Private: no token → login */
function PrivateRoute({ children }: { children: JSX.Element }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

/** Onboarding: must be logged in; if already onboarded → dashboard */
function OnboardingRoute({ children }: { children: JSX.Element }) {
  if (!getSession()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (user && isOnboarded(user.id)) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth — always requires fresh login */}
        <Route path="/login"  element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

        {/* Google OAuth callback — must NOT have a PublicRoute wrapper */}
        <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />

        {/* Password reset — public; security is in the reset token */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Onboarding — new signup flow only */}
        <Route
          path="/onboarding"
          element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>}
        />

        {/* Dashboard — any user with a valid token */}
        <Route
          path="/dashboard"
          element={<PrivateRoute><DashboardPage /></PrivateRoute>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}