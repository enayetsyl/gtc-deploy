"use client";
import { useEffect, useState } from "react";

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
      <h2>Submitted Onboardings</h2>
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
