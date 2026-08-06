import { createFileRoute } from "@tanstack/react-router";

import { serverGet } from "@/lib/api";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import { normalizeLaunchConfig, type LaunchConfiguration } from "@/lib/launch/config";
import { CmsProvider } from "@/lib/cms-context";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { LaunchCountdown } from "@/components/launch/launch-countdown";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { TrustedBy } from "@/components/landing/trusted-by";
import { Moments } from "@/components/landing/moments";
import { Services } from "@/components/landing/services";
import { Why } from "@/components/landing/why";
import { How } from "@/components/landing/how";
import { InsideTheApp } from "@/components/landing/inside-the-app";
import { BuiltForNigerians } from "@/components/landing/built-for-nigerians";
import { Partners } from "@/components/landing/partners";
import { WaitlistSection } from "@/components/landing/waitlist-section";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { AnnouncementBar } from "@/components/landing/announcement-bar";
import { AiAssistant } from "@/components/landing/ai-assistant";
import { ScrollToTop } from "@/components/landing/scroll-to-top";
import { SocialFloat } from "@/components/landing/social-float";

export const Route = createFileRoute("/")({
  /**
   * Fetch the launch config and the full CMS payload together so the first
   * painted HTML contains both admin-configured dates and all section content.
   * FAQs and testimonials come from their own tables and are fetched in
   * parallel with the CMS to avoid a waterfall.
   *
   * `serverNow` prevents the hydration mismatch (React #418) that occurs when
   * the server and client read `Date.now()` at different instants.
   */
  loader: async (): Promise<{
    launchConfig: LaunchConfiguration;
    serverNow: number;
    cms: Record<string, CmsSection>;
    faqs: Faq[];
    testimonials: Testimonial[];
  }> => {
    const [launchRaw, cmsRaw, faqsRaw, testimonialsRaw] = await Promise.all([
      serverGet<unknown>("/launch-config"),
      serverGet<{ data: Record<string, CmsSection> }>("/cms"),
      serverGet<{ data: Faq[] }>("/content/faqs"),
      serverGet<{ data: Testimonial[] }>("/content/testimonials"),
    ]);

    const cmsData = (cmsRaw as { data: Record<string, CmsSection> })?.data ?? {};
    const seoSection = cmsData["seo"]?.data as
      | { title?: string; description?: string; ogImage?: string; keywords?: string }
      | undefined;

    return {
      launchConfig: normalizeLaunchConfig(launchRaw),
      serverNow: Date.now(),
      cms: cmsData,
      faqs: (faqsRaw as { data: Faq[] })?.data ?? [],
      testimonials: (testimonialsRaw as { data: Testimonial[] })?.data ?? [],
      // Expose SEO so head() can read it synchronously.
      _seoTitle: seoSection?.title,
      _seoDescription: seoSection?.description,
      _seoOgImage: seoSection?.ogImage,
    } as ReturnType<typeof Route.useLoaderData> & {
      _seoTitle?: string;
      _seoDescription?: string;
      _seoOgImage?: string;
    };
  },
  head: ({ loaderData }) => {
    const DEFAULT_TITLE = "MyTijaara — Everything you need, all in one place";
    const DEFAULT_DESC =
      "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians.";

    // Type assertion: head() receives the full loader return, TS types it as
    // the declared return. The extended _seo* fields arrive at runtime.
    const d = loaderData as typeof loaderData & {
      _seoTitle?: string;
      _seoDescription?: string;
      _seoOgImage?: string;
    };

    const title = d._seoTitle || DEFAULT_TITLE;
    const description = d._seoDescription || DEFAULT_DESC;
    const ogImage = d._seoOgImage;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: Landing,
});

/**
 * Wrap the entire page in both LaunchStateProvider and CmsProvider so every
 * landing component can read its CMS data and its launch-phase variant from
 * context without prop drilling.
 */
function Landing() {
  const { launchConfig, serverNow, cms, faqs, testimonials } = Route.useLoaderData();

  const announcement = cms["announcement"]?.data as
    | { enabled?: boolean; text?: string; href?: string }
    | undefined;

  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <CmsProvider sections={cms} faqs={faqs} testimonials={testimonials}>
        {announcement?.enabled && (
          <AnnouncementBar text={announcement.text ?? ""} href={announcement.href ?? "#waitlist"} />
        )}
        <div className="min-h-screen bg-background text-foreground">
          <Nav />
          <main>
            <Hero />
            <TrustedBy />
            <LaunchCountdown />
            <Moments />
            <Services />
            <Why />
            <How />
            <InsideTheApp />
            <BuiltForNigerians />
            <Partners />
            <WaitlistSection />
            <FAQ />
          </main>
          <Footer />
        </div>
        {/* Floating UI — outside the scrollable content div, still inside providers */}
        <AiAssistant />
        <ScrollToTop />
        <SocialFloat />
      </CmsProvider>
    </LaunchStateProvider>
  );
}
