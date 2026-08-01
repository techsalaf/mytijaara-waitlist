import { apiCall } from "./client";
import { faqs, testimonials } from "@/lib/mock-data";

export type Faq = (typeof faqs)[number];
export type Testimonial = (typeof testimonials)[number];

/**
 * CMS content API.
 *
 * Editable sections (hero, features, footer, etc.) are keyed by section slug:
 *   GET   /cms            -> { data: Record<string, unknown> }
 *   GET   /cms/:section   -> { data: unknown }   (public read)
 *   PATCH /cms/:section   -> { data: unknown }   (admin)
 *
 * FAQs + testimonials have their own collection endpoints:
 *   GET/POST/PATCH/DELETE /content/faqs
 *   POST /content/faqs/reorder
 *   GET/POST/PATCH/DELETE /content/testimonials
 */
export const cmsApi = {
  sections: () => apiCall("/cms", () => ({})),
  section: (slug: string) => apiCall(`/cms/${slug}`, () => ({}), { public: true }),
  updateSection: (slug: string, patch: Record<string, unknown>) =>
    apiCall(`/cms/${slug}`, () => patch, { method: "PATCH", body: patch }),

  faqs: () => apiCall("/content/faqs", () => faqs),
  createFaq: (payload: Partial<Faq>) =>
    apiCall("/content/faqs", () => ({ ...faqs[0], ...payload, id: Date.now() }) as Faq, {
      method: "POST",
      body: payload,
    }),
  updateFaq: (id: number, patch: Partial<Faq>) =>
    apiCall(`/content/faqs/${id}`, () => ({ ...faqs.find((f) => f.id === id)!, ...patch }), {
      method: "PATCH",
      body: patch,
    }),
  removeFaq: (id: number) =>
    apiCall(`/content/faqs/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
  reorderFaqs: (ids: number[]) =>
    apiCall("/content/faqs/reorder", () => ({ ok: true }), {
      method: "POST",
      body: { order: ids },
    }),

  testimonials: () => apiCall("/content/testimonials", () => testimonials),
  createTestimonial: (payload: Partial<Testimonial>) =>
    apiCall(
      "/content/testimonials",
      () => ({ ...testimonials[0], ...payload, id: Date.now() }) as Testimonial,
      { method: "POST", body: payload },
    ),
  updateTestimonial: (id: number, patch: Partial<Testimonial>) =>
    apiCall(
      `/content/testimonials/${id}`,
      () => ({ ...testimonials.find((t) => t.id === id)!, ...patch }),
      { method: "PATCH", body: patch },
    ),
  removeTestimonial: (id: number) =>
    apiCall(`/content/testimonials/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
};
