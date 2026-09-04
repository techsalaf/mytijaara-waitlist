import { createFileRoute } from "@tanstack/react-router";

import { loadPublicPageData } from "@/lib/public-page-data";
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
import { BrandColors } from "@/components/landing/brand-colors";
import { AiAssistant } from "@/components/landing/ai-assistant";
import { ScrollToTop } from "@/components/landing/scroll-to-top";
import { SocialFloat } from "@/components/landing/social-float";
import { Particles } from "@/components/landing/particles";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

export const Route = createFileRoute("/")({
  /**
   * Everything the page needs comes from `loadPublicPageData`, the same loader
   * every other public route uses, so the landing page cannot drift from them
   * again. `content: true` adds the FAQ and testimonial tables, which only this
   * page renders.
   *
   * The extra work here is purely SEO: `head()` cannot await, so the `seo`
   * section is flattened into `_seo*` keys the head function reads back.
   */
  loader: async () => {
    const data = await loadPublicPageData({ content: true });

    const seoSection = data.cms["seo"]?.data as
      | {
          title?: string;
          description?: string;
          canonicalUrl?: string;
          keywords?: string;
          ogTitle?: string;
          ogDescription?: string;
          ogImage?: string;
          twitterHandle?: string;
        }
      | undefined;

    const rawOgImage = seoSection?.ogImage || data.branding?.ogImageUrl || "/og-image.png";
    const canonicalUrl = seoSection?.canonicalUrl || "https://mytijaara.com";

    // og:image must be absolute for WhatsApp and the social crawlers.
    let ogImageUrl = rawOgImage;
    if (rawOgImage && !rawOgImage.startsWith("http://") && !rawOgImage.startsWith("https://")) {
      const base = canonicalUrl.replace(/\/$/, "");
      ogImageUrl = `${base}/${rawOgImage.replace(/^\//, "")}`;
    }

    return {
      ...data,
      _seoTitle: seoSection?.title,
      _seoDescription: seoSection?.description,
      _seoKeywords: seoSection?.keywords,
      _seoCanonicalUrl: canonicalUrl,
      _seoOgTitle: seoSection?.ogTitle || seoSection?.title,
      _seoOgDescription: seoSection?.ogDescription || seoSection?.description,
      _seoOgImage: ogImageUrl,
      _seoTwitterHandle: seoSection?.twitterHandle,
      _faviconUrl: data.branding?.faviconUrl,
    };
  },
  head: ({ loaderData }) => {
    const DEFAULT_TITLE = "MyTijaara — Everything you need, all in one place";
    const DEFAULT_DESC =
      "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians.";

    const d = loaderData as typeof loaderData & {
      _seoTitle?: string;
      _seoDescription?: string;
      _seoKeywords?: string;
      _seoCanonicalUrl?: string;
      _seoOgTitle?: string;
      _seoOgDescription?: string;
      _seoOgImage?: string;
      _seoTwitterHandle?: string;
      _faviconUrl?: string;
    };

    const title = d._seoTitle || DEFAULT_TITLE;
    const description = d._seoDescription || DEFAULT_DESC;
    const keywords = d._seoKeywords || "nigeria, super app, food delivery, groceries, pharmacy, artisans, logistics, car rental";
    const ogTitle = d._seoOgTitle || title;
    const ogDescription = d._seoOgDescription || description;
    const ogImage = d._seoOgImage;
    const canonicalUrl = d._seoCanonicalUrl;
    const twitterHandle = d._seoTwitterHandle;
    const faviconUrl = d._faviconUrl;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: keywords },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDescription },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "MyTijaara" },
        ...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { property: "og:image:secure_url", content: ogImage },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { property: "og:image:type", content: "image/png" },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: ogDescription },
        ...(twitterHandle ? [{ name: "twitter:site", content: twitterHandle }, { name: "twitter:creator", content: twitterHandle }] : []),
        ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
      ],
      links: [
        ...(canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : []),
        ...(faviconUrl
          ? [{ rel: "icon", href: faviconUrl }]
          : [{ rel: "icon", href: "/favicon.ico" }]),
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
  const { launchConfig, serverNow, cms, faqs, testimonials, branding } = Route.useLoaderData();

  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <BrandColors branding={branding} />
      <CmsProvider sections={cms} faqs={faqs} testimonials={testimonials} branding={branding}>
        <AnalyticsProvider>
          <Particles />
          <div className="min-h-screen bg-background text-foreground">
            {/* Nav owns the announcement strip and the launch ribbon. */}
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
        </AnalyticsProvider>
      </CmsProvider>
    </LaunchStateProvider>
  );
}
