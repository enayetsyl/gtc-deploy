"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, API_BASE } from "@/lib/axios";
// ...existing UI imports
import { Button } from "@/components/ui/button";

type OnboardDetail = {
  id: string;
  name: string;
  email: string;
  vatOrTaxNumber?: string;
  phone?: string;
  signaturePath?: string;
  sector?: { id: string; name?: string } | null;
  status?: string;
  services?: Array<{ id: string; serviceId: string }>;
};

export default function Client({ id }: { id: string }) {
  const [item, setItem] = useState<OnboardDetail | null>(null);
  const [servicesList, setServicesList] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/admin/points/onboarding`);
        const json = r.data;
        const items: OnboardDetail[] = json.items || [];
        const found = (items.find((x) => x.id === id) ?? null) as
          | (OnboardDetail & { internalSalesRep?: string })
          | null;
        setItem(found);
      } catch (err) {
        console.error(err);
      }
    })();
    // fetch services to map serviceId -> name for display
    (async () => {
      try {
        const r = await api.get<{ id: string; name: string }[]>(
          `/api/admin/services`
        );
        const data = r.data || [];
        setServicesList(data.map((s) => ({ id: s.id, name: s.name })));
      } catch {
        // ignore
      }
    })();
  }, [id]);

  async function approve() {
    try {
      await api.post(`/api/admin/points/onboarding/${id}/approve`);
      alert("Approved");
      router.push("/admin/points-onboarding/list");
    } catch (err) {
      console.error(err);
    }
  }
  async function decline() {
    try {
      await api.post(`/api/admin/points/onboarding/${id}/decline`);
      alert("Declined");
      router.push("/admin/points-onboarding/list");
    } catch (err) {
      console.error(err);
    }
  }

  if (!item)
    return (
      <div className="flex justify-center items-center h-screen">Loading…</div>
    );

  console.log("item", item);
  return (
    <div>
      <h2>GTC Point Name: {item.name}</h2>
      <h2>GTC Point Email: {item.email}</h2>
      <p>
        Sector:{" "}
        {item.sector && item.sector.name ? item.sector.name : "Not given"}
      </p>
      <p>VAT: {item.vatOrTaxNumber ? item.vatOrTaxNumber : "Not given"}</p>
      <p>Phone: {item.phone ? item.phone : "Not given"}</p>
      {item.services && item.services.length > 0 && (
        <div>
          <p className="font-medium">Requested services:</p>
          <ul className="list-disc pl-6">
            {item.services.map((s) => {
              const svc = servicesList.find((x) => x.id === s.serviceId);
              return <li key={s.id}>{svc ? svc.name : s.serviceId}</li>;
            })}
          </ul>
        </div>
      )}
      <div>
        {item.signaturePath ? (
          // Use a plain <img> with the API base URL so the browser requests the file
          // directly from the API server (which serves /uploads). Next's Image
          // optimizer requests /uploads from the Next server and can return
          // invalid responses in dev if not proxied to the API.
          <Image
            src={`${API_BASE}/uploads${item.signaturePath}`}
            alt="signature"
            width={400}
            height={160}
            style={{ objectFit: "contain" }}
            unoptimized
          />
        ) : (
          <div>No signature</div>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex gap-2 mt-4">
          <Button
            variant="default"
            onClick={approve}
            disabled={item.status !== "SUBMITTED"}
          >
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={decline}
            disabled={item.status !== "SUBMITTED"}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
