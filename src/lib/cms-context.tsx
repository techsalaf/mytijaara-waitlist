import { createContext, useContext, type ReactNode } from "react";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";
import { mergeSectionData } from "@/lib/cms/merge";

type CmsSections = Record<string, CmsSection>;

const DEFAULT_BRANDING: PublicBranding = {
  siteName: "MyTijaara",
  tagline: "One app for food, shopping, deliveries and trusted services.",
  contactEmail: "",
  supportEmail: "",
  phone: "",
  address: "",
  launchCity: "",
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  primaryColor: "#004A28",
  accentColor: "#D4A017",
  secondaryColor: "#166534",
  backgroundColor: "#F8FAF8",
  surfaceColor: "#FFFFFF",
  social: {
    instagram: "https://instagram.com/mytijaara",
    twitter: "https://x.com/mytijaara",
    facebook: "https://facebook.com/mytijaara",
    linkedin: "https://linkedin.com/company/mytijaara",
    tiktok: "https://tiktok.com/@mytijaara",
    youtube: "https://youtube.com/@mytijaara",
    whatsapp: "https://whatsapp.com/channel/0029VbE63oZGOj9vfKqWbQ1D",
  },
  iosAppUrl: "",
  androidAppUrl: "",
  googleAnalyticsId: "",
  metaPixelId: "",
};

type CmsContextValue = {
  sections: CmsSections;
  faqs: Faq[];
  testimonials: Testimonial[];
  branding: PublicBranding;
};

const CmsContext = createContext<CmsContextValue>({
  sections: {},
  faqs: [],
  testimonials: [],
  branding: DEFAULT_BRANDING,
});

/**
 * @param sections Keyed by slug, from `GET /cms`. Optional so a chrome-only
 * layout such as `/auth`, which renders no CMS section, can still provide
 * branding to the logo and the analytics wrapper.
 */
export function CmsProvider({
  sections = {},
  faqs = [],
  testimonials = [],
  branding,
  children,
}: {
  sections?: CmsSections;
  faqs?: Faq[];
  testimonials?: Testimonial[];
  branding?: PublicBranding;
  children: ReactNode;
}) {
  return (
    <CmsContext.Provider value={{ sections, faqs, testimonials, branding: branding ?? DEFAULT_BRANDING }}>
      {children}
    </CmsContext.Provider>
  );
}

/**
 * Merge admin-saved section data over the bundled fallback.
 *
 * Lives in `@/lib/cms/merge` because the admin editor merges the same way. See
 * the doc comment there for the array-vs-object rules.
 */

/**
 * Read a CMS section's data with a typed fallback.
 *
 * Returns `null` when the administrator has switched the section off, so the
 * component hides. Returns the fallback when the section is genuinely absent —
 * never seeded, or `GET /cms` failed — so the page still renders instead of
 * collapsing to nothing.
 *
 * Those two cases have to stay distinguishable, which is why
 * `CmsController::index()` now returns disabled sections carrying
 * `enabled: false` rather than filtering them out of the payload. When it
 * filtered them, a disabled section arrived as "absent" and this function
 * dutifully rendered the hardcoded default copy — the reason the admin
 * active/inactive toggle appeared to do nothing on the public site.
 *
 * Every caller must handle the `null`: `if (!cms) return null;` before touching
 * any field.
 */
export function useCmsData<T extends Record<string, unknown>>(
  section: string,
  fallback: T,
): T | null {
  const { sections } = useContext(CmsContext);
  const s = sections[section];
  // Explicitly switched off by an administrator — hide the section.
  if (s && (s.enabled === false || s.published === false)) {
    return null;
  }
  // Absent or not yet loaded — degrade to the bundled copy.
  if (!s) return fallback;
  if (!s.data || Object.keys(s.data).length === 0) return fallback;
  return mergeSectionData(fallback, s.data as Record<string, unknown>);
}

/**
 * Whether a section is switched on. Use for sections rendered by a parent (the
 * announcement bar) where there is no component of its own to return `null`.
 * An absent section counts as on, matching `useCmsData`'s fallback behaviour.
 */
export function useCmsSectionEnabled(section: string): boolean {
  const { sections } = useContext(CmsContext);
  const s = sections[section];
  if (!s) return true;
  return s.enabled !== false && s.published !== false;
}

/** Read the public branding settings (logo URL, favicon, site name). */
export function useBranding(): PublicBranding {
  return useContext(CmsContext).branding;
}

/**
 * Read the full list of FAQs from the DB. Returns an empty array when none
 * exist, so the component can fall back to hardcoded FAQs.
 */
export function useFaqs(): Faq[] {
  const { faqs } = useContext(CmsContext);
  return faqs;
}

/**
 * Read the full list of testimonials from the DB. Returns an empty array when
 * none exist, so the component can fall back to hardcoded testimonials.
 */
export function useTestimonials(): Testimonial[] {
  const { testimonials } = useContext(CmsContext);
  return testimonials;
}
