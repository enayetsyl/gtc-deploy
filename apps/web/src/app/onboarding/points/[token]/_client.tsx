"use client";
import { useEffect, useState, useRef } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [termsOpen, setTermsOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/public/onboarding/points/${token}`);
        const data = r.data as OnboardingPrefill;
        setPrefill(data);
        setServices(data.serviceIds ?? []);
      } catch {
        setPrefill(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // clear using CSS pixels since we scale the context to devicePixelRatio
    const rect = c.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  // Drawing state and handlers
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Resize the canvas for DPR and keep a scaled context. Use ResizeObserver so
  // the canvas updates if the layout changes. Pointer handlers are attached
  // directly to the canvas element via React props (see below) for reliability.
  useEffect(() => {
    const maybeEl = canvasRef.current;
    if (!maybeEl) return;
    const el = maybeEl as HTMLCanvasElement;

    function resize() {
      const rect = el.getBoundingClientRect();
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      el.width = Math.max(1, Math.round(rect.width * dpr));
      el.height = Math.max(1, Math.round(rect.height * dpr));
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";
    }

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    // Also update on window dpr changes (some browsers fire resize on zoom)
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  // React pointer handlers attached directly to <canvas> for better cross-browser behavior

  function getEventPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const el = canvasRef.current;
    if (!el) return null;
    // Try native offsetX/offsetY first (handles transforms/padding better in many browsers)
    const ne = e.nativeEvent as unknown as {
      offsetX?: number;
      offsetY?: number;
    };
    if (typeof ne.offsetX === "number" && typeof ne.offsetY === "number") {
      return { x: ne.offsetX, y: ne.offsetY };
    }
    // fallback to client coordinates
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const el = canvasRef.current;
    if (!el) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    drawing.current = true;
    const p = getEventPos(e);
    if (!p) return;
    lastPoint.current = p;
    const cctx = el.getContext("2d");
    if (!cctx) return;
    cctx.beginPath();
    cctx.moveTo(p.x, p.y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const el = canvasRef.current;
    if (!el) return;
    const p = getEventPos(e);
    if (!p) return;
    const cctx = el.getContext("2d");
    if (!cctx || !lastPoint.current) return;
    cctx.lineTo(p.x, p.y);
    cctx.stroke();
    lastPoint.current = p;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const el = canvasRef.current;
    if (!el) return;
    drawing.current = false;
    lastPoint.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) {
      toast.error(
        "You must accept the Terms and Conditions before submitting."
      );
      return;
    }
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
      if (blob) fd.append("file", blob, "signature.png");
    }
    try {
      await api.post(`/api/public/onboarding/points/${token}/submit`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      router.push("/onboarding/thanks");
    } catch (err) {
      console.error(err);
      alert("Submit failed");
    }
  }

  const { t } = useI18n();

  if (loading) return <div>{t("ui.loading")}</div>;
  if (!prefill) return <div>{t("onboarding.invalidLink")}</div>;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4 mx-auto">
      <h1 className="text-xl font-semibold">
        {t("onboarding.title", { name: prefill.name })}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("onboarding.email", { email: prefill.email })}
      </p>

      <div>
        <Label>{t("onboarding.vatLabel")}</Label>
        <Input value={vat} onChange={(e) => setVat(e.target.value)} />
      </div>

      <div>
        <Label>{t("onboarding.phoneLabel")}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          onClick={() => setTermsOpen(true)}
        >
          {t("onboarding.terms")}
        </Button>
      </div>

      {prefill.includeServices && (
        <div>
          <Label>{t("onboarding.servicesPreselected")}</Label>
          <div className="space-y-2">
            {prefill.serviceIds?.map((sid: string) => (
              <div key={sid} className="flex items-center gap-2">
                <Checkbox
                  checked={services.includes(sid)}
                  // onCheckedChange={(c) =>
                  //   setServices((s) =>
                  //     c ? [...s, sid] : s.filter((x) => x !== sid)
                  //   )
                  // }
                  aria-readonly
                />
                <span className="text-sm">{sid}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>{t("onboarding.signature")}</Label>
        <div>
          <canvas
            ref={canvasRef}
            width={800}
            height={320}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              border: "1px solid #ccc",
              width: "100%",
              height: 160,
              touchAction: "none",
            }}
          />
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" onClick={clearCanvas}>
              {t("onboarding.clear")}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Button type="submit">{t("onboarding.submit")}</Button>
      </div>

      {/* Terms modal (simple overlay) */}
      {termsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setTermsOpen(false)}
          />
          <div className="relative max-w-2xl w-full bg-popover text-popover-foreground rounded-xl shadow-lg p-6 mx-4">
            <h2 className="text-lg font-semibold mb-2">
              {t("onboarding.termsTitle")}
            </h2>
            <div className="text-sm text-muted-foreground space-y-3 mb-4 max-h-60 overflow-auto">
              <p>{t("onboarding.termsParagraph1")}</p>
              <p>{t("onboarding.termsParagraph2")}</p>
              <p>{t("onboarding.termsParagraph3")}</p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-sm">{t("onboarding.agreeLabel")}</span>
              </label>

              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTermsOpen(false)}
                >
                  {t("onboarding.close")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!agreed) {
                      toast.error(t("onboarding.mustAgree"));
                      return;
                    }
                    // close modal — signature is already captured on canvas; agreement recorded locally
                    setTermsOpen(false);
                    toast.success(t("onboarding.termsAccepted"));
                  }}
                >
                  {t("onboarding.signAndAccept")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
