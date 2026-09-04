import React from "react";
import { Nav } from "./nav";
import { Footer } from "./footer";
import { ScrollToTop } from "./scroll-to-top";
import { SocialFloat } from "./social-float";
import { AiAssistant } from "./ai-assistant";
import { BrandColors } from "./brand-colors";
import { CmsProvider } from "@/lib/cms-context";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import type { LaunchConfiguration } from "@/lib/launch/config";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

interface PublicLayoutProps {
  children: React.ReactNode;
  /**
   * Launch config resolved in the route's SSR loader. REQUIRED, not optional:
   * `Nav` renders the launch ticker and `Footer` reads the launch clock, so a
   * page that mounts this layout without launch context used to fall back to a
   * zeroed countdown and render "0 seconds to go". Making the prop required
   * means the type checker catches a new page that forgets it instead of the
   * bug surfacing in production.
   */
  launchConfig: LaunchConfiguration;
  /**
   * `Date.now()` taken in the same loader. Both the server and the client's
   * first paint render from this one number, which is what keeps the countdown
   * digits from producing a text hydration mismatch (React #418).
   */
  serverNow: number;
  cmsData?: Record<string, CmsSection>;
  faqs?: Faq[];
  testimonials?: Testimonial[];
  branding?: PublicBranding;
}

/**
 * Chrome shared by every public page except `/`, which composes its own tree
 * because it stacks extra landing-only sections.
 *
 * Provider order matters: launch state is outermost because `Nav`, `Footer` and
 * the CTAs all read it; CMS content sits inside it; analytics innermost so it
 * can read both.
 *
 * `children` must NOT contain its own `<main>` — this layout owns the single
 * `<main>` landmark for the page.
 */
export function PublicLayout({
  children,
  launchConfig,
  serverNow,
  cmsData = {},
  faqs = [],
  testimonials = [],
  branding,
}: PublicLayoutProps) {
  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <BrandColors branding={branding} />
      <CmsProvider sections={cmsData} faqs={faqs} testimonials={testimonials} branding={branding}>
        <AnalyticsProvider>
          <div className="relative min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-gold/30 selection:text-gold-foreground">
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />

            {/* Floating UI controls */}
            <SocialFloat />
            <ScrollToTop />
            <AiAssistant />
          </div>
        </AnalyticsProvider>
      </CmsProvider>
    </LaunchStateProvider>
  );
}
