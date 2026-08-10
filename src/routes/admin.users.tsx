import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "Users — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: UsersLayout,
});

function UsersLayout() {
  return <Outlet />;
}
