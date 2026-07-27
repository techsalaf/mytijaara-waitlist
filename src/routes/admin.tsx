import { createFileRoute } from "@tanstack/react-router";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — MyTijaara" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminAuthGate>
      <AdminShell />
    </AdminAuthGate>
  ),
});
