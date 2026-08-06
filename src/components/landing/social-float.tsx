import { useState } from "react";
import { Share2, X } from "lucide-react";
import { useCmsData } from "@/lib/cms-context";

/* ------------------------------------------------------------------ */
/* Brand SVG icons (not in lucide-react)                               */
/* ------------------------------------------------------------------ */

function IconTwitterX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

function IconYouTube({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06Z" />
    </svg>
  );
}

type SocialCmsData = {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
};

const DEFAULT_SOCIAL: SocialCmsData = {
  twitter: "https://twitter.com/mytijaara",
  instagram: "https://instagram.com/mytijaara",
  linkedin: "https://linkedin.com/company/mytijaara",
  facebook: "https://facebook.com/mytijaara",
  youtube: "https://youtube.com/@mytijaara",
  tiktok: "https://tiktok.com/@mytijaara",
};

const ICON_MAP: Record<string, { Icon: React.ComponentType<{ className?: string }>; label: string }> = {
  twitter: { Icon: IconTwitterX, label: "X / Twitter" },
  instagram: { Icon: IconInstagram, label: "Instagram" },
  linkedin: { Icon: IconLinkedIn, label: "LinkedIn" },
  facebook: { Icon: IconFacebook, label: "Facebook" },
  youtube: { Icon: IconYouTube, label: "YouTube" },
  tiktok: { Icon: IconTikTok, label: "TikTok" },
};

/**
 * Floating social-media menu — fixed bottom-left. Expands upward when toggled.
 * URLs come from the CMS `social` section so the admin can update them without
 * a deploy. Falls back to hardcoded defaults when the section is unpopulated.
 */
export function SocialFloat() {
  const [open, setOpen] = useState(false);
  const socialCms = useCmsData("social", DEFAULT_SOCIAL);

  // Build the ordered list, filtering out any platforms with no URL.
  const links = (Object.keys(ICON_MAP) as Array<keyof SocialCmsData>)
    .map((id) => ({ id, href: socialCms[id] || DEFAULT_SOCIAL[id] }))
    .filter((l): l is { id: keyof SocialCmsData; href: string } => Boolean(l.href));

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col-reverse items-start gap-2">
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
          const entry = ICON_MAP[link.id];
          if (!entry) return null;
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
