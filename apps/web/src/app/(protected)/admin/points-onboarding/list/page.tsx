"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import Link from "next/link";

type OnboardItem = { id: string; name: string; email: string; status?: string };

import { useI18n } from "@/providers/i18n-provider";

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
    <main className="space-y-6">
      <section className="rounded-xl border p-6 bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">
            {t("admin.onboarding.submitted")}
          </h2>
          <Link
            href="/admin/points-onboarding/create"
            className="rounded-md border px-3 py-1.5 text-sm bg-[--color-button-primary] text-[--color-button-on-primary] hover:bg-[--color-button-primary-hover]"
          >
            {t("admin.onboarding.createInvite")}
          </Link>
        </div>

        <div className="mt-4 divide-y">
          {items.length === 0 ? (
            <p className="text-sm text-muted mt-2">{t("ui.noResults")}</p>
          ) : (
            items.map((i) => (
              <div
                key={i.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <a
                    href={`/admin/points-onboarding/${i.id}`}
                    className="font-medium text-[--color-heading] hover:underline"
                  >
                    {i.name}
                  </a>
                  <div className="text-xs text-muted-text">{i.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={i.status} />
                  <Link
                    href={`/admin/points-onboarding/${i.id}`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-[--color-button-secondary-hover-bg]"
                  >
                    {t("ui.view")}
                  </Link>
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
  let bg = "bg-[--color-muted] text-[--color-muted-foreground]";
  if (s === "approved" || s === "accepted") {
    bg = "bg-[--color-brand-teal-500] text-white";
  } else if (s === "pending") {
    bg = "bg-[--color-highlight] text-black";
  } else if (s === "rejected" || s === "denied") {
    bg = "bg-[--color-danger] text-white";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}
    >
      {status ?? "UNKNOWN"}
    </span>
  );
}
