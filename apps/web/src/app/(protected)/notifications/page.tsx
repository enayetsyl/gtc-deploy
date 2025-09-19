"use client";

import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listNotifications,
  markNotificationRead,
} from "@/lib/notifications-api";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";

type NotificationsPage = Awaited<ReturnType<typeof listNotifications>>;

export default function NotificationsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const feed = useInfiniteQuery({
    queryKey: ["me", "notifications"],
    queryFn: ({ pageParam }) =>
      listNotifications(20, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const markMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (updated) => {
      // Update the cached items to mark this as read
      qc.setQueryData<InfiniteData<NotificationsPage>>(
        ["me", "notifications"],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((p) => ({
              ...p,
              items: p.items.map((n) =>
                n.id === updated.id ? { ...n, read: true } : n
              ),
            })),
          };
        }
      );
      // Decrement unread badge
      qc.setQueryData<number>(["me", "unread"], (prev) =>
        typeof prev === "number" ? Math.max(0, prev - 1) : prev
      );
    },
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t("nav.notifications")}</h1>

      <div className="rounded-xl border divide-y border-divider bg-card-bg">
        {feed.isLoading ? (
          <div className="p-6">{t("ui.loading")}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-muted-foreground">
            {t("notifications.empty")}
          </div>
        ) : (
          <>
            {items.map((n) => (
              <div
                key={n.id}
                className="p-4 flex items-start justify-between gap-4"
                style={{
                  background: n.read ? undefined : "rgba(59,130,246,0.05)",
                }}
              >
                <div>
                  <div className="font-medium text-body">{n.subject}</div>
                  {n.contentHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-body"
                      dangerouslySetInnerHTML={{ __html: n.contentHtml }}
                    />
                  ) : null}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!n.read && (
                    <Button
                      onClick={() => markMut.mutate(n.id)}
                      className="rounded-md"
                      size="sm"
                      disabled={markMut.isPending}
                    >
                      {t("notifications.markRead")}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {feed.hasNextPage && (
              <div className="p-4">
                <Button
                  className="rounded-md"
                  onClick={() => feed.fetchNextPage()}
                  disabled={feed.isFetchingNextPage}
                >
                  {feed.isFetchingNextPage
                    ? t("ui.loading")
                    : t("notifications.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
