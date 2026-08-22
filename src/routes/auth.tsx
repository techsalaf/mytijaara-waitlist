import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { settingsApi } from "@/lib/api/settings";
import type { PublicBranding } from "@/lib/api/settings";
import { PublicLayout } from "@/components/landing/public-layout";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  loader: async () => {
    const brandingResult = await settingsApi.publicSettings().catch(() => null);
    const branding: PublicBranding | undefined = (brandingResult as { data: PublicBranding } | null)?.data;
    return { branding };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { branding } = Route.useLoaderData();

  return (
    <PublicLayout branding={branding}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-primary-gradient lg:block">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(212,160,23,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15), transparent 40%)",
          }} />
          <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
            <Link to="/" className="flex items-center gap-2">
              <div>
                <div className="text-sm font-bold">{branding?.siteName || "MyTijaara"}</div>
                <div className="text-[10px] font-medium uppercase tracking-widest text-gold">Admin</div>
              </div>
            </Link>
            <div>
              <blockquote className="max-w-md text-2xl font-semibold leading-tight tracking-tight">
                "Everything Nigerians need in one place — and one control panel to run it all."
              </blockquote>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gold text-sm font-bold text-primary">
                  AR
                </div>
                <div>
                  <div className="text-sm font-medium">Amuda Rasheed</div>
                  <div className="text-xs text-primary-foreground/70">Founder, MyTijaara</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
