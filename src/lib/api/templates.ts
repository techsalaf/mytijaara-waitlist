import { apiCall } from "./client";
import type { EmailTemplate } from "@/lib/types";

/** Extra fields `EmailTemplateResource` returns for the editor. */
export type EmailTemplateDetail = EmailTemplate & {
  subject: string | null;
  html: string | null;
  text: string | null;
};

export type EmailTemplateInput = {
  name: string;
  category?: string | null;
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  thumbnail?: string | null;
};

/** Email templates API. Backed by the `email_templates` table. */
export const templatesApi = {
  list: () => apiCall<EmailTemplateDetail[]>("/templates"),
  get: (id: string) => apiCall<EmailTemplateDetail>(`/templates/${id}`),
  create: (payload: EmailTemplateInput) =>
    apiCall<EmailTemplateDetail>("/templates", { method: "POST", body: payload }),
  update: (id: string, patch: Partial<EmailTemplateInput>) =>
    apiCall<EmailTemplateDetail>(`/templates/${id}`, { method: "PATCH", body: patch }),
  remove: (id: string) =>
    apiCall<{ deleted: boolean }>(`/templates/${id}`, { method: "DELETE" }),
};
