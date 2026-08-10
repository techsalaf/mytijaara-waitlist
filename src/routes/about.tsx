import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import type { CmsSection } from "@/lib/api";
import { PublicLayout } from "@/components/landing/public-layout";
import { About } from "@/components/about/about";

export const Route = createFileRoute("/about")({
  loader: async () => {
    const cmsRaw = await serverGet<{ data: Record<string, CmsSection> }>("/cms");
    const cmsData = (cmsRaw as { data: Record<string, CmsSection> })?.data ?? {};
    return { cmsData, serverNow: Date.now() };
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
  const { cmsData } = Route.useLoaderData();
  return (
    <PublicLayout cmsData={cmsData}>
      <About />
    </PublicLayout>
  );
}
