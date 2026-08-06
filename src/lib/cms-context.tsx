import { createContext, useContext, type ReactNode } from "react";
import type { CmsSection, Faq, Testimonial } from "@/lib/api";

type CmsSections = Record<string, CmsSection>;

type CmsContextValue = {
  sections: CmsSections;
  faqs: Faq[];
  testimonials: Testimonial[];
};

const CmsContext = createContext<CmsContextValue>({
  sections: {},
  faqs: [],
  testimonials: [],
});

export function CmsProvider({
  sections,
  faqs,
  testimonials,
  children,
}: {
  sections: CmsSections;
  faqs: Faq[];
  testimonials: Testimonial[];
  children: ReactNode;
}) {
  return (
    <CmsContext.Provider value={{ sections, faqs, testimonials }}>
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
