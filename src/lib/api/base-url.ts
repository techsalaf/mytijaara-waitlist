/**
 * API base URL resolution.
 *
 * The browser can use a relative base (`/api/v1`) because Vite's dev proxy and
 * the production rewrite both handle it. `fetch` inside the SSR handler cannot:
 * a relative URL has no origin there. Route loaders therefore call
 * `serverApiBaseUrl()`, which turns a relative base into an absolute one using
 * the backend origin from the environment.
 */

/** Raw value as configured for the browser. May be relative or unset. */
export const API_BASE_URL: string | undefined =
  typeof import.meta !== "undefined" && import.meta.env
    ? ((import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
      undefined)
    : undefined;

/** Dev fallback origin — matches the `/api` proxy target in vite.config.ts. */
const DEV_BACKEND_ORIGIN = "http://127.0.0.1:8000";

function envOrigin(): string | undefined {
  // Nitro/Node reads server-only vars; they are never bundled into the client.
  const env = typeof process !== "undefined" ? process.env : undefined;
  const raw = env?.API_ORIGIN || env?.BACKEND_ORIGIN;
  return raw ? raw.replace(/\/+$/, "") : undefined;
}

/**
 * Absolute base URL usable from the SSR handler. Returns undefined when no
 * base is configured at all, so loaders can skip the fetch instead of throwing.
 */
export function serverApiBaseUrl(): string | undefined {
  const base = API_BASE_URL;
  if (!base) return undefined;
  if (/^https?:\/\//i.test(base)) return base;

  const origin = envOrigin() ?? (import.meta.env?.DEV ? DEV_BACKEND_ORIGIN : undefined);
  if (!origin) return undefined;

  return `${origin}${base.startsWith("/") ? base : `/${base}`}`;
}

/**
 * GET a public endpoint from the SSR handler with a hard timeout so a slow or
 * unreachable API can never hang the page render.
 */
export async function serverGet<T>(
  endpoint: string,
  timeoutMs = 2500,
): Promise<T | undefined> {
  const base = serverApiBaseUrl();
  if (!base) return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}${endpoint}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    const payload = (await response.json()) as { data?: T };
    return payload?.data;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
