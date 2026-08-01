import { apiCall } from "./client";
import { emailTemplates } from "@/lib/mock-data";

export type EmailTemplate = (typeof emailTemplates)[number];

/**
 * Email templates API.
 *
 *   GET    /templates      -> { data: EmailTemplate[] }
 *   GET    /templates/:id  -> { data: EmailTemplate }
 *   POST   /templates      -> { data: EmailTemplate }
 *   PATCH  /templates/:id  -> { data: EmailTemplate }
 *   DELETE /templates/:id  -> { data: { deleted } }
 */
export const templatesApi = {
  list: () => apiCall("/templates", () => emailTemplates),
  get: (id: string) =>
    apiCall(`/templates/${id}`, () => emailTemplates.find((t) => t.id === id) ?? null),
  create: (payload: Partial<EmailTemplate>) =>
    apiCall(
      "/templates",
      () => ({ ...emailTemplates[0], ...payload, id: `tpl_${Date.now()}` }) as EmailTemplate,
      { method: "POST", body: payload },
    ),
  update: (id: string, patch: Partial<EmailTemplate>) =>
    apiCall(`/templates/${id}`, () => ({ ...emailTemplates.find((t) => t.id === id)!, ...patch }), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) =>
    apiCall(`/templates/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
};
