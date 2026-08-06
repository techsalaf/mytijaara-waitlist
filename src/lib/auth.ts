import { authApi } from "@/lib/api";
import { clearToken, type AdminUser } from "@/lib/api/auth";

const SESSION_KEY = "mytijaara_admin_session";

/**
 * Cached identity for the admin shell, so the sidebar and header can render
 * before `/auth/me` answers. The token is the actual credential; this is only a
 * display cache and is replaced by the server's copy on every restore.
 */
export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  loggedInAt: number;
};

function parseSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    return parseSession(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("mytijaara_api_token");
  } catch {
    return null;
  }
}

function persistSession(user: AdminUser): AdminSession {
  const session: AdminSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    loggedInAt: Date.now(),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore write failures
  }
  return session;
}

/**
 * Result of a sign-in attempt. A confirmed second factor makes the first
 * attempt a challenge rather than a failure, so the caller can ask for the code
 * instead of showing "wrong password".
 */
export type SignInResult =
  | { twoFactorRequired: false; session: AdminSession }
  | { twoFactorRequired: true; message: string };

export async function signIn(
  email: string,
  password: string,
  code?: string,
): Promise<SignInResult> {
  const result = await authApi.login(email, password, code);
  if (result.twoFactorRequired) {
    return { twoFactorRequired: true, message: result.message };
  }
  return { twoFactorRequired: false, session: persistSession(result.user) };
}

export async function restoreSession(): Promise<AdminSession> {
  const { data: user } = await authApi.me();
  return persistSession(user);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore remove failures
  }
}

export async function signOut(): Promise<void> {
  clearSession();
  try {
    await authApi.logout();
  } catch {
    // ignore logout failures
  } finally {
    clearToken();
  }
}
