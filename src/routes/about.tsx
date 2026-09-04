import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPageData } from "@/lib/public-page-data";
import { PublicLayout } from "@/components/landing/public-layout";
import { About } from "@/components/about/about";

export const Route = createFileRoute("/about")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "About Us — MyTijaara | Everyday Commerce & Services" },
      { name: "description", content: "Learn about MyTijaara's mission to empower everyday commerce, vendors, riders, and artisans across Nigeria." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  return (
    <PublicLayout launchConfig={launchConfig} serverNow={serverNow} cmsData={cms} branding={branding}>
      <About />
    </PublicLayout>
  );
}
