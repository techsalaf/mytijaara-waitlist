import { createFileRoute } from "@tanstack/react-router";
import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { normalizeLaunchConfig } from "@/lib/launch/config";
import { CmsProvider } from "@/lib/cms-context";
import { LaunchStateProvider } from "@/components/launch/launch-state-provider";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const Route = createFileRoute("/privacy")({
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
      { title: "Privacy Policy — MyTijaara" },
      { name: "description", content: "How MyTijaara collects, uses, and protects your personal information in line with the Nigeria Data Protection Regulation (NDPR)." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  return (
    <LaunchStateProvider initialConfig={launchConfig} initialNow={serverNow}>
      <CmsProvider sections={cms} faqs={[]} testimonials={[]} branding={branding}>
        <div className="min-h-screen bg-background text-foreground">
          <Nav />
          <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32">
            <LegalHeader title="Privacy Policy" updated="1 August 2026" />
            <Section title="1. Who we are">
              <p>MyTijaara Ltd ("MyTijaara", "we", "us", "our") operates the MyTijaara platform — a multi-service marketplace built for Nigerians. Registered in the Federal Republic of Nigeria. Contact: <a href="mailto:privacy@mytijaara.com" className="text-primary hover:underline">privacy@mytijaara.com</a>.</p>
            </Section>
            <Section title="2. Data we collect">
              <ul className="list-disc space-y-1 pl-5">
                <li><strong>Account data</strong> — name, email address, phone number, and password hash when you register.</li>
                <li><strong>Order & transaction data</strong> — items ordered, delivery address, payment method tokens (we never store full card numbers).</li>
                <li><strong>Location data</strong> — with your permission, approximate GPS coordinates to show nearby vendors and calculate delivery routes.</li>
                <li><strong>Device & usage data</strong> — IP address, browser type, pages visited, session duration, and referral source for analytics and security.</li>
                <li><strong>Communications</strong> — messages you send to support or vendors through the platform.</li>
              </ul>
            </Section>
            <Section title="3. How we use your data">
              <ul className="list-disc space-y-1 pl-5">
                <li>Fulfil and track your orders and bookings.</li>
                <li>Send transactional emails (order confirmation, delivery updates, welcome email).</li>
                <li>Improve the platform through aggregated analytics.</li>
                <li>Prevent fraud and comply with Nigerian law (including NDPR and FCCPC guidelines).</li>
                <li>Send you promotional messages only if you have opted in — you can unsubscribe at any time.</li>
              </ul>
            </Section>
            <Section title="4. Legal bases for processing">
              <p>We process your data under the following legal bases per the Nigeria Data Protection Regulation (NDPR) 2019:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong>Contract</strong> — processing necessary to deliver a service you requested.</li>
                <li><strong>Legitimate interests</strong> — fraud prevention and platform security.</li>
                <li><strong>Consent</strong> — marketing communications and optional analytics cookies.</li>
                <li><strong>Legal obligation</strong> — complying with court orders or regulatory requests.</li>
              </ul>
            </Section>
            <Section title="5. Sharing your data">
              <p>We do not sell your data. We share it only with:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Vendors, riders, or artisans you transact with — limited to what they need to fulfil your order.</li>
                <li>Payment processors (e.g. Paystack, Flutterwave) under their own privacy policies.</li>
                <li>Cloud infrastructure providers who process data on our behalf under data processing agreements.</li>
                <li>Nigerian regulatory authorities when required by law.</li>
              </ul>
            </Section>
            <Section title="6. Your rights">
              <p>Under the NDPR you have the right to access, correct, delete, or restrict processing of your personal data, and to object to direct marketing. To exercise any right, email <a href="mailto:privacy@mytijaara.com" className="text-primary hover:underline">privacy@mytijaara.com</a>. We respond within 30 days.</p>
            </Section>
            <Section title="7. Data retention">
              <p>We retain account data for as long as your account is active, plus 6 years after closure for tax and legal record-keeping. Analytics data is aggregated and anonymised after 24 months.</p>
            </Section>
            <Section title="8. Security">
              <p>We use TLS 1.2+ in transit, AES-256 at rest, and bcrypt for passwords. No system is perfectly secure — if you believe your account has been compromised, contact us immediately.</p>
            </Section>
            <Section title="9. Changes to this policy">
              <p>We will notify you of material changes via email or an in-app notice at least 14 days before they take effect. The "Last updated" date at the top of this page always reflects the current version.</p>
            </Section>
            <Section title="10. Contact">
              <p>MyTijaara Ltd, Lagos, Nigeria. Email: <a href="mailto:privacy@mytijaara.com" className="text-primary hover:underline">privacy@mytijaara.com</a>.</p>
            </Section>
          </main>
          <Footer />
        </div>
      </CmsProvider>
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
