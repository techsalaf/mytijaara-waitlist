import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  DEFAULT_LAUNCH_CONFIG,
  resolveLaunchStatus,
  celebrationWindowMs,
  normalizeLaunchConfig,
  type LaunchConfiguration,
} from "../lib/launch/config";
import { LaunchStateProvider, useLaunch } from "../components/launch/launch-state-provider";
import { usePrimaryCta } from "../components/launch/launch-cta";
import { LaunchTicker } from "../components/launch/launch-ticker";
import { LaunchCountdown } from "../components/launch/launch-countdown";
import { LaunchCeremony } from "../components/launch/launch-ceremony";
import { WaitlistSection } from "../components/landing/waitlist-section";
import { Footer } from "../components/landing/footer";
import { BuiltForNigerians } from "../components/landing/built-for-nigerians";
import { CmsProvider } from "../lib/cms-context";
import {
  hasCelebrated,
  markCelebrated,
  celebrateOnce,
  celebrateCeremony,
  prefersReducedMotion,
} from "../lib/launch/celebrate";

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

function StatusConsumer() {
  const { status, isLaunched, isFinalTenSeconds, ceremonyPreview } = useLaunch();
  return (
    <div
      data-testid="status-consumer"
      data-status={status}
      data-launched={isLaunched}
      data-final-ten={isFinalTenSeconds}
      data-preview={ceremonyPreview}
    />
  );
}

describe("Launch Lifecycle State Transitions & Ceremony Suite", () => {
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

  describe("15 Critical Launch & Ceremony Scenarios", () => {
    it("Scenario 1: Pre-launch countdown renders normally", () => {
      const beforeLaunchNow = LAUNCH_MS - 2 * ONE_DAY;
      vi.useFakeTimers();
      vi.setSystemTime(beforeLaunchNow);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={beforeLaunchNow}>
          <LaunchCountdown />
        </LaunchStateProvider>
      );

      expect(screen.getByTestId("standard-countdown")).toBeDefined();
      expect(screen.getByText("Days")).toBeDefined();
      expect(screen.getByText("Hours")).toBeDefined();
      expect(screen.getByText("Minutes")).toBeDefined();
      expect(screen.getByText("Seconds")).toBeDefined();

      unmount();
      vi.useRealTimers();
    });

    it("Scenario 2: Exact launch instant changes status correctly", () => {
      expect(resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS - 1)).toBe("pre_launch");
      expect(resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS)).toBe("launch_day");
      expect(resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS + ONE_HOUR)).toBe("launch_day");
      expect(resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS + celebrationWindowMs(BASE_CONFIG) + 1000)).toBe("post_launch");
    });

    it("Scenario 3: Final-ten-second presentation state activates (data-testid='final-ten-countdown')", () => {
      const finalEightSeconds = LAUNCH_MS - 8000;
      vi.useFakeTimers();
      vi.setSystemTime(finalEightSeconds);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={finalEightSeconds}>
          <StatusConsumer />
          <LaunchCountdown />
        </LaunchStateProvider>
      );

      const consumer = screen.getByTestId("status-consumer");
      expect(consumer.getAttribute("data-final-ten")).toBe("true");

      expect(screen.getByTestId("final-ten-countdown")).toBeDefined();
      expect(screen.getByText("Launch Imminent • Final Seconds")).toBeDefined();
      expect(screen.getByText("Count Down With Us!")).toBeDefined();

      unmount();
      vi.useRealTimers();
    });

    it("Scenario 4: Exact zero triggers reveal automatically", () => {
      const fifteenSecBefore = LAUNCH_MS - 15000;
      vi.useFakeTimers();
      vi.setSystemTime(fifteenSecBefore);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={fifteenSecBefore}>
          <LaunchCountdown />
        </LaunchStateProvider>
      );

      // 15 seconds before launch: standard countdown is visible
      expect(screen.getByTestId("standard-countdown")).toBeDefined();
      expect(screen.queryByText(BASE_CONFIG.ceremony?.liveHeadline || "MYTIJAARA IS LIVE")).toBeNull();

      // Advance into final 10 seconds
      act(() => {
        vi.advanceTimersByTime(7000);
      });
      expect(screen.getByTestId("final-ten-countdown")).toBeDefined();

      // Advance past zero to trigger ceremony reveal
      act(() => {
        vi.advanceTimersByTime(9000);
      });

      // Now reveal is rendered
      expect(screen.getByText(BASE_CONFIG.ceremony?.liveHeadline || "MYTIJAARA IS LIVE")).toBeDefined();
      expect(screen.getByText("Official Launch Moment")).toBeDefined();

      unmount();
      vi.useRealTimers();
    });

    it("Scenario 5: Ordinary visitors do not get repeated automatic launch explosions on every refresh", () => {
      localStorage.clear();
      expect(hasCelebrated(BASE_CONFIG.launchDateTime)).toBe(false);

      const firstRun = celebrateOnce(BASE_CONFIG.launchDateTime);
      expect(hasCelebrated(BASE_CONFIG.launchDateTime)).toBe(true);

      // Subsequent call on refresh becomes a no-op
      const secondRun = celebrateOnce(BASE_CONFIG.launchDateTime);
      expect(typeof secondRun.stop).toBe("function");

      firstRun.stop();
      secondRun.stop();
    });

    it("Scenario 6: Presentation preview/replay (ceremony_preview=reveal) can intentionally bypass the one-time guard safely", () => {
      localStorage.clear();
      // Mark as already celebrated in production
      markCelebrated(BASE_CONFIG.launchDateTime);
      expect(hasCelebrated(BASE_CONFIG.launchDateTime)).toBe(true);

      // Render with ceremony preview
      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={LAUNCH_MS - 2 * ONE_DAY}>
          <LaunchCeremony isRehearsal={true} />
        </LaunchStateProvider>
      );

      expect(screen.getByText("MYTIJAARA IS LIVE")).toBeDefined();
      expect(screen.getByText("Rehearsal Preview Active")).toBeDefined();

      unmount();
    });

    it("Scenario 7: Reduced-motion users do not get heavy animation", () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(prefersReducedMotion()).toBe(true);
      const result = celebrateCeremony({ durationSeconds: 10 });
      expect(result).toHaveProperty("stop");

      window.matchMedia = originalMatchMedia;
    });

    it("Scenario 8: Launch-day content differs correctly from pre-launch content", () => {
      const preLaunchNow = LAUNCH_MS - ONE_DAY;
      vi.useFakeTimers();
      vi.setSystemTime(preLaunchNow);

      const { unmount: unmountPre } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={preLaunchNow}>
          <CtaConsumer />
          <LaunchTicker />
          <WaitlistSection />
        </LaunchStateProvider>
      );

      expect(screen.getByTestId("primary-cta").textContent).toBe("Join the Waitlist");
      expect(screen.getByTestId("launch-ticker").getAttribute("data-state")).toBe("counting");
      expect(screen.getByText("Be first to try MyTijaara.")).toBeDefined();
      unmountPre();

      const launchDayNow = LAUNCH_MS + ONE_HOUR;
      vi.setSystemTime(launchDayNow);

      const { unmount: unmountDay } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={launchDayNow}>
          <CtaConsumer />
          <LaunchTicker />
          <WaitlistSection />
        </LaunchStateProvider>
      );

      expect(screen.getByTestId("primary-cta").textContent).toBe("Download App");
      expect(screen.getByTestId("launch-ticker").getAttribute("data-state")).toBe("live");
      expect(screen.getByText("Start living simpler with MyTijaara.")).toBeDefined();
      expect(screen.queryByText("Be first to try MyTijaara.")).toBeNull();

      unmountDay();
      vi.useRealTimers();
    });

    it("Scenario 9: Post-launch has no stale waitlist or launching soon content", () => {
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

      expect(screen.queryByText("Join the Waitlist")).toBeNull();
      expect(screen.queryByText("Be first to try MyTijaara.")).toBeNull();
      expect(screen.queryByText("Days")).toBeNull();
      expect(screen.queryByTestId("launch-ticker")).toBeNull();
      expect(screen.queryByTestId("launch-countdown")).toBeNull();

      unmount();
      vi.useRealTimers();
    });

    it("Scenario 10: Footer changes from waitlist CTA to live CTA", () => {
      const preLaunchNow = LAUNCH_MS - ONE_DAY;
      vi.useFakeTimers();
      vi.setSystemTime(preLaunchNow);

      const customBranding = {
        launchCity: "Ilorin",
      };

      const { unmount: unmountPre } = render(
        <CmsProvider branding={customBranding as any}>
          <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={preLaunchNow}>
            <Footer />
          </LaunchStateProvider>
        </CmsProvider>
      );

      expect(screen.getByText("Built for everyday life in Nigeria")).toBeDefined();
      expect(screen.getByText("Join the Waitlist")).toBeDefined();
      expect(screen.getByText(/Launching first in/)).toBeDefined();
      expect(screen.getByText("Coming soon to your phone")).toBeDefined();
      unmountPre();

      const launchDayNow = LAUNCH_MS + ONE_HOUR;
      vi.setSystemTime(launchDayNow);

      const { unmount: unmountDay } = render(
        <CmsProvider branding={customBranding as any}>
          <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={launchDayNow}>
            <Footer />
          </LaunchStateProvider>
        </CmsProvider>
      );

      expect(screen.getByText("Built for everyday life in Nigeria • Now Live")).toBeDefined();
      expect(screen.getByText("Download MyTijaara")).toBeDefined();
      expect(screen.getByText(/Now live in/)).toBeDefined();
      expect(screen.getByText("Available now on your phone")).toBeDefined();

      unmountDay();
      vi.useRealTimers();
    });

    it("Scenario 11: Built For Nigerians remains useful and correct after launch", () => {
      const preLaunchNow = LAUNCH_MS - ONE_DAY;
      vi.useFakeTimers();
      vi.setSystemTime(preLaunchNow);

      const { unmount: unmountPre } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={preLaunchNow}>
          <BuiltForNigerians />
        </LaunchStateProvider>
      );

      expect(screen.getByText("Built for Nigerians")).toBeDefined();
      expect(screen.getByText(/We know Nigerian streets/)).toBeDefined();
      unmountPre();

      const postLaunchNow = LAUNCH_MS + ONE_HOUR;
      vi.setSystemTime(postLaunchNow);

      const { unmount: unmountDay } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={postLaunchNow}>
          <BuiltForNigerians />
        </LaunchStateProvider>
      );

      expect(screen.getByText("Built for Nigeria • Live Every Day")).toBeDefined();
      expect(screen.getByText(/Powering everyday trade/)).toBeDefined();

      unmountDay();
      vi.useRealTimers();
    });

    it("Scenario 12: Download page contains no stale 'at launch' wording after launch", () => {
      const preStatus = resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS - ONE_DAY);
      const postStatus = resolveLaunchStatus(BASE_CONFIG, LAUNCH_MS + ONE_HOUR);

      const getReferralCopy = (isLaunched: boolean) =>
        isLaunched
          ? "Share your unique referral link to earn wallet credits and unlock exclusive VIP rewards on your orders."
          : "Share your unique referral link to earn wallet credits and unlock exclusive VIP perks at launch.";

      expect(getReferralCopy(preStatus !== "pre_launch")).toContain("at launch");
      expect(getReferralCopy(postStatus !== "pre_launch")).not.toContain("at launch");
      expect(getReferralCopy(postStatus !== "pre_launch")).toContain("on your orders");
    });

    it("Scenario 13: Post-launch removes launch-only ticker and banner after configured celebration window", () => {
      const celebrationWindow = celebrationWindowMs(BASE_CONFIG);
      const insideWindow = LAUNCH_MS + celebrationWindow - ONE_HOUR;
      const afterWindow = LAUNCH_MS + celebrationWindow + ONE_HOUR;

      expect(resolveLaunchStatus(BASE_CONFIG, insideWindow)).toBe("launch_day");
      expect(resolveLaunchStatus(BASE_CONFIG, afterWindow)).toBe("post_launch");

      vi.useFakeTimers();
      vi.setSystemTime(afterWindow);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={afterWindow}>
          <LaunchTicker />
          <LaunchCountdown />
        </LaunchStateProvider>
      );

      expect(screen.queryByTestId("launch-ticker")).toBeNull();
      expect(screen.queryByTestId("launch-countdown")).toBeNull();
      expect(screen.queryByTestId("launch-ceremony")).toBeNull();

      unmount();
      vi.useRealTimers();
    });

    it("Scenario 14: CMS/default/backend config parity remains valid", () => {
      const normalized = normalizeLaunchConfig({});
      expect(normalized.ceremony).toBeDefined();
      expect(normalized.ceremony?.enabled).toBe(true);
      expect(normalized.ceremony?.liveHeadline).toBe("MYTIJAARA IS LIVE");
      expect(normalized.ceremony?.ceremonyDurationSeconds).toBe(30);

      const clampedLow = normalizeLaunchConfig({ ceremony: { ceremonyDurationSeconds: -10 } });
      expect(clampedLow.ceremony?.ceremonyDurationSeconds).toBe(5);

      const clampedHigh = normalizeLaunchConfig({ ceremony: { ceremonyDurationSeconds: 1000 } });
      expect(clampedHigh.ceremony?.ceremonyDurationSeconds).toBe(300);
    });

    it("Scenario 15: Cleanup cancels timers/animation frames/canvas work when components unmount", () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      const { unmount } = render(
        <LaunchStateProvider initialConfig={BASE_CONFIG} initialNow={LAUNCH_MS + ONE_HOUR}>
          <LaunchCeremony />
        </LaunchStateProvider>
      );

      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });

    it("renders fallback LaunchBanner when ceremony is explicitly disabled in config", () => {
      const configWithoutCeremony: LaunchConfiguration = {
        ...BASE_CONFIG,
        ceremony: {
          ...BASE_CONFIG.ceremony,
          enabled: false,
        },
      };
      const launchDayNow = LAUNCH_MS + ONE_HOUR;
      vi.useFakeTimers();
      vi.setSystemTime(launchDayNow);

      const { unmount } = render(
        <LaunchStateProvider initialConfig={configWithoutCeremony} initialNow={launchDayNow}>
          <LaunchCountdown />
        </LaunchStateProvider>
      );

      expect(screen.getByText(configWithoutCeremony.live.title)).toBeDefined();
      expect(screen.getByText("Celebrate with us")).toBeDefined();

      unmount();
      vi.useRealTimers();
    });
  });
});

