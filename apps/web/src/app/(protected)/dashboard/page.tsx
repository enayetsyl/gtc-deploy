"use client";

import Protected from "@/components/protected";
import { useAuth } from "@/providers/auth-provider";
import NotificationBell from "@/components/notification-bell";
import { useI18n } from "@/providers/i18n-provider";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <Protected>
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
          <NotificationBell />
        </header>

        <section className="rounded-xl border p-6">
          <p className="text-lg">
            {t("dashboard.welcome", { name: user?.name || "" })}
          </p>
          <p className="text-gray-600 mt-2">
            {t("dashboard.role", { role: user?.role || "" })}
          </p>
        </section>
      </main>
    </Protected>
  );
}
