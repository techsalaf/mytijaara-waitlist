import React from "react";
import { Nav } from "./nav";
import { Footer } from "./footer";
import { ScrollToTop } from "./scroll-to-top";
import { SocialFloat } from "./social-float";
import { AiAssistant } from "./ai-assistant";
import { CmsProvider } from "@/lib/cms-context";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

interface PublicLayoutProps {
  children: React.ReactNode;
  cmsData?: Record<string, CmsSection>;
  faqs?: Faq[];
  testimonials?: Testimonial[];
  branding?: PublicBranding;
}

export function PublicLayout({
  children,
  cmsData = {},
  faqs = [],
  testimonials = [],
  branding,
}: PublicLayoutProps) {
  return (
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
  );
}
