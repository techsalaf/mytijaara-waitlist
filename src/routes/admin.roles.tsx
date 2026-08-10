import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — MyTijaara Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RolesLayout,
});

function RolesLayout() {
  return <Outlet />;
}
