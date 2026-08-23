import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { PublicLayout } from "@/components/landing/public-layout";
import { Careers } from "@/components/careers/careers";

export const Route = createFileRoute("/careers")({
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
      { title: "Careers — MyTijaara | Join Our Team" },
      { name: "description", content: "Build the future of everyday commerce, tech, and logistics in Nigeria with MyTijaara." },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const { cmsData, branding } = Route.useLoaderData();
  return (
    <PublicLayout cmsData={cmsData} branding={branding}>
      <Careers />
    </PublicLayout>
  );
}
