import { useState, useEffect, useRef } from "react";
import { Share2, X } from "lucide-react";
import { useBranding } from "@/lib/cms-context";
import { SOCIAL_ICON_MAP, SOCIAL_PLATFORMS } from "./social-icons";

/**
 * Floating social-media menu — fixed bottom-left. Expands upward when toggled.
 * URLs come from admin Settings → Social (branding.social) so the admin can
 * update them without a deploy. Platforms with an empty URL are hidden.
 */
export function SocialFloat() {
  const [open, setOpen] = useState(false);
  const { social } = useBranding();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Build the ordered list, filtering out any platforms with no URL.
  const links = SOCIAL_PLATFORMS.map((id) => ({ id, href: social[id] })).filter(
    (l): l is { id: (typeof SOCIAL_PLATFORMS)[number]; href: string } => Boolean(l.href),
  );

  return (
    <div ref={ref} className="fixed bottom-6 left-6 z-40 flex flex-col-reverse items-start gap-2">
      {/* Social links list — shown above the toggle button */}
      <div
        className="mb-2 flex flex-col gap-2"
        aria-hidden={!open}
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scaleY(1)" : "scaleY(0.9)",
          transformOrigin: "bottom",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease-out, transform 200ms ease-out",
        }}
      >
        {links.map((link, i) => {
          const entry = SOCIAL_ICON_MAP[link.id];
          const { Icon } = entry;
          return (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`MyTijaara on ${entry.label}`}
              tabIndex={open ? 0 : -1}
              className="group flex items-center gap-2.5"
              style={{
                transitionDelay: open ? `${i * 40}ms` : "0ms",
                transition: "opacity 0.18s ease, transform 0.18s ease",
                opacity: open ? 1 : 0,
                transform: open ? "translateX(0)" : "translateX(-8px)",
              }}
            >
              {/* Label — only visible on hover, desktop */}
              <span className="hidden rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-soft opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                {entry.label}
              </span>
              {/* Icon */}
              <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/80 text-muted-foreground shadow-soft backdrop-blur-sm transition-all hover:scale-110 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </a>
          );
        })}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close social links" : "Open social links"}
        aria-expanded={open}
        className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-border bg-card/80 text-muted-foreground shadow-soft backdrop-blur-sm transition-all duration-150 hover:scale-105 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {open ? <X className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
