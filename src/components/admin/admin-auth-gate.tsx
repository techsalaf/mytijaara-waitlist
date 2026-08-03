import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { getSession, getToken, restoreSession, signOut } from "@/lib/auth";
import { authApi } from "@/lib/api";
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
    let active = true;

    const verifySession = async () => {
      const sessionExists = Boolean(getSession());
      const tokenExists = Boolean(getToken());
      if (!sessionExists && !tokenExists) {
        navigate({ to: "/auth/login" });
        return;
      }

      try {
        if (!sessionExists && tokenExists) {
          await restoreSession();
        } else {
          await authApi.me();
        }
        if (active) setState("authed");
      } catch {
        await signOut();
        if (active) navigate({ to: "/auth/session-expired", replace: true });
      }
    };

    initTheme();
    void verifySession();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (state !== "authed") return <AdminSkeleton />;
  return <>{children}</>;
}
