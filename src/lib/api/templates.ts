import { apiCall } from "./client";
import type { EmailTemplate } from "@/lib/types";

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
  list: () => apiCall<EmailTemplate[]>("/templates", () => []),
  get: (id: string) => apiCall<EmailTemplate | null>(`/templates/${id}`, () => null),
  create: (payload: Partial<EmailTemplate>) =>
    apiCall(
      "/templates",
      () => ({
        id: `tpl_${Date.now()}`,
        name: payload.name ?? "New template",
        category: payload.category ?? "General",
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        html: payload.html ?? "",
      }) as EmailTemplate,
      { method: "POST", body: payload },
    ),
  update: (id: string, patch: Partial<EmailTemplate>) =>
    apiCall<EmailTemplate>(`/templates/${id}`, () => ({ id, ...patch } as EmailTemplate), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) => apiCall(`/templates/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
};
