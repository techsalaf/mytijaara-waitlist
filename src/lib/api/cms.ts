import { apiCall } from "./client";

export type Faq = {
  id: number;
  question: string;
  answer: string;
  order: number;
  published: boolean;
};

export type Testimonial = {
  id: number;
  name: string;
  role: string;
  quote: string;
  rating: number;
  published: boolean;
  avatar: string;
};

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
  sections: () => apiCall("/cms", () => ({}), { public: true }),
  section: (slug: string) => apiCall(`/cms/${slug}`, () => ({}), { public: true }),
  updateSection: (slug: string, patch: Record<string, unknown>) =>
    apiCall(`/cms/${slug}`, () => patch, { method: "PATCH", body: patch }),

  faqs: () => apiCall("/content/faqs", () => [] as Faq[]),
  createFaq: (payload: Partial<Faq>) =>
    apiCall("/content/faqs", () => ({ id: Date.now(), question: "", answer: "", order: 0, published: false, ...payload } as Faq), {
      method: "POST",
      body: payload,
    }),
  updateFaq: (id: number, patch: Partial<Faq>) =>
    apiCall(`/content/faqs/${id}`, () => ({ id, question: "", answer: "", order: 0, published: false, ...patch } as Faq), {
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

  testimonials: () => apiCall("/content/testimonials", () => [] as Testimonial[]),
  createTestimonial: (payload: Partial<Testimonial>) =>
    apiCall(
      "/content/testimonials",
      () => ({ id: Date.now(), name: "", role: "", quote: "", rating: 0, published: false, avatar: "", ...payload } as Testimonial),
      { method: "POST", body: payload },
    ),
  updateTestimonial: (id: number, patch: Partial<Testimonial>) =>
    apiCall(
      `/content/testimonials/${id}`,
      () => ({ id, name: "", role: "", quote: "", rating: 0, published: false, avatar: "", ...patch } as Testimonial),
      { method: "PATCH", body: patch },
    ),
  removeTestimonial: (id: number) =>
    apiCall(`/content/testimonials/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
};
