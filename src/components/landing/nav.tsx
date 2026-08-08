import { useEffect, useState } from "react";
import { ArrowRight, Download, Menu, X } from "lucide-react";

import { Logo } from "./logo";
import { usePrimaryCta } from "@/components/launch/launch-cta";
import { LaunchTicker } from "@/components/launch/launch-ticker";
import { useCmsData } from "@/lib/cms-context";
import { trackEvent } from "@/lib/analytics/track";

type NavLink = { href: string; label: string };
type NavCmsData = { links?: NavLink[] };

const DEFAULT_NAV: NavCmsData = {
  links: [
    { href: "#moments", label: "Everyday moments" },
    { href: "#services", label: "What you can do" },
    { href: "#how", label: "How it works" },
    { href: "#partners", label: "For partners" },
    { href: "#faq", label: "FAQ" },
  ],
};

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Flips from "Join the waitlist" to "Download App" automatically at launch.
  const cta = usePrimaryCta();
  const CtaIcon = cta.download ? Download : ArrowRight;
  const cms = useCmsData("navigation", DEFAULT_NAV);
  const links = cms.links && cms.links.length > 0 ? cms.links : DEFAULT_NAV.links!;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/*
        Full-bleed launch strip. It sits inside the fixed header rather than as
        its own fixed element so that when it returns null (post-launch, or when
        an admin turns the ticker off) the nav moves up on its own — no offset to
        keep in sync and no leftover gap.
      */}
      <LaunchTicker />
      <div className={`transition-all ${scrolled ? "py-2" : "py-4"}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
            scrolled ? "glass shadow-soft" : ""
          }`}
        >
          <a href="#top" aria-label="MyTijaara home">
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <a
              href={cta.href}
              onClick={() => trackEvent("cta_click", { label: cta.label, location: "nav" })}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.03]"
            >
              {cta.label}
              <CtaIcon className="h-4 w-4" />
            </a>
          </div>
          <button
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-border transition-colors hover:bg-primary-soft md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="mt-2 rounded-2xl glass p-4 shadow-soft md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-primary-soft"
                >
                  {l.label}
                </a>
              ))}
              <a
                href={cta.href}
                onClick={() => { setOpen(false); trackEvent("cta_click", { label: cta.label, location: "nav_mobile" }); }}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                {cta.label} <CtaIcon className="h-4 w-4" />
              </a>
            </nav>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
