import type { PublicBranding } from "@/lib/api/settings";

/**
 * Injects admin-configured brand colours as CSS custom properties, overriding
 * the hardcoded fallbacks in styles.css. Only emits a property when the admin
 * has set a non-empty value, so an unset colour keeps the stylesheet default.
 *
 * Lives in its own module because every public page needs it, not just `/`.
 * `PublicLayout` renders it for the inner pages; `src/routes/index.tsx` renders
 * it directly because the landing page composes its own tree.
 */
export function BrandColors({ branding }: { branding?: Partial<PublicBranding> }) {
  const declarations = [
    branding?.primaryColor ? `--primary: ${branding.primaryColor};` : "",
    branding?.accentColor ? `--gold: ${branding.accentColor};` : "",
    branding?.secondaryColor ? `--secondary: ${branding.secondaryColor};` : "",
    branding?.backgroundColor ? `--background: ${branding.backgroundColor};` : "",
    branding?.surfaceColor ? `--surface: ${branding.surfaceColor};` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!declarations) return null;
  return <style>{`:root { ${declarations} }`}</style>;
}
