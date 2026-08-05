import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  CELEBRATION_COLORS,
  __setConfettiLoader,
  celebrate,
  celebrateOnce,
  celebrationKey,
  hasCelebrated,
  markCelebrated,
  prefersReducedMotion,
} from "./celebrate";

const LAUNCH = "2026-10-02T10:00:00+01:00";

/** Records every confetti call so the sequence can be asserted. */
function fakeConfetti() {
  const calls: Record<string, unknown>[] = [];
  const fn = vi.fn((options: Record<string, unknown>) => {
    calls.push(options);
  });
  __setConfettiLoader(async () => fn as never);
  return { calls, fn };
}

/** Sets the reduced-motion answer for the whole test. */
function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  setReducedMotion(false);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  __setConfettiLoader(null);
});

describe("first-time bookkeeping", () => {
  it("keys the memory by launch instant, so moving the date re-arms it", () => {
    expect(celebrationKey(LAUNCH)).toBe(`mytijaara_celebrated:${LAUNCH}`);

    markCelebrated(LAUNCH);

    expect(hasCelebrated(LAUNCH)).toBe(true);
    // An admin who reschedules the launch gets every visitor one fresh
    // celebration instead of a ribbon that can never fire again.
    expect(hasCelebrated("2027-01-01T00:00:00+01:00")).toBe(false);
  });

  it("treats an unwritable store as 'not yet' instead of throwing", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(hasCelebrated(LAUNCH)).toBe(false);
    expect(() => markCelebrated(LAUNCH)).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("prefersReducedMotion", () => {
  it("reads the media query", () => {
    setReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    setReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("celebrate", () => {
  it("fires an opening burst immediately", async () => {
    const { calls } = fakeConfetti();

    celebrate();
    await vi.advanceTimersByTimeAsync(0);

    // The opening burst is first; the first cannon volley is scheduled at 0ms so
    // it lands on the same tick.
    expect(calls[0]).toMatchObject({ particleCount: 140, spread: 100 });
    expect(calls[0].colors).toEqual(CELEBRATION_COLORS);
    expect(calls[0].origin).toEqual({ x: 0.5, y: 0.18 });
  });

  it("streams the side cannons instead of stopping after one pop", async () => {
    const { calls } = fakeConfetti();

    celebrate();
    await vi.advanceTimersByTimeAsync(3000);

    // The old version made exactly 2 calls, which is what read as a glitch.
    expect(calls.length).toBeGreaterThan(20);
    // Two cannons, mirrored angles.
    expect(calls.some((c) => c.angle === 62 && c.origin && (c.origin as { x: number }).x === 0)).toBe(true);
    expect(calls.some((c) => c.angle === 118 && c.origin && (c.origin as { x: number }).x === 1)).toBe(true);
  });

  it("tapers the cannon volleys so the tail reads as an ending", async () => {
    const { calls } = fakeConfetti();

    celebrate();
    await vi.advanceTimersByTimeAsync(3000);

    const cannons = calls.filter((c) => c.angle === 62);
    const counts = cannons.map((c) => c.particleCount as number);
    expect(counts[0]).toBeGreaterThan(counts[counts.length - 1]);
    // Never drops to zero particles, which would be a wasted call.
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(6);
  });

  it("adds a slow gold drift from the top edge", async () => {
    const { calls } = fakeConfetti();

    celebrate();
    await vi.advanceTimersByTimeAsync(3000);

    const drift = calls.find((c) => c.startVelocity === 12);
    expect(drift).toBeDefined();
    expect(drift!.colors).toEqual(["#c9a24c", "#f4e4bc"]);
    expect(drift!.origin).toEqual({ x: 0.5, y: 0 });
  });

  it("does nothing at all under reduced motion", async () => {
    setReducedMotion(true);
    const { calls } = fakeConfetti();

    const run = celebrate();
    await vi.advanceTimersByTimeAsync(3000);

    expect(run.started).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("stop() cancels pending volleys, so an unmount mid-sequence goes quiet", async () => {
    const { calls } = fakeConfetti();

    const run = celebrate();
    await vi.advanceTimersByTimeAsync(0);
    const afterOpening = calls.length;
    run.stop();
    await vi.advanceTimersByTimeAsync(3000);

    expect(calls.length).toBe(afterOpening);
  });

  it("survives a failed confetti chunk without throwing", async () => {
    __setConfettiLoader(async () => {
      throw new Error("chunk load failed");
    });

    expect(() => celebrate()).not.toThrow();
    await vi.advanceTimersByTimeAsync(3000);
  });
});

describe("celebrateOnce", () => {
  it("runs the first time and records the visitor", async () => {
    const { calls } = fakeConfetti();

    const run = celebrateOnce(LAUNCH);
    await vi.advanceTimersByTimeAsync(0);

    expect(run.started).toBe(true);
    expect(calls.length).toBeGreaterThan(0);
    expect(hasCelebrated(LAUNCH)).toBe(true);
  });

  it("is a no-op on the second call, so the ticker and banner cannot double-fire", async () => {
    const { calls } = fakeConfetti();

    celebrateOnce(LAUNCH);
    await vi.advanceTimersByTimeAsync(3000);
    const first = calls.length;

    const second = celebrateOnce(LAUNCH);
    await vi.advanceTimersByTimeAsync(3000);

    expect(second.started).toBe(false);
    expect(calls.length).toBe(first);
  });

  it("does not burn the one celebration on a reduced-motion visitor", async () => {
    setReducedMotion(true);
    fakeConfetti();

    celebrateOnce(LAUNCH);

    // Nothing was shown, so nothing was spent: if they turn the setting off they
    // still get their celebration.
    expect(hasCelebrated(LAUNCH)).toBe(false);
  });
});
