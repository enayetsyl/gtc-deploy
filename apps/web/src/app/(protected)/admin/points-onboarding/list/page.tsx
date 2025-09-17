"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type OnboardItem = { id: string; name: string; email: string };

export default function ReviewList() {
  const [items, setItems] = useState<OnboardItem[]>([]);
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/points/onboarding?status=SUBMITTED");
      if (r.ok) setItems((await r.json()).items);
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
              {i.name} — {i.email}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
