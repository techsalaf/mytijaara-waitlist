import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import type { CmsSection } from "@/lib/api";
import { PublicLayout } from "@/components/landing/public-layout";
import { Careers } from "@/components/careers/careers";

export const Route = createFileRoute("/careers")({
  loader: async () => {
    const cmsRaw = await serverGet<{ data: Record<string, CmsSection> }>("/cms");
    const cmsData = (cmsRaw as { data: Record<string, CmsSection> })?.data ?? {};
    return { cmsData, serverNow: Date.now() };
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
  const { cmsData } = Route.useLoaderData();
  return (
    <PublicLayout cmsData={cmsData}>
      <Careers />
    </PublicLayout>
  );
}
