/**
 * Stays notifications API — the Stays twin of `features/notifications/api.js`.
 *
 * Notifications share the account table but are product-tagged. Every Stays
 * read/write passes `domain=stays`, so tour alerts never ring this bell. In
 * mock mode the whole inbox reads and writes the Stays mock.
 */
import api from "@/lib/axios";
import { staysMock } from "../mock/store";
import { staysUsesMockData } from "../api";
import { mapStaysNotification, parseStaysNotificationsResponse } from "./presentation";

const requestConfig = { skipGlobalErrorHandler: true };

export async function fetchStaysNotifications(params = {}) {
  if (staysUsesMockData) {
    const payload = await staysMock.listNotifications(params);
    return {
      notifications: (payload.notifications || []).map(mapStaysNotification),
      unreadCount: payload.unreadCount ?? 0,
    };
  }
  const response = await api.get("/stays/supplier/notifications", {
    ...requestConfig,
    params: { ...params, domain: "stays" },
  });
  return parseStaysNotificationsResponse(response);
}

export function markStaysNotificationAsRead(id) {
  if (staysUsesMockData) return staysMock.markNotificationRead(id);
  return api.patch(`/stays/supplier/notifications/${id}/read`, null, requestConfig);
}

export function markAllStaysNotificationsAsRead() {
  if (staysUsesMockData) return staysMock.markAllNotificationsRead();
  return api.patch("/stays/supplier/notifications/mark-all-read", null, {
    ...requestConfig,
    params: { domain: "stays" },
  });
}

export function deleteStaysNotification(id) {
  if (staysUsesMockData) return staysMock.deleteNotification(id);
  return api.delete(`/stays/supplier/notifications/${id}`, requestConfig);
}
