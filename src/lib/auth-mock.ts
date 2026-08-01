// Session store for the admin panel. In mock mode (no VITE_API_BASE_URL) any
// credentials sign in as the demo Super Admin. In live mode `signIn` calls the
// Laravel backend, persists the Sanctum token, and caches the returned user.
import { authApi, clearToken } from "@/lib/api/auth";

const KEY = "mytijaara_admin_session";

const USE_MOCK = !(
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_API_BASE_URL
);

export function isMockMode(): boolean {
  return USE_MOCK;
}

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  loggedInAt: number;
};

const DEMO: AdminSession = {
  id: "u_1",
  name: "Adaeze Okafor",
  email: "adaeze@mytijaara.com",
  role: "Super Admin",
  avatar: "AO",
  loggedInAt: Date.now(),
};

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  if (USE_MOCK) {
    const session = { ...DEMO, loggedInAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(session));
    return session;
  }

  const { user } = await authApi.login(email, password);
  const session: AdminSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    loggedInAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function signOut() {
  localStorage.removeItem(KEY);
  if (!USE_MOCK) {
    // Best-effort server-side revocation. `authApi.logout` clears the token
    // only after it has sent this request with the current bearer token.
    void authApi.logout();
    return;
  }
  clearToken();
}
