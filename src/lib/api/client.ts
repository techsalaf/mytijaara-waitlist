/**
 * Mock API client. Every module in src/lib/api/*.ts calls `apiCall(...)`
 * to simulate a network round-trip. When you're ready to wire real endpoints,
 * replace the body of `apiCall` with a real `fetch`/`axios` call — every
 * consumer keeps working unchanged.
 */

export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

type ApiCallOptions = {
  /** Simulated latency in ms (default 300–600) */
  delay?: number;
  /** Simulate a failure ratio 0..1 for testing error states */
  failRate?: number;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function apiCall<T>(
  _endpoint: string,
  factory: () => T | Promise<T>,
  opts: ApiCallOptions = {},
): Promise<ApiResponse<T>> {
  const delay = opts.delay ?? 300 + Math.random() * 300;
  await new Promise((r) => setTimeout(r, delay));
  if (opts.failRate && Math.random() < opts.failRate) {
    throw new ApiError("Simulated failure", 500);
  }
  const data = await factory();
  return { data };
}
