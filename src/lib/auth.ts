import { authApi } from "@/lib/api";
import { clearToken, type AdminUser } from "@/lib/api/auth";

const SESSION_KEY = "mytijaara_admin_session";

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  loggedInAt: number;
};

const USE_MOCK = !(
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_API_BASE_URL
);

export function isMockMode(): boolean {
  return USE_MOCK;
}

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

export async function signIn(email: string, password: string): Promise<AdminSession> {
  const { user } = await authApi.login(email, password);
  return persistSession(user);
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
