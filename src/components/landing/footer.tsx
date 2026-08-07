import { SOCIAL_ICON_MAP, SOCIAL_PLATFORMS } from "./social-icons";
import { Logo } from "./logo";
import { useLaunch } from "@/components/launch/launch-state-provider";
import { useCmsData, useBranding } from "@/lib/cms-context";

type FooterLink = { label: string; href: string };
type FooterColumn = { title?: string; h?: string; links?: FooterLink[]; l?: FooterLink[] };
type FooterCmsData = {
  tagline?: string;
  copyright?: string;
  columns?: FooterColumn[];
};

const DEFAULT_FOOTER: FooterCmsData = {
  tagline: "Everything you need, all in one place. Built for Nigerians.",
  copyright: "Made with love in Nigeria.",
  columns: [
    {
      h: "Product",
      links: [
        { label: "Everyday moments", href: "#moments" },
        { label: "What you can do", href: "#services" },
        { label: "How it works", href: "#how" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      h: "Partners",
      links: [
        { label: "Vendors", href: "#partners" },
        { label: "Riders", href: "#partners" },
        { label: "Artisans", href: "#partners" },
        { label: "Contact sales", href: "mailto:hello@mytijaara.com" },
      ],
    },
    {
      h: "Company",
      links: [
        { label: "About", href: "#top" },
        { label: "Careers", href: "mailto:careers@mytijaara.com" },
        { label: "Privacy policy", href: "#faq" },
        { label: "Terms of service", href: "#faq" },
        { label: "Cookie policy", href: "#faq" },
      ],
    },
  ],
};

/** App Store badge — renders a placeholder badge until the real URL exists. */
function AppStoreBadge({
  store,
  href,
}: {
  store: "ios" | "android";
  href?: string;
}) {
  const label = store === "ios" ? "App Store" : "Google Play";
  const sub = store === "ios" ? "Download on the" : "Get it on";

  const inner = (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 backdrop-blur-sm transition-colors hover:bg-card/80">
      {store === "ios" ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-foreground" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-foreground" aria-hidden="true">
          <path d="M3.18 23.76a2 2 0 0 0 2.17-.22l.06-.04 12.08-6.98-3.49-3.5-10.82 10.74zm16.7-9.93-2.55-2.55 2.55-2.55c.74.74 1.33 1.62 1.33 2.55s-.59 1.81-1.33 2.55zM3.18.24l10.82 10.74L17 7.48 4.41.46A2 2 0 0 0 3.18.24zM2 1.5c-.44.48-.72 1.11-.72 1.82v17.36c0 .71.28 1.34.72 1.82L2.09 22.6l9.73-9.73v-.23L2.09 2.89 2 2.5z" />
        </svg>
      )}
      <div className="text-left leading-tight">
        <div className="text-[10px] text-muted-foreground">{sub}</div>
        <div className="text-sm font-semibold">{label}</div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={`Download MyTijaara on ${label}`}>
        {inner}
      </a>
    );
  }
  return (
    <div
      title="Coming soon"
      className="cursor-not-allowed opacity-70"
      aria-label={`${label} — coming soon`}
    >
      {inner}
    </div>
  );
}

export function Footer() {
  // The copyright year came from a bare `new Date()` during render. On a page
  // rendered on the server on 31 December and hydrated on 1 January the two
  // years disagree, and the whole footer subtree is a hydration mismatch. The
  // provider's clock is seeded from the SSR loader, so both sides agree.
  const { now } = useLaunch();
  const year = new Date(now).getFullYear();

  const footerCms = useCmsData("footer", DEFAULT_FOOTER);
  // Social URLs and contact emails come from the Settings panel (branding), not cms_sections.
  const { social, supportEmail, contactEmail } = useBranding();

  const tagline = footerCms.tagline ?? DEFAULT_FOOTER.tagline;
  const columns =
    footerCms.columns && footerCms.columns.length > 0
      ? footerCms.columns
      : DEFAULT_FOOTER.columns!;

  // Only render platforms the admin has configured a URL for.
  const socials = SOCIAL_PLATFORMS.map((id) => ({
    id,
    href: social[id],
    ...SOCIAL_ICON_MAP[id],
  })).filter((s): s is typeof s & { href: string } => Boolean(s.href));

  return (
    <footer className="border-t border-border bg-surface">
      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{tagline}</p>

            {/* Social icons */}
            {socials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2.5">
                {socials.map(({ id, Icon, label, href }) => (
                  <a
                    key={id}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`MyTijaara on ${label}`}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground/60 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}

            {/* App store badges */}
            <div className="mt-6 space-y-2.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Get the app
              </p>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                <AppStoreBadge store="ios" />
                <AppStoreBadge store="android" />
              </div>
              <p className="text-[11px] text-muted-foreground">Coming soon to both stores.</p>
            </div>
          </div>

          {/* Nav columns */}
          {columns.map((col) => {
            const heading = col.h ?? col.title ?? "";
            const links = col.links ?? col.l ?? [];
            return (
              <div key={heading}>
                <p className="font-display text-sm font-bold">{heading}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map((it) => (
                    <li key={it.label}>
                      <a
                        href={it.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {it.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust bar */}
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          {[
            "🔒 SSL secured",
            "🇳🇬 Built in Nigeria",
            "NDPR compliant",
            "PCI-DSS ready",
          ].map((item) => (
            <span key={item} className="text-[11px] font-medium text-muted-foreground">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
          <p className="text-xs text-muted-foreground">
            © {year} MyTijaara Ltd. {footerCms.copyright ?? DEFAULT_FOOTER.copyright}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              { label: "Privacy", href: "#faq" },
              { label: "Terms", href: "#faq" },
              { label: "Cookies", href: "#faq" },
              ...(supportEmail
                ? [{ label: "Support", href: `mailto:${supportEmail}` }]
                : [{ label: "Support", href: "mailto:support@mytijaara.com" }]),
              ...(contactEmail
                ? [{ label: "Contact", href: `mailto:${contactEmail}` }]
                : [{ label: "Contact", href: "mailto:hello@mytijaara.com" }]),
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
