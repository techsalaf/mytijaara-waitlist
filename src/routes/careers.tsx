import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPageData } from "@/lib/public-page-data";
import { PublicLayout } from "@/components/landing/public-layout";
import { Careers } from "@/components/careers/careers";

export const Route = createFileRoute("/careers")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "Careers — MyTijaara | Join Our Team" },
      { name: "description", content: "Build the future of everyday commerce, tech, and logistics in Nigeria with MyTijaara." },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  return (
    <PublicLayout launchConfig={launchConfig} serverNow={serverNow} cmsData={cms} branding={branding}>
      <Careers />
    </PublicLayout>
  );
}
