import { apiCall } from "./client";
import { notifications } from "@/lib/mock-data";

export type Notification = (typeof notifications)[number];

/**
 * Admin notifications API.
 *
 *   GET   /notifications            -> { data: Notification[], meta: { unread } }
 *   PATCH /notifications/:id/read   -> { data: Notification }
 *   POST  /notifications/read-all   -> { data: { ok } }
 */
export const notificationsApi = {
  list: () => apiCall("/notifications", () => notifications),
  markRead: (id: number) =>
    apiCall(`/notifications/${id}/read`, () => ({ ...notifications.find((n) => n.id === id)!, unread: false }), {
      method: "PATCH",
    }),
  markAllRead: () =>
    apiCall("/notifications/read-all", () => ({ ok: true }), { method: "POST" }),
};
