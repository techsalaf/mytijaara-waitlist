import { useBranding } from "@/lib/cms-context";

/**
 * Site logo. When the admin has set a `logoUrl` via branding settings, renders
 * that image. Otherwise falls back to the SVG initials mark so the page always
 * has a logo even before any admin configuration.
 */
export function Logo({ className = "" }: { className?: string }) {
  const { logoUrl, siteName } = useBranding();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={siteName || "MyTijaara"}
          className="h-9 w-auto object-contain"
        />
      ) : (
        <>
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary-gradient shadow-soft">
            <span className="font-display text-lg font-bold text-primary-foreground">M</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold-gradient ring-2 ring-background" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            {siteName || "MyTijaara"}
          </span>
        </>
      )}
    </div>
  );
}
