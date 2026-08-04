import { createFileRoute } from "@tanstack/react-router";

import { serverGet } from "@/lib/api";
import { normalizeLaunchConfig, type LaunchConfiguration } from "@/lib/launch/config";
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

const TITLE = "MyTijaara — Everything you need, all in one place";
const DESCRIPTION =
  "Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars and shop from businesses around you — all from one app built for Nigerians.";

export const Route = createFileRoute("/")({
  /**
   * Resolve the launch config on the server so the admin-configured date is in
   * the first painted HTML. Without this the provider seeded from
   * DEFAULT_LAUNCH_CONFIG and swapped in the real date after the client fetch,
   * which is what made the countdown flash the wrong date on load.
   */
  loader: async (): Promise<{ launchConfig: LaunchConfiguration }> => {
    const raw = await serverGet<unknown>("/launch-config");
    return { launchConfig: normalizeLaunchConfig(raw) };
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: Landing,
});

/**
 * The whole page is wrapped in <LaunchStateProvider> so a single CMS payload
 * drives the nav CTA, the hero CTA, the countdown and whether the waitlist
 * renders at all — pre-launch, launch day and post-launch, no code change.
 */
function Landing() {
  const { launchConfig } = Route.useLoaderData();
  return (
    <LaunchStateProvider initialConfig={launchConfig}>
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
    </LaunchStateProvider>
  );
}
