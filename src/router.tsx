import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RoutePending } from "./components/route-pending";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,

    // Every route is its own chunk (155 in the build). With no preloading the
    // download only started on click, so the old page stayed on screen for
    // seconds before the new one appeared. "intent" starts the fetch on hover
    // or keyboard focus, which is normally enough lead time for the navigation
    // to feel instant.
    defaultPreload: "intent",

    // This was 0, which marked a preload stale the instant it landed, so the
    // click refetched anyway and the preload bought nothing. 30s covers
    // hover-then-click while still refetching a route opened later.
    defaultPreloadStaleTime: 30_000,

    // Render pending UI instead of holding the previous page. 80ms is below the
    // ~100ms mark where a delay reads as lag, and high enough that an
    // already-cached route does not flash a skeleton.
    defaultPendingMs: 80,
    // Once the skeleton is up, keep it up long enough not to strobe.
    defaultPendingMinMs: 320,
    defaultPendingComponent: RoutePending,
  });

  return router;
};
