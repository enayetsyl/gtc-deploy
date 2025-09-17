"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUnread } from "@/lib/notifications-api";
import { useI18n } from "@/providers/i18n-provider";

export default function NotificationBell() {
  const { data: unread } = useQuery({
    queryKey: ["me", "unread"],
    queryFn: getUnread,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const count = unread ?? 0;
  const { t } = useI18n();

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center rounded-md border px-3 py-1.5 hover:bg-gray-50"
      aria-label={t("nav.notifications")}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-600 text-white text-xs px-1 flex items-center justify-center"
          aria-label={t("nav.unreadNotifications", { count: String(count) })}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
