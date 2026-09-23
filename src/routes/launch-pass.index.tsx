import { createFileRoute } from "@tanstack/react-router";
import { LaunchBadgeView } from "./launch-badge";
import { loadPublicPageData } from "@/lib/public-page-data";

export const Route = createFileRoute("/launch-pass/")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "Get Your Official Launch Pass • MyTijaara × TAA NATCON 2026" },
      {
        name: "description",
        content:
          "Claim your personalized MyTijaara Launch Pass for TAA NATCON 2026. Already joined? Retrieve your pass instantly. New to MyTijaara? Reserve your spot now.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Get Your Official Launch Pass • MyTijaara × TAA NATCON 2026" },
      {
        property: "og:description",
        content: "Join the launch on October 2, 2026. Retrieve your personalized pass or sign up today.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchPassIndexWrapper,
});

function LaunchPassIndexWrapper() {
  const data = Route.useLoaderData();
  return <LaunchBadgeView data={data} />;
}
