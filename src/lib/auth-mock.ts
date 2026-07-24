// Mock auth store — no real backend
const KEY = "mytijaara_admin_session";

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

export function signIn(_email: string, _password: string) {
  const session = { ...DEMO, loggedInAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function signOut() {
  localStorage.removeItem(KEY);
}
