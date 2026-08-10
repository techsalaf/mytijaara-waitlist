import React from "react";
import { Nav } from "./nav";
import { Footer } from "./footer";
import { ScrollToTop } from "./scroll-to-top";
import { SocialFloat } from "./social-float";
import { AiAssistant } from "./ai-assistant";
import { CmsProvider } from "@/lib/cms-context";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

interface PublicLayoutProps {
  children: React.ReactNode;
  cmsData?: Record<string, CmsSection>;
  faqs?: Faq[];
  testimonials?: Testimonial[];
}

export function PublicLayout({
  children,
  cmsData = {},
  faqs = [],
  testimonials = [],
}: PublicLayoutProps) {
  return (
    <CmsProvider sections={cmsData} faqs={faqs} testimonials={testimonials}>
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
