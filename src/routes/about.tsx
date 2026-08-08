import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import type { CmsSection } from "@/lib/api";
import { CmsProvider } from "@/lib/cms-context";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { ScrollToTop } from "@/components/landing/scroll-to-top";
import { About } from "@/components/about/about";

export const Route = createFileRoute("/about")({
  loader: async () => {
    const cmsRaw = await serverGet<{ data: Record<string, CmsSection> }>("/cms");
    const cmsData = (cmsRaw as { data: Record<string, CmsSection> })?.data ?? {};
    return { cmsData, serverNow: Date.now() };
  },
  component: AboutPage,
});

function AboutPage() {
  const { cmsData } = Route.useLoaderData();
  return (
    <CmsProvider sections={cmsData} faqs={[]} testimonials={[]}>
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <About />
        <Footer />
        <ScrollToTop />
      </div>
    </CmsProvider>
  );
}
