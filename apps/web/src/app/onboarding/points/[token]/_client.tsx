"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type OnboardingPrefill = {
  name: string;
  email: string;
  includeServices?: boolean;
  serviceIds?: string[];
  sector?: { id: string; name?: string };
};

export default function OnboardingFormClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState<OnboardingPrefill | null | undefined>(
    undefined
  );
  const [vat, setVat] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/public/onboarding/points/${token}`);
      if (!res.ok) return setPrefill(null);
      const data = (await res.json()) as OnboardingPrefill;
      setPrefill(data);
      setServices(data.serviceIds ?? []);
      setLoading(false);
    })();
  }, [token]);

  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("vatOrTaxNumber", vat);
    fd.append("phone", phone);
    services.forEach((s) => fd.append("services[]", s));
    // signature
    const c = canvasRef.current;
    if (c) {
      const blob = await new Promise<Blob | null>((resolve) =>
        c.toBlob((b) => resolve(b), "image/png")
      );
      if (blob) fd.append("signature", blob, "signature.png");
    }
    const res = await fetch(`/api/public/onboarding/points/${token}/submit`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) router.push("/onboarding/thanks");
    else alert("Submit failed");
  }

  if (loading) return <div>Loading…</div>;
  if (!prefill) return <div>Invalid or expired link</div>;

  return (
    <form onSubmit={submit}>
      <h1>Onboarding for {prefill.name}</h1>
      <p>Email: {prefill.email}</p>
      <div>
        <label>VAT / Tax number</label>
        <input value={vat} onChange={(e) => setVat(e.target.value)} />
      </div>
      <div>
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {prefill.includeServices && (
        <div>
          <label>Services (preselected)</label>
          {prefill.serviceIds?.map((sid: string) => (
            <div key={sid}>
              <input
                type="checkbox"
                checked={services.includes(sid)}
                onChange={(e) =>
                  setServices((s) =>
                    e.target.checked ? [...s, sid] : s.filter((x) => x !== sid)
                  )
                }
              />{" "}
              {sid}
            </div>
          ))}
        </div>
      )}
      <div>
        <label>Signature</label>
        <div>
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            style={{ border: "1px solid #ccc" }}
          />
          <div>
            <button type="button" onClick={clearCanvas}>
              Clear
            </button>
          </div>
        </div>
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
