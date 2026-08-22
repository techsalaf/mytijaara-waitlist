import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useBranding } from "@/lib/cms-context";
import { trackEvent } from "@/lib/analytics/track";
import { referralsApi } from "@/lib/api";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: ((...args: any[]) => void) & { queue?: any[]; callMethod?: (...args: any[]) => any; loaded?: boolean; version?: string; push?: (...args: any[]) => void };
    _fbq?: unknown;
  }
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { googleAnalyticsId, metaPixelId } = useBranding();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const gaLoaded = useRef(false);
  const fbLoaded = useRef(false);
  const referralVisitTracked = useRef(false);

  // Initialize GA
  useEffect(() => {
    if (!googleAnalyticsId || typeof window === "undefined" || gaLoaded.current) return;
    try {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", googleAnalyticsId, { send_page_view: false });

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`;
      script.onerror = () => {
        console.warn("[Analytics] Google Analytics script blocked by client or network.");
      };
      document.head.appendChild(script);
      gaLoaded.current = true;
    } catch (err) {
      console.warn("[Analytics] GA initialization failed:", err);
    }
  }, [googleAnalyticsId]);

  // Initialize Meta Pixel
  useEffect(() => {
    if (!metaPixelId || typeof window === "undefined" || fbLoaded.current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fbqFn: any = function (...args: unknown[]) {
        if (fbqFn.callMethod) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          fbqFn.callMethod.apply(fbqFn, args);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          fbqFn.queue.push(args);
        }
      };
      if (!window.fbq) window.fbq = fbqFn;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      fbqFn.push = fbqFn;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      fbqFn.loaded = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      fbqFn.version = "2.0";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      fbqFn.queue = [];

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.onerror = () => {
        console.warn("[Analytics] Meta Pixel script blocked by client or network.");
      };
      document.head.appendChild(script);

      if (window.fbq && typeof window.fbq === "function") {
        window.fbq("init", metaPixelId);
      }
      fbLoaded.current = true;
    } catch (err) {
      console.warn("[Analytics] Meta Pixel initialization failed:", err);
    }
  }, [metaPixelId]);

  
  // Track SPA route changes as pageviews + backend pageview tracking
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Extract UTM params from current URL for this pageview event
    const utm_source = (new URLSearchParams(window.location.search)).get("utm_source") || (new URLSearchParams(window.location.search)).get("source") || null;
    const utm_medium = (new URLSearchParams(window.location.search)).get("utm_medium") || null;
    const utm_campaign = (new URLSearchParams(window.location.search)).get("utm_campaign") || null;

    // Track pageview to backend with UTM params
    trackEvent("pageview", { path: location, utm_source, utm_medium, utm_campaign });

    if (googleAnalyticsId && window.gtag) {
      try {
        window.gtag("config", googleAnalyticsId, { page_path: location });
      } catch {
        // Silently ignore if adblocker blocked the script
      }
    }

    if (metaPixelId && window.fbq) {
      try {
        window.fbq("track", "PageView");
      } catch {
        // Silently ignore if adblocker blocked the script
      }
    }
  }, [location, googleAnalyticsId, metaPixelId]);

  // Track referral visits once on mount
  useEffect(() => {
    if (typeof window === "undefined" || referralVisitTracked.current) return;

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    const utmSource = params.get("utm_source") || params.get("source");

    if (refCode) {
      void referralsApi.visit(refCode, utmSource ?? undefined);
      referralVisitTracked.current = true;
    }
  }, []);

  return <>{children}</>;
}
