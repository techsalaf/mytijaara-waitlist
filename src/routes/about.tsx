import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { PublicLayout } from "@/components/landing/public-layout";
import { About } from "@/components/about/about";

export const Route = createFileRoute("/about")({
  loader: async () => {
    const [cmsRaw, brandingResult] = await Promise.all([
      serverGet<Record<string, CmsSection>>("/cms"),
      settingsApi.publicSettings().catch(() => null),
    ]);
    const cmsData = (cmsRaw as Record<string, CmsSection>) ?? {};
    const branding: PublicBranding | undefined = (brandingResult as { data: PublicBranding } | null)?.data;
    return { cmsData, branding, serverNow: Date.now() };
  },
  head: () => ({
    meta: [
      { title: "About Us — MyTijaara | Everyday Commerce & Services" },
      { name: "description", content: "Learn about MyTijaara's mission to empower everyday commerce, vendors, riders, and artisans across Nigeria." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { cmsData, branding } = Route.useLoaderData();
  return (
    <PublicLayout cmsData={cmsData} branding={branding}>
      <About />
    </PublicLayout>
  );
}
