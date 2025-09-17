"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, API_BASE } from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type OnboardDetail = {
  id: string;
  name: string;
  email: string;
  vatOrTaxNumber?: string;
  phone?: string;
  signaturePath?: string;
  sector?: { id: string; name?: string } | null;
};

export default function Client({ id }: { id: string }) {
  const [item, setItem] = useState<OnboardDetail | null>(null);
  const [internalSalesRep, setInternalSalesRep] = useState<string>("");
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
        setInternalSalesRep(found?.internalSalesRep ?? "");
      } catch (err) {
        console.error(err);
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

  async function saveInternalSalesRep() {
    try {
      await api.post(`/api/admin/points/onboarding/${id}/update`, {
        internalSalesRep,
      });
      alert("Saved");
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  }

  if (!item) return <div>Loading…</div>;
  return (
    <div>
      <h2>{item.name}</h2>
      <h2>({item.email})</h2>
      {item.sector && <p>Sector: {item.sector.name}</p>}
      <p>VAT: {item.vatOrTaxNumber}</p>
      <p>Phone: {item.phone}</p>
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
        <div>
          <Label>Internal sales rep (editable by admin)</Label>
          <Input
            value={internalSalesRep}
            onChange={(e) => setInternalSalesRep(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={saveInternalSalesRep}>Save</Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="default" onClick={approve}>
            Approve
          </Button>
          <Button variant="destructive" onClick={decline}>
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
