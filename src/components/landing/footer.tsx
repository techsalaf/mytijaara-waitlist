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
        { label: "Privacy", href: "#faq" },
        { label: "Terms", href: "#faq" },
      ],
    },
  ],
};

export function Footer() {
  // The copyright year came from a bare `new Date()` during render. On a page
  // rendered on the server on 31 December and hydrated on 1 January the two
  // years disagree, and the whole footer subtree is a hydration mismatch. The
  // provider's clock is seeded from the SSR loader, so both sides agree.
  const { now } = useLaunch();
  const year = new Date(now).getFullYear();

  const footerCms = useCmsData("footer", DEFAULT_FOOTER);
  // Social URLs come from the Settings panel (branding.social), not cms_sections.
  const { social } = useBranding();

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
    <footer className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{tagline}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {socials.map(({ id, Icon, label, href }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`MyTijaara on ${label}`}
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {columns.map((col) => {
            const heading = col.h ?? col.title ?? "";
            const links = col.links ?? col.l ?? [];
            return (
              <div key={heading}>
                <p className="font-display text-sm font-bold">{heading}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map((it) => (
                    <li key={it.label}>
                      <a href={it.href} className="text-sm text-muted-foreground hover:text-foreground">
                        {it.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} MyTijaara. {footerCms.copyright ?? DEFAULT_FOOTER.copyright}
          </p>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
      </div>
    </footer>
  );
}
