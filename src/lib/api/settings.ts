import { apiCall } from "./client";

/**
 * Settings API. Settings are grouped (general, integrations, smtp, api-keys,
 * branding, seo, social, company, system). Secret values are redacted by the
 * backend on read and only overwritten when a non-masked value is sent.
 *
 *   GET   /settings/:group -> { data: Record<string, unknown> }
 *   PATCH /settings/:group -> { data: Record<string, unknown> }
 */
export const settingsApi = {
  get: (group: string) => apiCall(`/settings/${group}`, () => ({}) as Record<string, unknown>),
  update: (group: string, patch: Record<string, unknown>) =>
    apiCall(`/settings/${group}`, () => patch, { method: "PATCH", body: patch }),
};
