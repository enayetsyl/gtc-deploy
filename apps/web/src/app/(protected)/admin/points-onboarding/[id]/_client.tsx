"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type OnboardDetail = {
  id: string;
  name: string;
  email: string;
  vatOrTaxNumber?: string;
  phone?: string;
  signaturePath?: string;
};

export default function Client({ id }: { id: string }) {
  const [item, setItem] = useState<OnboardDetail | null>(null);
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/admin/points/onboarding`);
      if (r.ok) {
        const json = await r.json();
        const items: OnboardDetail[] = json.items || [];
        setItem(items.find((x) => x.id === id) ?? null);
      }
    })();
  }, [id]);

  async function approve() {
    const r = await fetch(`/api/admin/points/onboarding/${id}/approve`, {
      method: "POST",
    });
    if (r.ok) {
      alert("Approved");
      router.push("/admin/points-onboarding/list");
    }
  }
  async function decline() {
    const r = await fetch(`/api/admin/points/onboarding/${id}/decline`, {
      method: "POST",
    });
    if (r.ok) {
      alert("Declined");
      router.push("/admin/points-onboarding/list");
    }
  }

  if (!item) return <div>Loading…</div>;
  return (
    <div>
      <h2>
        {item.name} ({item.email})
      </h2>
      <p>VAT: {item.vatOrTaxNumber}</p>
      <p>Phone: {item.phone}</p>
      <div>
        {item.signaturePath ? (
          <Image
            src={`/uploads${item.signaturePath}`}
            alt="signature"
            width={400}
            height={160}
          />
        ) : (
          <div>No signature</div>
        )}
      </div>
      <button onClick={approve}>Approve</button>
      <button onClick={decline}>Decline</button>
    </div>
  );
}
