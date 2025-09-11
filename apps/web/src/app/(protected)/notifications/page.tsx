"use client";

import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@/lib/notifications-api";

type NotificationsPage = Awaited<ReturnType<typeof listNotifications>>;

export default function NotificationsPage() {
  const qc = useQueryClient();

  const feed = useInfiniteQuery({
    queryKey: ["me", "notifications"],
    queryFn: ({ pageParam }) => listNotifications(20, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const markMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (updated) => {
      // Update the cached items to mark this as read
      qc.setQueryData<InfiniteData<NotificationsPage>>(["me", "notifications"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: p.items.map((n) => (n.id === updated.id ? { ...n, read: true } : n)),
          })),
        };
      });
      // Decrement unread badge
      qc.setQueryData<number>(["me", "unread"], (prev) =>
        typeof prev === "number" ? Math.max(0, prev - 1) : prev
      );
    },
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      <div className="rounded-xl border divide-y">
        {feed.isLoading ? (
          <div className="p-6">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-500">No notifications yet.</div>
        ) : (
          <>
            {items.map((n) => (
              <div
                key={n.id}
                className="p-4 flex items-start justify-between gap-4"
                style={{ background: n.read ? undefined : "rgba(59,130,246,0.05)" }} // subtle highlight for unread
              >
                <div>
                  <div className="font-medium">{n.subject}</div>
                  {n.contentHtml ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: n.contentHtml }}
                    />
                  ) : null}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!n.read && (
                    <button
                      onClick={() => markMut.mutate(n.id)}
                      className="rounded-md border px-3 py-1.5 text-sm"
                      disabled={markMut.isPending}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}

            {feed.hasNextPage && (
              <div className="p-4">
                <button
                  className="rounded-md border px-3 py-2"
                  onClick={() => feed.fetchNextPage()}
                  disabled={feed.isFetchingNextPage}
                >
                  {feed.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
