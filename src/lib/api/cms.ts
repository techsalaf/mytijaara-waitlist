import { apiCall } from "./client";
import type { Faq, Testimonial } from "@/lib/types";

export type { Faq, Testimonial };

/** One row of `cms_sections` as `CmsController::present()` returns it. */
export type CmsSection<T = Record<string, unknown>> = {
  section: string;
  title: string;
  data: T;
  draft: T | null;
  enabled: boolean;
  published: boolean;
  order: number;
  scheduledAt: string | null;
};

export type CmsSectionPatch = {
  title?: string;
  data?: Record<string, unknown>;
  draft?: Record<string, unknown> | null;
  enabled?: boolean;
  published?: boolean;
  order?: number;
  scheduled_at?: string | null;
  /** Promote `draft` into `data` and publish in one write. */
  publish_draft?: boolean;
};

/**
 * CMS content API.
 *
 * `sections`/`section` hit the admin endpoints (`/cms-admin`), which return
 * unpublished rows and the draft column. `publicSections`/`publicSection` hit
 * the public `/cms` routes the landing page uses, which return every published
 * row — including rows an administrator has switched off, carrying
 * `enabled: false` and an empty `data`. The public site needs that flag to tell
 * "switched off, hide it" apart from "missing, use the bundled default".
 */
export const cmsApi = {
  sections: () => apiCall<Record<string, CmsSection>>("/cms-admin"),
  section: <T = Record<string, unknown>>(slug: string) =>
    apiCall<CmsSection<T>>(`/cms-admin/${slug}`),
  publicSections: () => apiCall<Record<string, CmsSection>>("/cms", { public: true }),
  publicSection: <T = Record<string, unknown>>(slug: string) =>
    apiCall<CmsSection<T>>(`/cms/${slug}`, { public: true }),
  updateSection: (slug: string, patch: CmsSectionPatch) =>
    apiCall<CmsSection>(`/cms/${slug}`, { method: "PATCH", body: patch }),

  faqs: () => apiCall<Faq[]>("/content/faqs", { public: true }),
  /** `order` is optional: the backend appends to the end when it is omitted. */
  createFaq: (payload: Omit<Faq, "id" | "order"> & { order?: number }) =>
    apiCall<Faq>("/content/faqs", { method: "POST", body: payload }),
  updateFaq: (id: number, patch: Partial<Omit<Faq, "id">>) =>
    apiCall<Faq>(`/content/faqs/${id}`, { method: "PATCH", body: patch }),
  removeFaq: (id: number) =>
    apiCall<{ deleted: boolean }>(`/content/faqs/${id}`, { method: "DELETE" }),
  /** `ids` in the new display order; the backend rewrites `order` to match. */
  reorderFaqs: (ids: number[]) =>
    apiCall<{ reordered: number }>("/content/faqs/reorder", {
      method: "POST",
      body: { order: ids },
    }),

  testimonials: () => apiCall<Testimonial[]>("/content/testimonials", { public: true }),
  /** `avatar`/`rating`/`order` are optional; the backend fills the defaults. */
  createTestimonial: (
    payload: Omit<Testimonial, "id" | "order" | "avatar" | "rating"> & {
      order?: number;
      avatar?: string;
      rating?: number;
    },
  ) => apiCall<Testimonial>("/content/testimonials", { method: "POST", body: payload }),
  updateTestimonial: (id: number, patch: Partial<Omit<Testimonial, "id">>) =>
    apiCall<Testimonial>(`/content/testimonials/${id}`, { method: "PATCH", body: patch }),
  removeTestimonial: (id: number) =>
    apiCall<{ deleted: boolean }>(`/content/testimonials/${id}`, { method: "DELETE" }),
  reorderTestimonials: (ids: number[]) =>
    apiCall<{ reordered: number }>("/content/testimonials/reorder", {
      method: "POST",
      body: { order: ids },
    }),
};
