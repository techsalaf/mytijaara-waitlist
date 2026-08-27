/**
 * Data room layout route.
 *
 * The `robots` meta is the only thing this file adds beyond an `<Outlet />`, and
 * it is not a security control. `/dataroom` is absent from the navbar, the
 * footer, the sitemap and every public CTA, but none of that is what keeps the
 * documents safe: the server authorizes every request on its own. Assume the URL
 * is public knowledge, because eventually it is.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dataroom")({
  head: () => ({
    meta: [
      { title: "Investor Data Room — MyTijaara" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "googlebot", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: () => <Outlet />,
});
