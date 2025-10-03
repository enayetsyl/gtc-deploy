"use client";
import { useState } from "react";
import { prefillPdf } from "../../hooks/useConventions";
import { useI18n } from "@/providers/i18n-provider";
import { downloadBlob } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useRef, useEffect } from "react";
import { toast } from "sonner";

export default function PrefillForm({
  sectorName,
  serviceNames,
  disabled,
  setSectorId,
  setSelectedServices,
}: {
  sectorName?: string;
  serviceNames?: string[];
  disabled?: boolean;
  setSectorId: (v: string) => void;
  setSelectedServices: (v: string[]) => void;
}) {
  const [applicantName, setApplicantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const blankRef = useRef<string | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      // use client size (CSS pixels) for drawing coordinates
      const w = Math.max(1, c.clientWidth);
      const h = Math.max(1, c.clientHeight);
      c.width = Math.floor(w * ratio);
      c.height = Math.floor(h * ratio);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      // scale context so drawing uses CSS pixel coordinates
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      // initialize white background (so PNG looks correct on PDF)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      // capture blank canvas data so we can detect a truly-empty signature later
      try {
        // we store the CSS-sized blank data URL
        blankRef.current = c.toDataURL("image/png");
      } catch (e) {
        // ignore
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function pointerPos(
    e: PointerEvent | MouseEvent | TouchEvent,
    canvas: HTMLCanvasElement
  ) {
    const rect = canvas.getBoundingClientRect();
    if (e instanceof MouseEvent) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    // TouchEvent - treat event as unknown then access touches
    const eUnknown = e as unknown as {
      touches?: TouchList;
      changedTouches?: TouchList;
    };
    const t = eUnknown.touches?.[0] ?? eUnknown.changedTouches?.[0];
    if (t) return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    return { x: 0, y: 0 };
  }

  function startDraw(e: PointerEvent | TouchEvent | MouseEvent) {
    const c = canvasRef.current;
    if (!c) return;
    drawing.current = true;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = pointerPos(e, c as HTMLCanvasElement);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  }

  function moveDraw(e: PointerEvent | TouchEvent | MouseEvent) {
    if (!drawing.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = pointerPos(e, c as HTMLCanvasElement);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    e.preventDefault();
  }

  function endDraw() {
    drawing.current = false;
    const c = canvasRef.current;
    if (!c) return;
    try {
      const data = c.toDataURL("image/png");
      // If the drawn data equals the blank reference, treat as no signature
      if (blankRef.current && data === blankRef.current)
        setSignatureDataUrl(null);
      else setSignatureDataUrl(data);
    } catch (e) {
      setSignatureDataUrl(null);
    }
  }

  function clearSignature() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setSignatureDataUrl(null);
  }
  const { t } = useI18n();

  async function handlePrefill() {
    try {
      setLoading(true);
      // validation: sector, services, and signature are mandatory
      if (!applicantName || !String(applicantName).trim()) {
        toast.error(
          t("prefill.errors.missingApplicant") ?? "Please enter applicant name"
        );
        return;
      }
      if (!sectorName) {
        toast.error(
          t("prefill.errors.missingSector") ?? "Please select a sector"
        );
        return;
      }
      if (!serviceNames || serviceNames.length === 0) {
        toast.error(
          t("prefill.errors.missingService") ??
            "Please select at least one service"
        );
        return;
      }
      if (!signatureDataUrl) {
        toast.error(
          t("prefill.errors.missingSignature") ??
            "Please sign the document using the signature box"
        );
        return;
      }

      const body: Record<string, unknown> = {
        applicantName,
        sectorName,
        title: t("convention.title") as string,
        pointName: undefined,
      };
      if (serviceNames && serviceNames.length) body.services = serviceNames;
      body.signature = signatureDataUrl;

      const blob = await prefillPdf(body);
      setApplicantName("");
      setSectorId("");
      setSelectedServices([]);
      downloadBlob(blob, "convention-prefill.pdf");
      // reset input on successful download
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label className="text-sm mb-1 block">{t("form.applicantName")}</label>
        <Input
          placeholder={t("form.applicantPlaceholder")}
          value={applicantName}
          onChange={(e) => setApplicantName(e.target.value)}
        />
        {sectorName && (
          <div className="text-xs text-muted-foreground mt-1">
            {t("ui.sector")}: {sectorName}
          </div>
        )}
        {serviceNames && serviceNames.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {t("onboarding.servicesPreselected")}: {serviceNames.join(", ")}
          </div>
        )}
        {/* Signature capture */}
        <div className="mt-3">
          <label className="text-sm block mb-1">
            {t("prefill.signatureLabel") ?? "Digital signature (required)"}
          </label>
          <div className="mt-2">
            <canvas
              ref={canvasRef}
              // size is set programmatically to account for devicePixelRatio
              className="w-full h-20 border rounded bg-white touch-none"
              onPointerDown={(e) => startDraw(e.nativeEvent)}
              onPointerMove={(e) => moveDraw(e.nativeEvent)}
              onPointerUp={() => endDraw()}
              onPointerCancel={() => endDraw()}
              onPointerLeave={() => endDraw()}
            />
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" onClick={clearSignature} size="sm">
                {t("ui.clear") ?? "Clear"}
              </Button>
              <div className="text-xs text-muted-foreground">
                {signatureDataUrl
                  ? t("prefill.signatureCaptured") ?? "Signature captured"
                  : t("prefill.noSignature") ?? "No signature yet"}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Button onClick={handlePrefill} disabled={loading || disabled}>
        {loading ? t("prefill.building") : t("prefill.download")}
      </Button>
    </div>
  );
}
