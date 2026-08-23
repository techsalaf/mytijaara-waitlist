import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { settingsApi } from "@/lib/api/settings";
import type { PublicBranding } from "@/lib/api/settings";
import { CmsProvider } from "@/lib/cms-context";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

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
    <CmsProvider branding={branding}>
      <AnalyticsProvider>
        <div className="grid min-h-screen lg:grid-cols-2">
          <div className="relative hidden overflow-hidden bg-primary-gradient lg:block">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage:
                "radial-gradient(circle at 20% 10%, rgba(212,160,23,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15), transparent 40%)",
            }} />
            <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
              <Link to="/" className="flex items-center gap-2">
                {branding?.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding?.siteName || "MyTijaara"} className="h-8 w-auto object-contain" />
                ) : null}
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-widest text-gold">Admin Panel</div>
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
          <div className="flex flex-col justify-between px-6 py-12">
            <div className="flex justify-start lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                {branding?.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding?.siteName || "MyTijaara"} className="h-8 w-auto object-contain" />
                ) : null}
              </Link>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="w-full max-w-md">
                <Outlet />
              </div>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {branding?.siteName || "MyTijaara"}. All rights reserved.
            </div>
          </div>
        </div>
      </AnalyticsProvider>
    </CmsProvider>
  );
}
