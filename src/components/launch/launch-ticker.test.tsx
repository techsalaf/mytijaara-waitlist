import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { LaunchTicker } from "./launch-ticker";
import { LaunchStateProvider } from "./launch-state-provider";
import { __setConfettiLoader } from "@/lib/launch/celebrate";
import {
  DEFAULT_LAUNCH_CONFIG,
  type LaunchConfiguration,
} from "@/lib/launch/config";

const DAY = 24 * 60 * 60 * 1000;
const LAUNCH_ISO = "2026-10-02T10:00:00+01:00";
const LAUNCH = new Date(LAUNCH_ISO).getTime();

/**
 * Renders the ticker with the clock pinned, so a state is chosen by moving
 * `now` rather than by pinning `launchStatus` — that exercises the same code
 * path the live site takes.
 */
function renderAt(now: number, overrides: Partial<LaunchConfiguration> = {}) {
  vi.setSystemTime(now);
  const config: LaunchConfiguration = {
    ...DEFAULT_LAUNCH_CONFIG,
    launchDateTime: LAUNCH_ISO,
    ...overrides,
  };
  return render(
    <LaunchStateProvider initialConfig={config}>
      <LaunchTicker />
    </LaunchStateProvider>,
  );
}

const confetti = vi.fn();

/**
 * Advances the fake clock inside act(), so the provider's 1s interval and the
 * celebration's scheduled volleys both flush without an act() warning.
 */
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  localStorage.clear();
  confetti.mockReset();
  __setConfettiLoader(async () => confetti as never);
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;
  // Not `shouldAdvanceTime`: the provider ticks a 1s interval, and letting it
  // fire on its own produces state updates outside act(). Every test drives the
  // clock explicitly through `tick()` instead.
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  __setConfettiLoader(null);
});

describe("LaunchTicker states", () => {
  it("counts down before launch", () => {
    renderAt(LAUNCH - 4 * DAY - 1000);

    const strip = screen.getByTestId("launch-ticker");
    expect(strip).toHaveAttribute("data-state", "counting");
    expect(strip).toHaveTextContent(/4 days to go until MyTijaara/);
  });

  it("switches to the live message during the celebration window", () => {
    renderAt(LAUNCH + 1000);

    const strip = screen.getByTestId("launch-ticker");
    expect(strip).toHaveAttribute("data-state", "live");
    expect(strip).toHaveTextContent(/MyTijaara is live/);
    expect(strip).not.toHaveTextContent(/to go until/);
  });

  it("renders nothing once the celebration window closes", () => {
    // Three days and one second after launch. Not an empty bar: the strip has to
    // be gone entirely or the page keeps a band of dead space at the top.
    renderAt(LAUNCH + 3 * DAY + 1000);

    expect(screen.queryByTestId("launch-ticker")).not.toBeInTheDocument();
  });

  it("renders nothing when the launch section is switched off", () => {
    renderAt(LAUNCH - DAY, { launchEnabled: false });

    expect(screen.queryByTestId("launch-ticker")).not.toBeInTheDocument();
  });

  it("renders nothing when the ticker itself is switched off", () => {
    renderAt(LAUNCH - DAY, {
      ticker: { ...DEFAULT_LAUNCH_CONFIG.ticker, enabled: false },
    });

    expect(screen.queryByTestId("launch-ticker")).not.toBeInTheDocument();
  });

  it("shows a live hh:mm:ss clock pre-launch and drops it once live", () => {
    const { unmount } = renderAt(LAUNCH - (2 * DAY + 3 * 60 * 60 * 1000 + 4 * 60 * 1000 + 5000));
    expect(screen.getByTestId("launch-ticker")).toHaveTextContent("03:04:05");
    unmount();

    renderAt(LAUNCH + 1000);
    // The countdown clock would read 00:00:00 after launch, so it is not rendered.
    expect(screen.getByTestId("launch-ticker").textContent).not.toMatch(/\d\d:\d\d:\d\d/);
  });

  it("links to the configured href, and renders a plain strip when it is empty", () => {
    const { unmount } = renderAt(LAUNCH - DAY);
    expect(screen.getByRole("link")).toHaveAttribute("href", "#waitlist");
    unmount();

    renderAt(LAUNCH - DAY, {
      ticker: { ...DEFAULT_LAUNCH_CONFIG.ticker, href: "" },
    });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByTestId("launch-ticker")).toBeInTheDocument();
  });
});

describe("LaunchTicker celebration", () => {
  it("fires confetti for a first-time visitor on launch day", async () => {
    renderAt(LAUNCH + 1000);

    await tick(0);

    expect(confetti).toHaveBeenCalled();
  });

  it("does not fire for a visitor who already celebrated this launch", async () => {
    localStorage.setItem(`mytijaara_celebrated:${LAUNCH_ISO}`, "1");

    renderAt(LAUNCH + 1000);
    await tick(3000);

    expect(confetti).not.toHaveBeenCalled();
  });

  it("does not fire before launch", async () => {
    renderAt(LAUNCH - DAY);
    await tick(3000);

    expect(confetti).not.toHaveBeenCalled();
  });

  it("does not fire when the admin turned ticker confetti off", async () => {
    renderAt(LAUNCH + 1000, {
      ticker: { ...DEFAULT_LAUNCH_CONFIG.ticker, confetti: false },
    });
    await tick(3000);

    expect(confetti).not.toHaveBeenCalled();
  });
});

describe("LaunchTicker dismissal", () => {
  it("hides the strip and remembers the choice across loads", async () => {
    const { unmount } = renderAt(LAUNCH - DAY);

    // fireEvent, not userEvent: userEvent's own timers deadlock against the
    // non-advancing fake clock this file needs for the provider's interval.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    });
    expect(screen.queryByTestId("launch-ticker")).not.toBeInTheDocument();

    unmount();
    renderAt(LAUNCH - DAY);
    // Remembered in localStorage, so a new tab does not bring it back.
    expect(screen.queryByTestId("launch-ticker")).not.toBeInTheDocument();
  });

  it("renders on the first paint even with a dismissal on record, then hides", () => {
    // Reading localStorage during render would make the server HTML and the first
    // client render disagree, which is the hydration mismatch this page had.
    localStorage.setItem("mytijaara_ticker_dismissed", "1");

    renderAt(LAUNCH - DAY);

    expect(screen.queryByTestId("launch-ticker")).not.toBeInTheDocument();
  });
});
