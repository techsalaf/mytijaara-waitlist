import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { normalizeLaunchConfig } from "@/lib/launch/config";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { PublicLayout } from "@/components/landing/public-layout";

export const Route = createFileRoute("/cookies")({
  loader: async () => {
    const [launchRaw, cmsRaw, brandingResult] = await Promise.all([
      serverGet<unknown>("/launch-config"),
      serverGet<{ data: Record<string, CmsSection> }>("/cms"),
      settingsApi.publicSettings().catch(() => null),
    ]);
    const cms = (cmsRaw as { data: Record<string, CmsSection> })?.data ?? {};
    const branding = (brandingResult as { data: PublicBranding } | null)?.data;
    return { launchConfig: normalizeLaunchConfig(launchRaw), serverNow: Date.now(), cms, branding };
  },
  head: () => ({
    meta: [
      { title: "Cookie Policy — MyTijaara" },
      { name: "description", content: "How MyTijaara uses cookies and similar tracking technologies on its platform." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <PublicLayout cmsData={cms} branding={branding}>
        <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32">
          <LegalHeader title="Cookie Policy" updated="1 August 2026" />
            <Section title="1. What are cookies?">
              <p>Cookies are small text files stored on your device when you visit a website. They help us recognise you, remember your preferences, and understand how you use MyTijaara.</p>
            </Section>
            <Section title="2. Cookies we use">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 font-semibold">Type</th>
                      <th className="pb-2 pr-4 font-semibold">Purpose</th>
                      <th className="pb-2 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="py-3 pr-4 font-medium">Essential</td>
                      <td className="py-3 pr-4 text-muted-foreground">Keep you logged in, protect against CSRF attacks, maintain your cart and session state.</td>
                      <td className="py-3 text-muted-foreground">Session / 30 days</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium">Analytics</td>
                      <td className="py-3 pr-4 text-muted-foreground">Count page visits, measure load times, and understand which features are most used — all aggregated, never tied to individuals.</td>
                      <td className="py-3 text-muted-foreground">Up to 2 years</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-medium">Preference</td>
                      <td className="py-3 pr-4 text-muted-foreground">Remember your theme (light/dark), language, and display settings.</td>
                      <td className="py-3 text-muted-foreground">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>
            <Section title="3. Third-party cookies">
              <p>We use a small number of trusted third-party services that may set their own cookies:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong>Vercel Analytics</strong> — aggregated, cookie-free visit counts. No individual tracking.</li>
                <li><strong>Payment processors</strong> (Paystack / Flutterwave) — fraud-prevention tokens scoped to the payment iframe.</li>
              </ul>
              <p className="mt-2">We do not use advertising or social media tracking cookies.</p>
            </Section>
            <Section title="4. Managing cookies">
              <p>Essential cookies cannot be disabled — the platform won't function without them. You can opt out of analytics and preference cookies at any time:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong>Browser settings</strong> — all major browsers let you block or delete cookies. See your browser's help documentation.</li>
                <li><strong>In-app settings</strong> — once you have an account, visit Settings &rarr; Privacy to manage your choices.</li>
              </ul>
            </Section>
            <Section title="5. Changes to this policy">
              <p>We will post any updates here and, where the change is material, notify you via email. The "Last updated" date at the top always reflects the current version.</p>
            </Section>
            <Section title="6. Contact">
              <p>Questions about cookies? Email <a href="mailto:privacy@mytijaara.com" className="text-primary hover:underline">privacy@mytijaara.com</a>.</p>
            </Section>
        </main>
      </PublicLayout>
    </LaunchStateProvider>
  );
}

function LegalHeader({ title, updated }: { title: string; updated: string }) {
  return (
    <div className="mb-12 border-b border-border pb-8">
      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
        Legal
      </span>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
