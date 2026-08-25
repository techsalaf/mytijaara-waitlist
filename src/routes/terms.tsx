import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { normalizeLaunchConfig } from "@/lib/launch/config";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { PublicLayout } from "@/components/landing/public-layout";

export const Route = createFileRoute("/terms")({
  loader: async () => {
    const [launchRaw, cmsRaw, brandingResult] = await Promise.all([
      serverGet<unknown>("/launch-config"),
      serverGet<Record<string, CmsSection>>("/cms"),
      settingsApi.publicSettings().catch(() => null),
    ]);
    const cms = (cmsRaw as Record<string, CmsSection>) ?? {};
    const branding = (brandingResult as { data: PublicBranding } | null)?.data;
    return { launchConfig: normalizeLaunchConfig(launchRaw), serverNow: Date.now(), cms, branding };
  },
  head: () => ({
    meta: [
      { title: "Terms of Service — MyTijaara" },
      { name: "description", content: "The terms governing your use of MyTijaara's marketplace platform." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <PublicLayout cmsData={cms} branding={branding}>
        <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32">
          <LegalHeader title="Terms of Service" updated="1 August 2026" />
            <Section title="1. Acceptance">
              <p>By accessing or using MyTijaara, you agree to these Terms. If you disagree, do not use the platform. MyTijaara Ltd reserves the right to update these Terms; continued use after notice constitutes acceptance.</p>
            </Section>
            <Section title="2. Eligibility">
              <p>You must be at least 18 years old and capable of entering into a binding contract under Nigerian law to create an account. By registering you represent that this is the case.</p>
            </Section>
            <Section title="3. Accounts">
              <ul className="list-disc space-y-1 pl-5">
                <li>You are responsible for keeping your credentials confidential and for all activity under your account.</li>
                <li>Notify us immediately at <a href="mailto:support@mytijaara.com" className="text-primary hover:underline">support@mytijaara.com</a> of any unauthorised access.</li>
                <li>We may suspend or terminate accounts that violate these Terms or applicable law.</li>
              </ul>
            </Section>
            <Section title="4. Buyers">
              <ul className="list-disc space-y-1 pl-5">
                <li>Orders are binding once confirmed. Cancellations are subject to each vendor's policy shown at checkout.</li>
                <li>Prices, delivery fees, and estimated arrival times are displayed before you confirm payment.</li>
                <li>Dispute a transaction within 7 days of delivery by contacting <a href="mailto:support@mytijaara.com" className="text-primary hover:underline">support@mytijaara.com</a>.</li>
              </ul>
            </Section>
            <Section title="5. Vendors, riders and artisans">
              <ul className="list-disc space-y-1 pl-5">
                <li>Partner accounts are subject to a separate Partner Agreement signed during onboarding.</li>
                <li>You are responsible for the accuracy of your listings, pricing, and availability.</li>
                <li>MyTijaara may remove listings or suspend accounts that receive sustained negative feedback or violate applicable Nigerian law.</li>
              </ul>
            </Section>
            <Section title="6. Payments">
              <p>All payments are processed by licensed third-party processors (e.g. Paystack, Flutterwave). MyTijaara does not store full card or bank account numbers. Disputes about charges should be raised with our support team within 7 days.</p>
            </Section>
            <Section title="7. Acceptable use">
              <p>You must not use MyTijaara to: (a) violate Nigerian law or the rights of others; (b) distribute malware or spam; (c) impersonate another person; (d) scrape or reverse-engineer the platform without written consent; or (e) list counterfeit, prohibited, or dangerous goods.</p>
            </Section>
            <Section title="8. Intellectual property">
              <p>All content, trademarks, and software on MyTijaara are owned by or licensed to MyTijaara Ltd. You may not reproduce or distribute them without our prior written consent.</p>
            </Section>
            <Section title="9. Limitation of liability">
              <p>To the fullest extent permitted by Nigerian law, MyTijaara's aggregate liability for any claim arising from your use of the platform is limited to the amount you paid for the specific order giving rise to the claim. We are not liable for indirect or consequential losses.</p>
            </Section>
            <Section title="10. Governing law">
              <p>These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes will be submitted to the exclusive jurisdiction of the courts in Lagos State.</p>
            </Section>
            <Section title="11. Contact">
              <p>MyTijaara Ltd, Lagos, Nigeria. Email: <a href="mailto:legal@mytijaara.com" className="text-primary hover:underline">legal@mytijaara.com</a>.</p>
            </Section>
        </main>
      </PublicLayout>
    </LaunchStateProvider>
  );
}

function LegalHeader({ title, updated }: { title: string; updated: string }) {
  return (
    <div className="mb-12 border-b border-border pb-8">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
          Terms & Agreements
        </span>
        <button
          onClick={() => window.print()}
          className="rounded-full border border-border bg-card px-3.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
        >
          Print Document
        </button>
      </div>
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
