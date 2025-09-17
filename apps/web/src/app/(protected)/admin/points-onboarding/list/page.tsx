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
    <div>
      <div className="flex items-center justify-between">
        <h2>{t("admin.onboarding.submitted")}</h2>
        <Link
          href="/admin/points-onboarding/create"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          {t("admin.onboarding.createInvite")}
        </Link>
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`/admin/points-onboarding/${i.id}`}>
              {t("admin.onboarding.listItem", {
                name: i.name,
                email: i.email,
                status: i.status ?? "UNKNOWN",
              })}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
