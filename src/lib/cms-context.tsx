import { createContext, useContext, type ReactNode } from "react";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";
import type { PublicBranding } from "@/lib/api/settings";

type CmsSections = Record<string, CmsSection>;

const DEFAULT_BRANDING: PublicBranding = {
  siteName: "MyTijaara",
  tagline: "One app for food, shopping, deliveries and trusted services.",
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  primaryColor: "",
  accentColor: "",
  social: {
    instagram: "",
    twitter: "",
    facebook: "",
    linkedin: "",
    tiktok: "",
    youtube: "",
    whatsapp: "",
  },
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

export function CmsProvider({
  sections,
  faqs,
  testimonials,
  branding,
  children,
}: {
  sections: CmsSections;
  faqs: Faq[];
  testimonials: Testimonial[];
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
 * Read a CMS section's data with a typed fallback. When the section doesn't
 * exist or has no data, returns the fallback. Use this in every landing
 * component so the page renders with hardcoded defaults when the DB is empty,
 * but respects admin edits when the section is populated.
 */
export function useCmsData<T extends Record<string, unknown>>(
  section: string,
  fallback: T,
): T {
  const { sections } = useContext(CmsContext);
  const s = sections[section];
  if (!s?.data || Object.keys(s.data).length === 0) return fallback;
  return { ...fallback, ...s.data } as T;
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
