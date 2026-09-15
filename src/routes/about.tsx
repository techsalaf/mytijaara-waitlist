import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPageData } from "@/lib/public-page-data";
import { PublicLayout } from "@/components/landing/public-layout";
import { About } from "@/components/about/about";

export const Route = createFileRoute("/about")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "About Us — MyTijaara | The Gojek of Africa & Everyday Commerce" },
      {
        name: "description",
        content:
          "MyTijaara is engineering the everyday super app and WhatsApp-native commerce engine for Nigeria — empowering daily trade, meals, vetted artisans, and parcel logistics.",
      },
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
