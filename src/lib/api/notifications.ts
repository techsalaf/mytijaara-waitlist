import { apiCall } from "./client";

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: "success" | "info" | "warning" | "error";
  time: string;
  unread: boolean;
};

/**
 * Admin notifications API.
 *
 *   GET   /notifications            -> { data: Notification[], meta: { unread } }
 *   PATCH /notifications/:id/read   -> { data: Notification }
 *   POST  /notifications/read-all   -> { data: { ok } }
 */
export const notificationsApi = {
  list: () => apiCall<Notification[]>("/notifications", () => []),
  markRead: (id: number) =>
    apiCall<Notification>(`/notifications/${id}/read`, () => ({
      id,
      title: "Notification",
      body: "",
      type: "info",
      time: new Date().toISOString(),
      unread: false,
    }), {
      method: "PATCH",
    }),
  markAllRead: () =>
    apiCall("/notifications/read-all", () => ({ ok: true }), { method: "POST" }),
};
