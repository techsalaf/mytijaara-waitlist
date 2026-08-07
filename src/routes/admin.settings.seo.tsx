import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * SEO is now managed exclusively via the CMS section so that the landing page
 * loader (which reads from /cms) and the admin editor stay in sync.
 *
 * Redirect any visitor hitting /admin/settings/seo straight to the canonical
 * CMS SEO editor at /admin/cms/seo.
 */
export const Route = createFileRoute("/admin/settings/seo")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/cms/seo", replace: true });
  },
  component: () => null,
});
