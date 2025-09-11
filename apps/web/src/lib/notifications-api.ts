import { api } from "./axios";

export type Notification = {
  id: string;
  userId: string;
  type: string;
  subject: string;
  contentHtml?: string | null;
  read: boolean;
  createdAt: string;
};

export async function getUnread(): Promise<number> {
  const { data } = await api.get<{ unread: number }>("/api/me/notifications/unread-count");
  return data.unread;
}

export async function listNotifications(take = 20, cursor?: string) {
  const { data } = await api.get<{ items: Notification[]; nextCursor: string | null }>(
    "/api/me/notifications",
    { params: { take, cursor } }
  );
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.post<Notification>(`/api/me/notifications/${id}/read`);
  return data;
}
