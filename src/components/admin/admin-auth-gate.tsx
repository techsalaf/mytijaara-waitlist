import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { getSession } from "@/lib/auth-mock";
import { AdminSkeleton } from "./admin-skeleton";
import { initTheme } from "@/lib/theme";

/**
 * Single auth boundary for the entire /admin subtree.
 *
 * Everything under `/admin` renders inside this gate, so the backend agent
 * only has to swap `getSession()` for a real session check (and ideally add a
 * server-side `beforeLoad` redirect) in ONE place — no per-route changes.
 */
export function AdminAuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "authed">("checking");

  useEffect(() => {
    initTheme();
    if (getSession()) {
      setState("authed");
    } else {
      navigate({ to: "/auth/login" });
    }
  }, [navigate]);

  if (state !== "authed") return <AdminSkeleton />;
  return <>{children}</>;
}
