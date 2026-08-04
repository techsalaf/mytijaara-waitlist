import { apiCall } from "./client";
import { toQuery } from "./waitlist";

/** Mirrors `AdminNotification::TYPES`. */
export type NotificationType =
  | "signup"
  | "referral"
  | "email"
  | "system"
  | "error"
  | "info";

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: NotificationType;
  time: string;
  createdAt: string | null;
  unread: boolean;
  /** Admin route this event points at, when there is one. */
  link: string | null;
  meta: Record<string, unknown> | null;
};

export type NotificationListParams = {
  type?: NotificationType | "all";
  unread?: boolean;
  per_page?: number;
};

/**
 * Admin notifications API. Rows are written by `AdminNotification::record()` at
 * the moment a real event happens (signup, referral conversion, campaign send,
 * system error), so this feed is never synthesized on read.
 */
export const notificationsApi = {
  list: (params?: NotificationListParams) =>
    apiCall<Notification[]>(`/notifications${toQuery(params as Record<string, unknown>)}`),
  markRead: (id: number) =>
    apiCall<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiCall<{ updated: number }>("/notifications/read-all", { method: "POST" }),
  /** Deletes read notifications for the current admin. */
  clearRead: () => apiCall<{ deleted: number }>("/notifications/clear", { method: "POST" }),
  remove: (id: number) =>
    apiCall<{ deleted: boolean }>(`/notifications/${id}`, { method: "DELETE" }),
};
