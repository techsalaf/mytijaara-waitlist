import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { LaunchStateProvider } from "./launch-state-provider";
import { LaunchCountdown } from "./launch-countdown";
import { LaunchTicker } from "./launch-ticker";
import { Footer } from "@/components/landing/footer";
import {
  DEFAULT_LAUNCH_CONFIG,
  type LaunchConfiguration,
} from "@/lib/launch/config";

/**
 * React minified error #418 — "hydration failed because the server rendered text
 * didn't match the client" — fired on every landing page load.
 *
 * Cause: the countdown digits, the ticker's hh:mm:ss badge and the footer's
 * copyright year were all text derived from the current instant, and the client
 * read the clock again during its first render. Between the server writing the
 * HTML and the browser hydrating it, at least the seconds digit had moved on, so
 * the two never agreed.
 *
 * The fix is a single clock reading taken in the route's SSR loader and passed
 * down as `initialNow`. These tests pin that property: markup produced with an
 * `initialNow` must not depend on what `Date.now()` says at render time.
 *
 * Rendering the tree twice at two different wall-clock instants and comparing
 * the strings is the whole test. It is the same comparison React performs during
 * hydration, minus the DOM.
 */

const LAUNCH_ISO = "2026-10-02T10:00:00+01:00";
const LAUNCH = new Date(LAUNCH_ISO).getTime();
const DAY = 24 * 60 * 60 * 1000;

/** The server render happens here. */
const SERVER_TIME = LAUNCH - (4 * DAY + 3 * 60 * 60 * 1000 + 30 * 1000);
/** The client hydrates 7.4s later: slow response, parse, hydrate. */
const CLIENT_TIME = SERVER_TIME + 7_400;

const CONFIG: LaunchConfiguration = {
  ...DEFAULT_LAUNCH_CONFIG,
  launchDateTime: LAUNCH_ISO,
};

/**
 * Every date-derived component on the landing page, in one tree. `Footer` is in
 * here because its copyright year is the other clock read that render touched.
 */
function Tree({ initialNow }: { initialNow?: number }) {
  return (
    <LaunchStateProvider initialConfig={CONFIG} initialNow={initialNow}>
      <LaunchTicker />
      <LaunchCountdown />
      <Footer />
    </LaunchStateProvider>
  );
}

/** Renders the tree as the server would, with the clock pinned to `at`. */
function markupAt(at: number, initialNow?: number): string {
  vi.setSystemTime(at);
  return renderToStaticMarkup(<Tree initialNow={initialNow} />);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("landing page hydration stability", () => {
  it("renders identical markup on the server and on the client's first paint", () => {
    const server = markupAt(SERVER_TIME, SERVER_TIME);
    const client = markupAt(CLIENT_TIME, SERVER_TIME);

    expect(client).toBe(server);
  });

  it("would have diverged without the seeded clock, which is the bug this guards", () => {
    // Not a tautology: it proves the assertion above is actually load-bearing.
    // Drop `initialNow` and the same two instants produce different text.
    const server = markupAt(SERVER_TIME);
    const client = markupAt(CLIENT_TIME);

    expect(client).not.toBe(server);
  });

  it("puts the real launch date in the server HTML, not the placeholder", () => {
    // The other half of the same symptom: the countdown flashed November before
    // snapping to the admin-configured date. If the date is in the SSR markup
    // there is nothing to snap from.
    const server = markupAt(SERVER_TIME, SERVER_TIME);

    expect(server).toContain("2 October 2026");
    expect(server).not.toContain("November");
  });

  it("agrees on the countdown digits, down to the seconds", () => {
    const server = markupAt(SERVER_TIME, SERVER_TIME);

    // 4 days, 3 hours, 0 minutes, 30 seconds before launch.
    expect(server).toContain(">04<");
    expect(server).toContain(">03<");
    expect(server).toContain(">30<");
  });

  it("agrees on the footer year across a new-year boundary", () => {
    // Local time, not UTC: `getFullYear()` is local, so a UTC instant would make
    // this assertion depend on the machine's timezone.
    const eve = new Date(2026, 11, 31, 23, 59, 58).getTime();
    const server = markupAt(eve, eve);
    // The client hydrates four seconds later, in the next year. A bare
    // `new Date().getFullYear()` in render would print 2027 here.
    const client = markupAt(eve + 4000, eve);

    expect(server).toContain("© 2026");
    expect(client).toBe(server);
  });

  it("does not read localStorage during render, so a dismissal cannot change the HTML", () => {
    localStorage.setItem("mytijaara_ticker_dismissed", "1");
    const withDismissal = markupAt(SERVER_TIME, SERVER_TIME);
    localStorage.clear();
    const without = markupAt(SERVER_TIME, SERVER_TIME);

    // The strip is in both: it hides in an effect after mount, never in render.
    expect(withDismissal).toBe(without);
    expect(without).toContain('data-testid="launch-ticker"');
  });

  it("falls back to the live clock when no server reading is supplied", () => {
    // Any component tree that mounts the provider without a loader (a test, a
    // story, a future route) still counts down correctly.
    const markup = markupAt(SERVER_TIME);

    expect(markup).toContain(">04<");
  });
});
