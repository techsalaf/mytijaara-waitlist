/**
 * Launch city — the single source of truth for "where MyTijaara opens first".
 *
 * The first-phase launch city is IBADAN. Copy across the site previously said
 * Lagos, including `/about`'s city grid, the landing FAQ and the download page.
 * Those were hardcoded in five separate components, so correcting the fact meant
 * hunting strings. Everything now reads it from here, and an administrator can
 * override it without a deploy from Admin -> Settings -> Branding ("Launch
 * city"), which writes `settings.branding.launchCity`.
 *
 * This is deliberately NOT the same thing as the launch TIMEZONE: Africa/Lagos
 * is the IANA zone name for all of Nigeria and stays as it is in
 * `src/lib/launch/config.ts`. Nor is it the company's registered address or the
 * legal jurisdiction in `/terms` and `/privacy`, which remain Lagos.
 */

import { useBranding } from "@/lib/cms-context";

/** First-phase launch city. Overridable from Settings -> Branding. */
export const DEFAULT_LAUNCH_CITY = "Ibadan";

/** Cities in the second wave, in rollout order. */
export const PHASE_TWO_CITIES = ["Lagos", "Abuja (FCT)", "Port Harcourt"] as const;

/**
 * Resolve the launch city: the admin-configured value when set, otherwise
 * `DEFAULT_LAUNCH_CITY`. Safe to call outside a `CmsProvider` — `useBranding`
 * falls back to the default branding object, whose `launchCity` is empty.
 */
export function useLaunchCity(): string {
  const branding = useBranding();
  const city = branding.launchCity?.trim();
  return city && city.length > 0 ? city : DEFAULT_LAUNCH_CITY;
}
