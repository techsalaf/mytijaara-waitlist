import { Facebook, Instagram, Twitter } from "lucide-react";

import { Logo } from "./logo";
import { useLaunch } from "@/components/launch/launch-state-provider";

const SOCIALS = [
  { Icon: Instagram, label: "MyTijaara on Instagram", href: "https://instagram.com" },
  { Icon: Twitter, label: "MyTijaara on X", href: "https://x.com" },
  { Icon: Facebook, label: "MyTijaara on Facebook", href: "https://facebook.com" },
];

const COLUMNS = [
  {
    h: "Product",
    l: [
      { label: "Everyday moments", href: "#moments" },
      { label: "What you can do", href: "#services" },
      { label: "How it works", href: "#how" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    h: "Partners",
    l: [
      { label: "Vendors", href: "#partners" },
      { label: "Riders", href: "#partners" },
      { label: "Artisans", href: "#partners" },
      { label: "Contact sales", href: "mailto:hello@mytijaara.com" },
    ],
  },
  {
    h: "Company",
    l: [
      { label: "About", href: "#top" },
      { label: "Careers", href: "mailto:careers@mytijaara.com" },
      { label: "Privacy", href: "#faq" },
      { label: "Terms", href: "#faq" },
    ],
  },
];

export function Footer() {
  // The copyright year came from a bare `new Date()` during render. On a page
  // rendered on the server on 31 December and hydrated on 1 January the two
  // years disagree, and the whole footer subtree is a hydration mismatch. The
  // provider's clock is seeded from the SSR loader, so both sides agree.
  const { now } = useLaunch();
  const year = new Date(now).getFullYear();

  return (
    <footer className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Everything you need, all in one place. Built for Nigerians.
            </p>
            <div className="mt-5 flex gap-3">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground/70 transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.h}>
              <p className="font-display text-sm font-bold">{col.h}</p>
              <ul className="mt-4 space-y-2.5">
                {col.l.map((it) => (
                  <li key={it.label}>
                    <a
                      href={it.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {it.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} MyTijaara. Made with love in Nigeria.
          </p>
          <p className="text-xs text-muted-foreground">
            Everything you need, all in one place.
          </p>
        </div>
      </div>
    </footer>
  );
}
