// ── errorHandler.ts ───────────────────────────────────────────────────────────
// Pure validation functions. Each returns null (valid) or an error string.

// ── Email ─────────────────────────────────────────────────────────────────────
export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return "Please enter a valid email address.";
  return null;
}

// ── Password ──────────────────────────────────────────────────────────────────
export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Include at least one special character (e.g. @, #, !).";
  return null;
}

// ── Name ──────────────────────────────────────────────────────────────────────
export function validateName(name: string): string | null {
  if (!name.trim()) return "Full name is required.";
  if (name.trim().length < 2) return "Name must be at least 2 characters.";
  if (!/^[a-zA-Z\s'-]+$/.test(name))
    return "Name can only contain letters, spaces, hyphens, or apostrophes.";
  return null;
}

// ── Confirm Password ──────────────────────────────────────────────────────────
export function validateConfirmPassword(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

// ── Password strength meter (0–4) ─────────────────────────────────────────────
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "#E5E7EB" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: "", color: "#E5E7EB" },
    { score: 1, label: "Weak", color: "#EF4444" },
    { score: 2, label: "Fair", color: "#F59E0B" },
    { score: 3, label: "Good", color: "#6366F1" },
    { score: 4, label: "Strong", color: "#10B981" },
  ];

  return levels[score as 0 | 1 | 2 | 3 | 4];
}

// ── Full form validation bundles ──────────────────────────────────────────────
export interface LoginErrors {
  email?: string;
  password?: string;
}

export interface SignupErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function validateLoginForm(
  email: string,
  password: string
): LoginErrors {
  const errors: LoginErrors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  if (!password) errors.password = "Password is required.";
  return errors;
}

export function validateSignupForm(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): SignupErrors {
  const errors: SignupErrors = {};
  const nameErr = validateName(name);
  if (nameErr) errors.name = nameErr;
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  const passErr = validatePassword(password);
  if (passErr) errors.password = passErr;
  const confirmErr = validateConfirmPassword(password, confirmPassword);
  if (confirmErr) errors.confirmPassword = confirmErr;
  return errors;
}