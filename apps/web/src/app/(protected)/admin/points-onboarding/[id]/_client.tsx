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

  const isSubmitted = item.status === "SUBMITTED";
  const statusLabel = item.status ?? "Unknown";
  const statusClasses =
    item.status === "SUBMITTED"
      ? "bg-emerald-100 text-emerald-800"
      : item.status === "APPROVED"
      ? "bg-blue-100 text-blue-800"
      : item.status === "DECLINED"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white/5 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            GTC Point Name: <span className="font-normal">{item.name}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Email: <span className="font-medium">{item.email}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div>
          <p className="text-sm text-muted-foreground">Sector</p>
          <p className="mt-1 font-medium">
            {item.sector && item.sector.name ? item.sector.name : "Not given"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">VAT / Tax Number</p>
          <p className="mt-1 font-medium">
            {item.vatOrTaxNumber ? item.vatOrTaxNumber : "Not given"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="mt-1 font-medium">
            {item.phone ? item.phone : "Not given"}
          </p>
        </div>
        <div></div>
      </div>

      {item.services && item.services.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">Requested services</p>
          <div className="flex flex-wrap gap-2">
            {item.services.map((s) => {
              const svc = servicesList.find((x) => x.id === s.serviceId);
              return (
                <span
                  key={s.id}
                  className="text-sm bg-slate-100 text-slate-800 px-2 py-1 rounded-full"
                >
                  {svc ? svc.name : s.serviceId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm text-muted-foreground mb-2">Signature</p>
        <div className="w-full border rounded-md p-4 flex items-center justify-center bg-white/2">
          {item.signaturePath ? (
            <Image
              src={`${API_BASE}/uploads${item.signaturePath}`}
              alt="signature"
              width={400}
              height={160}
              style={{ objectFit: "contain" }}
              unoptimized
            />
          ) : (
            <div className="text-sm text-muted-foreground">No signature</div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={approve}
              disabled={!isSubmitted}
              title={
                !isSubmitted
                  ? "Only available when status is SUBMITTED"
                  : undefined
              }
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={decline}
              disabled={!isSubmitted}
              title={
                !isSubmitted
                  ? "Only available when status is SUBMITTED"
                  : undefined
              }
            >
              Decline
            </Button>
          </div>

          {!isSubmitted && (
            <p className="text-xs text-muted-foreground">
              Actions available only when status is SUBMITTED.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
