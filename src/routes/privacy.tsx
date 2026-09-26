import { createFileRoute } from "@tanstack/react-router";
import { loadPublicPageData } from "@/lib/public-page-data";
import { PublicLayout } from "@/components/landing/public-layout";

export const Route = createFileRoute("/privacy")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "Privacy Policy — MyTijaara" },
      {
        name: "description",
        content:
          "How MyTijaara collects, uses, shares, retains, and deletes personal data across its app and website.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  return (
    <PublicLayout
      launchConfig={launchConfig}
      serverNow={serverNow}
      cmsData={cms}
      branding={branding}
    >
      <PrivacyPolicyContent />
    </PublicLayout>
  );
}

export function PrivacyPolicyContent() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32">
      <LegalHeader title="Privacy Policy" updated="26 September 2026" />
      <Section title="1. Who we are and what this policy covers">
        <p>
          MyTijaara Ltd, based in Lagos, Nigeria, operates the MyTijaara mobile application,
          website, waitlist, and related marketplace services. In this policy, “MyTijaara”, “we”,
          “us”, and “our” refer to MyTijaara Ltd. This policy describes personal data handling
          across those services; the data involved depends on the features you use.
        </p>
        <p>
          For privacy questions or requests, contact{" "}
          <a href="mailto:privacy@mytijaara.com" className="text-primary hover:underline">
            privacy@mytijaara.com
          </a>
          . Do not send passwords, one-time passcodes, full payment-card numbers, or other
          authentication secrets by email.
        </p>
      </Section>
      <Section title="2. Personal data we collect">
        <p>
          We collect information you provide, information generated when you use a feature, and
          technical information sent by your device or browser. We do not collect every category
          from every user.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account and contact details:</strong> name, email address, phone number,
            authentication and verification records, profile details, and profile image.
          </li>
          <li>
            <strong>Orders and marketplace activity:</strong> products or services viewed or
            ordered, order status and history, delivery or service instructions, reviews, loyalty or
            wallet activity, and payment status or transaction references.
          </li>
          <li>
            <strong>Addresses and location:</strong> saved addresses and, if you enable a location
            feature, device location used to select a service area, find nearby services, or support
            delivery. The app also lets you enter or select an address yourself.
          </li>
          <li>
            <strong>Content you submit:</strong> messages to support or marketplace participants,
            reviews, photos, and files you choose to upload, including prescription files when you
            use that feature.
          </li>
          <li>
            <strong>Voice search:</strong> if you choose voice search, the app accesses microphone
            input to turn your spoken query into search text. Your device or speech-recognition
            service may process that audio under its own terms.
          </li>
          <li>
            <strong>Device, log, and usage information:</strong> IP address or a derived value,
            device and app/browser details, push-notification token, pages or screens used, session
            and referral information, campaign parameters, and event or security records.
          </li>
          <li>
            <strong>Waitlist information:</strong> name, email, optional phone number, city or
            state, selected role or interests, referral details, and signup source or campaign
            information.
          </li>
        </ul>
      </Section>
      <Section title="3. How we use personal data">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Create and secure accounts, verify contact details, and provide requested marketplace
            features.
          </li>
          <li>
            Match orders with vendors, riders, or service providers; coordinate delivery; and
            provide order, payment, and support updates.
          </li>
          <li>
            Process payments through the payment method and provider you select, and maintain
            necessary transaction, refund, wallet, and dispute records.
          </li>
          <li>
            Use location, address, and voice-search input when you choose features that need them.
          </li>
          <li>
            Send service messages, account notices, and push notifications; send marketing only
            where permitted and provide an opt-out.
          </li>
          <li>
            Operate, troubleshoot, secure, and improve the services; measure website and app usage;
            detect abuse or fraud; and meet legal obligations.
          </li>
          <li>Administer the waitlist, referrals, invitations, and launch communications.</li>
        </ul>
      </Section>
      <Section title="4. Permissions, choice, and consent">
        <p>
          Some features request access to device location or the microphone for location selection
          and voice search. You can decline or later change permissions in your device settings; the
          related feature may then be unavailable. We use location or microphone input for the
          feature you invoke, not as a substitute for your choice to enable that feature.
        </p>
        <p>
          Where consent is the applicable basis, you may withdraw it. Withdrawal does not affect
          processing that took place before withdrawal or processing based on another lawful ground.
        </p>
      </Section>
      <Section title="5. When we share data">
        <p>
          We do not sell personal data. We disclose only information needed for the purposes below,
          subject to applicable law:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Vendors, riders, artisans, and other service providers</strong> involved in a
            transaction receive relevant contact, order, and delivery details so they can fulfil it.
          </li>
          <li>
            <strong>Payment providers</strong> receive information needed to authorize or complete a
            payment, refund, or wallet transaction. The provider shown for your chosen payment
            method handles information under its own terms.
          </li>
          <li>
            <strong>Technology providers</strong> help us host and secure the services, process
            email or SMS, provide maps or location features, authenticate users, deliver push
            notifications, and measure usage. Examples of services integrated in the app or website
            include Google Maps, Firebase services, and Vercel Analytics; the data each receives
            depends on the feature and configuration.
          </li>
          <li>
            <strong>
              Professional advisers, regulators, courts, and law-enforcement authorities
            </strong>{" "}
            may receive information where necessary to establish or defend legal claims, protect
            people or the services, or meet a legal requirement.
          </li>
          <li>
            <strong>Business transfers</strong> may involve relevant data if the business or its
            assets are reorganized or transferred, subject to applicable safeguards and notice.
          </li>
        </ul>
        <p>
          Service providers may process data on our behalf or under their own privacy terms. We
          require appropriate handling for the role they perform and remain responsible for our
          disclosures and use of integrated services.
        </p>
      </Section>
      <Section title="6. Legal grounds and international processing">
        <p>
          Where required, we process personal data on grounds such as performing a contract or
          taking steps you request, complying with law, pursuing legitimate interests such as
          security and service operation, or your consent. We apply the Nigeria Data Protection Act
          2023 and other applicable data-protection laws. This description is not a claim of
          certification or a substitute for the rights available under those laws.
        </p>
        <p>
          Our service providers may process information in countries other than the country where
          you use MyTijaara. Where required, we use an appropriate legal basis and safeguards for
          that transfer.
        </p>
      </Section>
      <Section title="7. Retention">
        <p>
          We keep personal data only for as long as needed for the purposes described here, to
          provide the service, and to meet applicable legal, accounting, safety, fraud-prevention,
          or dispute-resolution requirements. Account data is kept while the account is active and
          is subject to deletion when a verified deletion request is completed. Some transaction,
          payment, security, or legal records may need to be retained for a limited period; where
          possible, we restrict access or remove direct identifiers when they are no longer needed
          for the original service.
        </p>
        <p>
          Waitlist information is kept while it is needed to administer the waitlist and related
          communications, unless you unsubscribe or request deletion, subject to records we must
          retain by law. Retention periods can differ by data type and provider.
        </p>
      </Section>
      <Section title="8. Account and data deletion" id="account-deletion">
        <p>
          <strong>In the app:</strong> sign in, open your Profile, and choose the delete-account
          option. The app may require an active order to be completed before it accepts an in-app
          deletion. Deleting an account removes access to it and revokes its app session.
        </p>
        <p>
          <strong>On the web, without signing in:</strong> email{" "}
          <a
            href="mailto:privacy@mytijaara.com?subject=Request%20MyTijaara%20account%20and%20data%20deletion"
            className="text-primary hover:underline"
          >
            privacy@mytijaara.com
          </a>{" "}
          with the subject “Request MyTijaara account and data deletion”. Send the request from the
          email address on the account and include the account phone number or email so we can
          locate and verify it. If you cannot access that address, explain that in your request. You
          do not need to reinstall or access the app to submit this request.
        </p>
        <p>
          After verifying a request, we will delete or de-identify personal data that is no longer
          needed, including data held by service providers where applicable. We may retain specific
          records when required by law or needed for an active order, payment, refund, dispute,
          security, or fraud-prevention matter. We limit any retained data to that purpose and
          delete it when the reason for retention ends. We will explain any material limitation when
          responding to your request.
        </p>
        <p>
          You can use the same email address to request deletion of waitlist information or other
          personal data without deleting a marketplace account. Unsubscribing from marketing does
          not by itself delete an account or transaction records.
        </p>
      </Section>
      <Section title="9. Your privacy rights">
        <p>
          Subject to applicable law, you may ask to access or correct your personal data, request
          deletion or restriction, object to certain processing, request a copy or transfer where
          available, and withdraw consent where processing relies on consent. You may also complain
          to the Nigeria Data Protection Commission or the relevant supervisory authority.
        </p>
        <p>
          To make a request, email{" "}
          <a href="mailto:privacy@mytijaara.com" className="text-primary hover:underline">
            privacy@mytijaara.com
          </a>
          . We may ask for information reasonably needed to verify your identity and will respond
          within the period required by applicable law.
        </p>
      </Section>
      <Section title="10. Security">
        <p>
          We use technical and organizational measures intended to protect personal data against
          unauthorized access, loss, misuse, or alteration. No internet service or storage method
          can be guaranteed completely secure. Contact us promptly if you believe your account or
          information has been compromised.
        </p>
      </Section>
      <Section title="11. Children">
        <p>
          If a parent or guardian believes a child has provided personal data without any permission
          required by law, contact us. We will review the request and take any steps required by
          applicable law.
        </p>
      </Section>
      <Section title="12. Changes to this policy">
        <p>
          We may update this policy as our services, data practices, or legal requirements change.
          We will post the current version here and update the date above. If a change requires
          notice or renewed consent, we will provide it through an appropriate channel.
        </p>
      </Section>
      <Section title="13. Contact">
        <p>
          For questions, privacy-rights requests, or account and data deletion requests, email{" "}
          <a href="mailto:privacy@mytijaara.com" className="text-primary hover:underline">
            privacy@mytijaara.com
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function LegalHeader({ title, updated }: { title: string; updated: string }) {
  return (
    <div className="mb-12 border-b border-border pb-8">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
          Legal & Compliance
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

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-24">
      <h2 className="mb-3 font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
