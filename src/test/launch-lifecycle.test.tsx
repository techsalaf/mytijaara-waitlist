import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DEFAULT_LAUNCH_CONFIG,
  resolveLaunchStatus,
  celebrationWindowMs,
  type LaunchConfiguration,
} from "../lib/launch/config";
import { LaunchStateProvider } from "../components/launch/launch-state-provider";
import { usePrimaryCta } from "../components/launch/launch-cta";
import { LaunchTicker } from "../components/launch/launch-ticker";
import { LaunchCountdown } from "../components/launch/launch-countdown";
import { WaitlistSection } from "../components/landing/waitlist-section";

const BASE_CONFIG: LaunchConfiguration = {
  ...DEFAULT_LAUNCH_CONFIG,
  launchDateTime: "2026-10-02T10:00:00+01:00",
  launchCelebrationDays: 3,
};

const LAUNCH_MS = new Date("2026-10-02T10:00:00+01:00").getTime();
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

function CtaConsumer() {
  const cta = usePrimaryCta();
  return <div data-testid="primary-cta" data-download={cta.download} data-href={cta.href}>{cta.label}</div>;
}

describe("Launch Lifecycle State Transitions", () => {
  describe("resolveLaunchStatus logic", () => {
    it("returns pre_launch when now is before launchDateTime", () => {
      const status = resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS - ONE_HOUR);
      expect(status).toBe("pre_launch");
    });

    it("returns launch_day during the 3-day celebration window", () => {
      const atLaunch = resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS);
      expect(atLaunch).toBe("launch_day");

      const twoDaysIn = resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS + 2 * ONE_DAY);
      expect(twoDaysIn).toBe("launch_day");
    });

    it("returns post_launch after the 3-day celebration window expires", () => {
      const windowMs = celebrationWindowMs(BASE_CONFIG);
      const pastCelebration = resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS + windowMs + 1000);
      expect(pastCelebration).toBe("post_launch");
    });

    it("honors manual admin overrides for previewing", () => {
      expect(resolveLaunchStatus({ ...BASE_CONFIG, launchStatus: "pre_launch" }, LAUNCH_MS + 10 * ONE_DAY)).toBe("pre_launch");
      expect(resolveLaunchStatus({ ...BASE_CONFIG, launchStatus: "launch_day" }, LAUNCH_MS - 10 * ONE_DAY)).toBe("launch_day");
      expect(resolveLaunchStatus({ ...BASE_CONFIG, launchStatus: "post_launch" }, LAUNCH_MS - 10 * ONE_DAY)).toBe("post_launch");
    });
  });

  describe("UI components across lifecycle states", () => {
    it("Phase 1: Pre-launch renders countdown, waitlist CTA, and waitlist form", () => {
      const beforeLaunchNow = LAUNCH_MS - 2 * ONE_DAY;
      vi.useFakeTimers();
      vi.setSystemTime(beforeLaunchNow);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={beforeLaunchNow}>
          <CtaConsumer />
          <LaunchTicker />
          <LaunchCountdown />
          <WaitlistSection />
        </LaunchStateProvider>
      );

      // Primary CTA points to #waitlist
      const cta = screen.getByTestId("primary-cta");
      expect(cta.textContent).toBe("Join the Waitlist");
      expect(cta.getAttribute("data-href")).toBe("#waitlist");
      expect(cta.getAttribute("data-download")).toBe("false");

      // Ticker is in counting mode
      const ticker = screen.getByTestId("launch-ticker");
      expect(ticker.getAttribute("data-state")).toBe("counting");

      // Launch countdown section is present with days/hours
      expect(screen.getByText("Days")).toBeDefined();
      expect(screen.getByText("Hours")).toBeDefined();

      // Waitlist form is present
      expect(screen.getByText("Be first to try MyTijaara.")).toBeDefined();

      unmount();
      vi.useRealTimers();
    });

    it("Phase 2: Launch Day renders celebration live ticker, LaunchBanner, and download CTAs", () => {
      const launchDayNow = LAUNCH_MS + ONE_HOUR;
      vi.useFakeTimers();
      vi.setSystemTime(launchDayNow);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={launchDayNow}>
          <CtaConsumer />
          <LaunchTicker />
          <LaunchCountdown />
          <WaitlistSection />
        </LaunchStateProvider>
      );

      // Primary CTA automatically flips to Download App
      const cta = screen.getByTestId("primary-cta");
      expect(cta.textContent).toBe("Download App");
      expect(cta.getAttribute("data-href")).toBe("/download");
      expect(cta.getAttribute("data-download")).toBe("true");

      // Ticker is live
      const ticker = screen.getByTestId("launch-ticker");
      expect(ticker.getAttribute("data-state")).toBe("live");
      expect(ticker.textContent).toContain(BASE_CONFIG.ticker.liveText);

      // Countdown section replaced by celebration LaunchBanner
      expect(screen.getByText(BASE_CONFIG.live.title)).toBeDefined();
      expect(screen.getByText("Celebrate with us")).toBeDefined();

      // Bottom section replaced by App Download & Partner CTA
      expect(screen.getByText("Start living simpler with MyTijaara.")).toBeDefined();
      expect(screen.queryByText("Be first to try MyTijaara.")).toBeNull();

      unmount();
      vi.useRealTimers();
    });

    it("Phase 3: Post-launch cleans up banners and renders permanent tech homepage", () => {
      const postLaunchNow = LAUNCH_MS + 4 * ONE_DAY;
      vi.useFakeTimers();
      vi.setSystemTime(postLaunchNow);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={postLaunchNow}>
          <CtaConsumer />
          <LaunchTicker />
          <LaunchCountdown />
          <WaitlistSection />
        </LaunchStateProvider>
      );

      // Primary CTA stays Download App
      const cta = screen.getByTestId("primary-cta");
      expect(cta.textContent).toBe("Download App");
      expect(cta.getAttribute("data-href")).toBe("/download");

      // Ticker is completely gone (null)
      expect(screen.queryByTestId("launch-ticker")).toBeNull();

      // Countdown & LaunchBanner are completely gone (null)
      expect(screen.queryByText("Celebrate with us")).toBeNull();
      expect(screen.queryByText("Days")).toBeNull();

      // Bottom section serves permanent App Download & Partner CTA
      expect(screen.getByText("Start living simpler with MyTijaara.")).toBeDefined();

      unmount();
      vi.useRealTimers();
    });
  });
});
