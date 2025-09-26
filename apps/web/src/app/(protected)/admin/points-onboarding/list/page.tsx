"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import Link from "next/link";

type OnboardItem = { id: string; name: string; email: string; status?: string };

import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";

export default function ReviewList() {
  const { t } = useI18n();
  const [items, setItems] = useState<OnboardItem[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/admin/points/onboarding`);
        setItems(r.data.items || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);
  return (
    <main className="space-y-6 mb-10">
      <section className="rounded-xl border p-6 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-heading">
            {t("admin.onboarding.submitted")}
          </h2>
          <div className="flex items-center justify-start sm:justify-end">
            <Button size="sm" className="whitespace-nowrap">
              <Link href="/admin/points-onboarding/create">
                {t("admin.onboarding.createInvite")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 divide-y">
          {items.length === 0 ? (
            <p className="text-sm text-muted mt-2">{t("ui.noResults")}</p>
          ) : (
            items.map((i) => (
              <div
                key={i.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/points-onboarding/${i.id}`}
                    className="font-medium text-[--color-heading] hover:underline block truncate"
                  >
                    {i.name}
                  </Link>
                  <div className="text-xs text-muted-text truncate">
                    {i.email}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 sm:mt-0">
                  <StatusBadge status={i.status} />
                  <Button size="sm" className="whitespace-nowrap">
                    <Link href={`/admin/points-onboarding/${i.id}`}>
                      {t("ui.view")}
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || "unknown").toLowerCase();
  let bg = "bg-color-muted text-muted-foreground";

  // Map PointOnboardingStatus and legacy values to color classes
  switch (s) {
    case "draft":
      // not yet submitted
      bg = "bg-neutral-400 text-black";
      break;
    case "submitted":
      // waiting review
      bg = "bg-brand-teal-400 text-black";
      break;
    case "approved":
    case "accepted":
      bg = "bg-brand-blue-500 text-white";
      break;
    case "completed":
      // success states
      bg = "bg-brand-teal-500 text-white";
      break;
    case "declined":
    case "rejected":
    case "denied":
      // failure states
      bg = "bg-alert-error text-white";
      break;
    default:
      bg = "bg-color-muted text-muted-foreground";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}
    >
      {status ?? "UNKNOWN"}
    </span>
  );
}
