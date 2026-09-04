/**
 * One loader for every public page.
 *
 * Ten routes had hand-copied loaders that drifted: some wrapped
 * `serverGet("/launch-config")` in `.catch()` and some did not, `/about` and
 * `/careers` never fetched the launch config at all (which is why their header
 * ribbon read "0 seconds to go"), and two of them named the CMS payload
 * `cmsData` while the rest called it `cms`. Routes now call this instead, so
 * adding a public page cannot reintroduce any of those.
 *
 * Every request is individually fault-tolerant: a backend that is down or not
 * yet migrated degrades to bundled defaults rather than failing the render.
 */

import { serverGet } from "@/lib/api";
import { settingsApi } from "@/lib/api/settings";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { normalizeLaunchConfig, type LaunchConfiguration } from "@/lib/launch/config";

export type PublicPageData = {
  /** Always a complete config — `normalizeLaunchConfig` fills any gap. */
  launchConfig: LaunchConfiguration;
  /**
   * `Date.now()` read on the server. Passed to `LaunchStateProvider` so the
   * countdown digits in the server HTML match the client's first paint
   * (React #418).
   */
  serverNow: number;
  /** Every published `cms_sections` row, keyed by slug. `{}` when unreachable. */
  cms: Record<string, CmsSection>;
  /** `undefined` when the settings endpoint is unavailable. */
  branding?: PublicBranding;
  faqs: Faq[];
  testimonials: Testimonial[];
};

/**
 * @param options.content Also fetch the FAQ and testimonial tables. Only the
 * pages that render those lists need the extra two round trips.
 */
export async function loadPublicPageData(
  options: { content?: boolean } = {},
): Promise<PublicPageData> {
  const [launchRaw, cmsRaw, brandingResult, faqsRaw, testimonialsRaw] = await Promise.all([
    serverGet<unknown>("/launch-config").catch(() => null),
    serverGet<Record<string, CmsSection>>("/cms").catch(() => undefined),
    settingsApi.publicSettings().catch(() => null),
    options.content ? serverGet<Faq[]>("/content/faqs").catch(() => undefined) : undefined,
    options.content
      ? serverGet<Testimonial[]>("/content/testimonials").catch(() => undefined)
      : undefined,
  ]);

  return {
    launchConfig: normalizeLaunchConfig(launchRaw),
    serverNow: Date.now(),
    // `serverGet` already unwraps the `{data: …}` envelope. Reading `.data`
    // again here is the bug that made every CMS edit invisible on the public
    // site; `settingsApi` goes through `apiCall`, which does NOT unwrap, hence
    // the asymmetry below.
    cms: cmsRaw ?? {},
    branding: (brandingResult as { data: PublicBranding } | null)?.data,
    faqs: faqsRaw ?? [],
    testimonials: testimonialsRaw ?? [],
  };
}
