"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import Link from "next/link";

type OnboardItem = { id: string; name: string; email: string; status?: string };

export default function ReviewList() {
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
        <h2>Submitted Onboardings</h2>
        <Link
          href="/admin/points-onboarding/create"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Create invite
        </Link>
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`/admin/points-onboarding/${i.id}`}>
              Name : {i.name} — Email : {i.email} — Status: {i.status ?? "UNKNOWN"}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
