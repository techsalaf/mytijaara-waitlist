import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useBranding } from "@/lib/cms-context";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { gaMeasurementId, metaPixelId } = useBranding();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const gaLoaded = useRef(false);
  const fbLoaded = useRef(false);

  // Initialize GA Measurement ID
  useEffect(() => {
    if (!gaMeasurementId || typeof window === "undefined" || gaLoaded.current) return;
    try {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", gaMeasurementId, { send_page_view: false });

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
      script.onerror = () => {
        console.warn("[Analytics] Google Analytics script blocked by client or network.");
      };
      document.head.appendChild(script);
      gaLoaded.current = true;
    } catch (err) {
      console.warn("[Analytics] GA initialization failed:", err);
    }
  }, [gaMeasurementId]);

  // Initialize Meta Pixel
  useEffect(() => {
    if (!metaPixelId || typeof window === "undefined" || fbLoaded.current) return;
    try {
      /* eslint-disable */
      const fbq: any = function (...args: any[]) {
        if (fbq.callMethod) {
          fbq.callMethod.apply(fbq, args);
        } else {
          fbq.queue.push(args);
        }
      };
      if (!window.fbq) window.fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.onerror = () => {
        console.warn("[Analytics] Meta Pixel script blocked by client or network.");
      };
      document.head.appendChild(script);

      window.fbq("init", metaPixelId);
      fbLoaded.current = true;
      /* eslint-enable */
    } catch (err) {
      console.warn("[Analytics] Meta Pixel initialization failed:", err);
    }
  }, [metaPixelId]);

  // Track SPA Pageviews on Route Change
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Track GA pageview
    if (gaMeasurementId && window.gtag) {
      try {
        window.gtag("config", gaMeasurementId, { page_path: location });
      } catch {
        // Ignore adblocker blocks
      }
    }

    // Track Meta Pixel pageview
    if (metaPixelId && window.fbq) {
      try {
        window.fbq("track", "PageView");
      } catch {
        // Ignore adblocker blocks
      }
    }
  }, [location, gaMeasurementId, metaPixelId]);

  return <>{children}</>;
}
