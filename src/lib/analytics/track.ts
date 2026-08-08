import { apiCall } from "@/lib/api/client";

type TrackPayload = {
  type: string;
  meta?: Record<string, unknown>;
};

/**
 * Fire a single analytics event to POST /events. Best-effort — never throws.
 * Generates stable visitor/session IDs from localStorage so cross-page
 * attribution works without a server cookie.
 */
export function trackEvent(type: string, meta?: Record<string, unknown>): void {
  const payload: TrackPayload = { type, meta };
  void send(payload);
}

function getOrCreate(key: string, factory: () => string): string {
  if (typeof window === "undefined") return "";
  let val = localStorage.getItem(key);
  if (!val) {
    val = factory();
    try { localStorage.setItem(key, val); } catch { /* quota */ }
  }
  return val;
}

function randId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function send(payload: TrackPayload) {
  try {
    const visitorId = getOrCreate("mytijaara_vid", randId);
    const sessionId = getOrCreate("mytijaara_sid", randId);
    await apiCall("/events", {
      method: "POST",
      public: true,
      body: {
        type: payload.type,
        visitorId,
        sessionId,
        path: typeof window !== "undefined" ? window.location.pathname : "/",
        referrer: typeof document !== "undefined" ? document.referrer : "",
        meta: payload.meta,
      },
    });
  } catch {
    // swallow — tracking must never block or surface errors to users
  }
}
