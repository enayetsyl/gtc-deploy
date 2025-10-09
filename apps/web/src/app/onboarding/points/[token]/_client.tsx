"use client";
import { useEffect, useState, useRef } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";
import { toast } from "sonner";

type OnboardingPrefill = {
  name: string;
  email: string;
  includeServices?: boolean;
  serviceIds?: string[];
  // new `services` contains id+name pairs provided by backend for display
  services?: Array<{ id: string; name?: string | null }>;
  sector?: { id: string; name?: string };
};

export default function OnboardingFormClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState<OnboardingPrefill | null | undefined>(
    undefined
  );
  // Agreement fields
  const [protocolNo, setProtocolNo] = useState("");
  const [conventionNo, setConventionNo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxCode, _setTaxCode] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regProvince, setRegProvince] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [legalRep, setLegalRep] = useState("");
  const [contactSurname, setContactSurname] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pointEmail, setPointEmail] = useState("");
  const [placeSigned, setPlaceSigned] = useState("");
  const [dateSigned, setDateSigned] = useState("");
  const [agreeArticles, setAgreeArticles] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/public/onboarding/points/${token}`);
        const data = r.data as OnboardingPrefill;
        setPrefill(data);
        // prefill company/contact if available
        setCompanyName(data.name ?? "");
        setContactEmail(data.email ?? "");
        // if backend provides a specific point email, prefill it too
        // otherwise default to the same contact email
        setPointEmail((data.email as string) ?? "");
        // preselect no services by default
        setServices([]);
      } catch (err: unknown) {
        setPrefill(null);
        setLoadingError(String(err) ?? "Failed to load");
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

  // submit is handled inline in the form's onSubmit

  const { t } = useI18n();

  if (loading) return <div className="p-6">{t("ui.loading")}</div>;
  if (!prefill)
    return (
      <div className="p-6">
        {t("onboarding.invalidLink")}
        {loadingError ? ` - ${loadingError}` : ""}
      </div>
    );

  // Client-side validation helper
  function validate() {
    if (!companyName.trim()) return "Please enter the company name.";
    if (!contactEmail.trim()) return "Please enter a valid contact email.";
    // basic email format check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail))
      return "Please enter a valid contact email.";
    if (!placeSigned.trim())
      return "Please enter the place where the agreement was signed.";
    if (!dateSigned)
      return "Please select the date when the agreement was signed.";
    if (!agreeArticles) return "You must accept Articles 1–10 to proceed.";
    return null;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const v = validate();
        if (v) {
          toast.error(v);
          return;
        }
        setSubmitting(true);
        const fd = new FormData();
        fd.append("protocolNo", protocolNo);
        fd.append("conventionNo", conventionNo);
        fd.append("companyName", companyName);
        fd.append("taxCodeOrVat", taxCode);
        fd.append("registeredCity", regCity);
        fd.append("registeredProvince", regProvince);
        fd.append("registeredAddress", regAddress);
        fd.append("legalRepresentative", legalRep);
        fd.append("contactSurname", contactSurname);
        fd.append("contactName", contactName);
        fd.append("contactRole", contactRole);
        fd.append("contactPhone", contactPhone);
        fd.append("contactEmail", contactEmail);
  fd.append("pointEmail", pointEmail);
        fd.append("placeSigned", placeSigned);
        fd.append("dateSigned", dateSigned);
        services.forEach((s) => fd.append("services[]", s));
        if (agreeArticles) fd.append("agreedToArticles", "on");

        // signature
        const c = canvasRef.current;
        if (c) {
          const blob = await new Promise<Blob | null>((resolve) =>
            c.toBlob((b) => resolve(b), "image/png")
          );
          if (blob) fd.append("file", blob, "signature.png");
        }

        try {
          await api.post(`/api/public/onboarding/points/${token}/submit`, fd);
          toast.success("Agreement submitted");
          router.push("/onboarding/thanks");
        } catch (err) {
          console.error(err);
          toast.error("Submission failed");
        }
        setSubmitting(false);
      }}
      className="max-w-5xl mx-auto p-6 space-y-6"
    >
      <h1 className="text-xl font-semibold">GTC NETWORK AGREEMENT</h1>

      <div className="space-y-2 text-sm">
        <p>
          <strong>Protocol No.:</strong>{" "}
          <Input
            value={protocolNo}
            onChange={(e) => setProtocolNo(e.target.value)}
            className="inline-block w-48 ml-2"
          />
        </p>
        <p>
          <strong>Convention No.:</strong>{" "}
          <Input
            value={conventionNo}
            onChange={(e) => setConventionNo(e.target.value)}
            className="inline-block w-48 ml-2"
          />
        </p>
      </div>

      <section className="prose max-w-none">
        <h2 className="font-bold text-xl">Agreement Between</h2>
        <p>
          <strong>The GTC Network</strong>, Tax Code 12358991003, with its
          registered office in Salerno (SA), Via Terre delle Risaie snc,
          represented by the President, Dr. Eng. Secondo Martino, through its
          founding companies:
        </p>
        <ul>
          <li>
            <strong>Globalform s.r.l.</strong> (VAT: 03902160658), registered
            office in Salerno (SA), Via Terre delle Risaie, represented by its
            legal representative;
          </li>
          <li>
            <strong>Infotel Sistemi s.r.l.</strong> (VAT: 09905391000),
            registered office in Milan, Corso Buenos Aires 45, represented by
            its legal representative;
          </li>
          <li>
            <strong>Formasec s.r.l.</strong> (VAT: 01212120867), registered
            office in Enna (EN), Via Unità d’Italia snc, represented by its
            legal representative;
          </li>
          <li>
            <strong>A.I.S.F.</strong> (VAT: 91052710653), registered office in
            Battipaglia, Via Fiorignano 29, represented by the President, Dr.
            Eng. Secondo Martino;
          </li>
        </ul>
        <p>
          (hereinafter referred to as “<strong>NETWORK</strong>”)
        </p>

        <p>and</p>

        <p>
          <strong>
            <Input
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full inline-block"
            />
          </strong>
          &nbsp; (Tax Code/VAT:{" "}
          <Input
            placeholder="Tax code or VAT"
            value={taxCode}
            onChange={(e) => _setTaxCode(e.target.value)}
            className="inline-block w-64 ml-2"
          />
          ),
          <br />
          with registered office in{" "}
          <Input
            placeholder="Registered city"
            value={regCity}
            onChange={(e) => setRegCity(e.target.value)}
            className="inline-block w-64"
          />{" "}
          (
          <Input
            placeholder="Province"
            value={regProvince}
            onChange={(e) => setRegProvince(e.target.value)}
            className="inline-block w-32 ml-2"
          />
          ),
          <br />
          at the address{" "}
          <Input
            placeholder="Address"
            value={regAddress}
            onChange={(e) => setRegAddress(e.target.value)}
            className="w-full inline-block mt-1"
          />
          ,
          <br />
          represented by its legal representative{" "}
          <Input
            placeholder="Legal representative"
            value={legalRep}
            onChange={(e) => setLegalRep(e.target.value)}
            className="inline-block w-64"
          />
          ;
        </p>

        <p>
          (hereinafter referred to as “<strong>POINT GTC</strong>”).
        </p>

        <h3 className="font-bold text-xl">
          <strong>Preamble</strong>
        </h3>
        <p>
          The GTC Network is a professional network among professionals,
          companies, training centers, consultants, and professional firms
          (known as <em>GTC Affiliates</em>). Its objective is to expand the
          network’s range of services by enabling knowledge exchange and,
          through cooperation among participants, provide high-quality,
          professional, and growth-oriented solutions.
        </p>

        <p>
          <strong>The founding members are:</strong>
        </p>

        <p>
          <strong>Globalform S.r.l.</strong>, an accredited training center
          authorized to design, organize, and deliver educational programs in
          the Campania (DD n.5/2019) and Sicily Regions (DDG 421/2019),
          registered in the MIUR Research Registry No. 55018, ECM and CFP
          Provider for several Professional Orders, accredited by Accredia under
          UNI CEI EN ISO 17024:2012, authorized by ANPAL (intermediary code
          A717S284613) to provide employment services, including recruitment,
          personnel selection, and career relocation support.
        </p>

        <p>
          <strong>Infotel Sistemi S.r.l.</strong>, an IT products and services
          company with over 25 years of experience in software system design,
          development, and consultancy in occupational safety for both public
          and private sectors.
        </p>

        <p>
          <strong>Formasec S.r.l.</strong>, accredited by the Sicilian Region
          for delivering training in workplace safety (D.Lgs. 81/08) and for
          food safety (HACCP).
        </p>

        <p>
          <strong>A.I.S.F.</strong>, a professional association representing
          those engaged in training, consultancy in Safety, Quality,
          Environment, and software development/distribution. <br />
          It is listed in the Ministry of Enterprises and Made in Italy’s
          (MIMIT) official register of professional associations under Law No.
          4/2013.
        </p>

        <p>
          The <strong>POINT</strong> is an entity/professional intending to
          offer services and products to clients, equipped with technical and
          professional infrastructure suitable for knowledge sharing within the
          GTC Network. It has declared its competence and experience sufficient
          to ensure the proper and compliant management of the activities
          covered by this agreement.
        </p>

        <h3 className="font-bold text-xl">Article 0 – Preamble</h3>
        <p>
          The preamble forms an integral and essential part of this agreement.
        </p>

        <h3 className="font-bold text-xl">Article 1 – Object</h3>
        <p>
          The parties intend to collaborate synergistically to expand their
          respective organizations, acquiring clients across Italy — both public
          and private — interested in the services/products offered by the
          Network.
        </p>

        <p>
          Upon signing this agreement, the POINT shall have access to a reserved
          price list or a defined commission structure (fee), detailed in an
          annex outlining operational and financial terms.
        </p>

        <p>
          The NETWORK provides products and services listed at:{" "}
          <a href="http://www.networkgtc.it">www.networkgtc.it</a>.
        </p>

        <p>
          The <strong>POINT GTC</strong> may select the services/products
          applicable to its activity below.
        </p>
        <div className="p-3 border rounded bg-background">
          <p className="font-medium">
            Services related to this sector (select those that apply):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {prefill.services && prefill.services.length ? (
              prefill.services.map((s) => {
                const checked = services.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="services[]"
                      value={s.id}
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked)
                          setServices((prev) => [...prev, s.id]);
                        else
                          setServices((prev) =>
                            prev.filter((id) => id !== s.id)
                          );
                      }}
                    />
                    <span className="text-sm">{s.name ?? s.id}</span>
                  </label>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No services configured for this sector.
              </p>
            )}
          </div>
        </div>
        <p>
          The NETWORK will provide the POINT with all necessary commercial
          information for promoting its services.
        </p>
        <p>
          Additional services or custom solutions not in the catalog may be
          developed upon request, subject to mutual agreement through a separate
          annex.
        </p>

        <h3 className="font-bold text-xl">
          Article 2 – Duration and Termination
        </h3>
        <p>
          This agreement lasts <strong>one (1) year</strong> from the date of
          signing and renews automatically unless canceled by certified email
          (PEC) at least 90 days before expiry.
        </p>
        <p>
          {" "}
          The NETWORK reserves the right to review the POINT’s performance
          (quantitatively and qualitatively) annually and may adjust terms
          accordingly. The NETWORK may terminate this agreement immediately and
          without notice for breach by sending written notification (registered
          mail or PEC).{" "}
        </p>
        <p>
          Upon termination, both parties agree to complete ongoing
          non-interruptible activities.
        </p>

        <h3 className="font-bold text-xl">Article 3 – Economic Conditions</h3>
        <p>
          The POINT may independently market the products from its premises,
          without subordination.
        </p>
        <p>
          {" "}
          Operational methods, technical requirements, and economic conditions
          will be defined in specific annexes and may vary according to
          NETWORK’s price list validity.
        </p>

        <h3 className="font-bold text-xl">
          Article 4 – Obligations of the POINT GTC
        </h3>
        <p>
          The POINT agrees to perform duties diligently, in good faith, and in
          compliance with laws, protecting the NETWORK’s image and reputation.
        </p>
        <p>
          It must display an identification plaque at its premises, as per the
          attached procedure. The POINT may not use the NETWORK’s trademarks,
          logos, or distinctive marks without authorization.{" "}
        </p>
        <p>If permitted, it shall not alter them in any way. </p>
        <p>
          The POINT must comply with labor, safety, and regulatory standards.{" "}
        </p>

        <h4 className="font-semibold telg">POINT GTC Contact Person:</h4>

        <div className="mt-2 space-y-3 text-sm">
          <div className="grid grid-cols-1  gap-2">
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Surname</div>
              <Input
                placeholder="Surname"
                value={contactSurname}
                onChange={(e) => setContactSurname(e.target.value)}
                className="w-full"
              />
            </label>

            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <Input
                placeholder="Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full"
              />
            </label>

            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Role</div>
              <Input
                placeholder="Role"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                className="w-full"
              />
            </label>
          </div>

          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">
              Phone/Email
            </div>
            <Input
              placeholder="Phone or Email"
              value={contactPhone || contactEmail}
              onChange={(e) => {
                const v = e.target.value;
                if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
                  setContactEmail(v);
                  setContactPhone("");
                } else {
                  setContactPhone(v);
                }
              }}
              className="w-full"
            />
          </label>
        </div>
        <h3 className="font-bold text-xl">
          Article 5 – Liability and Indemnity
        </h3>
        <p>
          Each party releases the other from liability arising from third-party
          claims related to this agreement.
        </p>
        <p>
          The POINT explicitly indemnifies the NETWORK and its partners (via the
          annexed *Indemnity Agreement*) against any action, omission, or claim
          related to its activities.
        </p>
        <p>
          The POINT shall not represent the NETWORK legally or make commitments
          on its behalf.
        </p>

        <h3 className="font-bold text-xl">
          Article 6 – Intellectual Property and Data Confidentiality
        </h3>
        <p>
          The POINT acknowledges the intellectual property ownership of the
          NETWORK and its founders over all trademarks, logos, certifications,
          and educational content.
        </p>
        <p>
          All materials are protected by copyright and cannot be copied,
          modified, or distributed without written authorization.{" "}
        </p>
        <p>
          Both parties agree not to disclose confidential information for{" "}
          <strong>3 years</strong> after termination.
        </p>

        <h3 className="font-bold text-xl">Article 7 – Operational Methods</h3>
        <p>
          The parties will define specific operational and technical procedures
          in separate annexes for each macro area.
        </p>

        <h3 className="font-bold text-xl">Article 8 – Contractual Modifications</h3>
        <p>
          Any modification to this agreement must be in writing and signed by
          both parties.
        </p>
        <p>All communications must be sent by registered mail or PEC:</p>
        <ul>
          <li>
            <strong>For Network GTC:</strong> amministrazione@pec.networkgtc.it
          </li>
          <li>
            <label className="block mt-2">
          <div ><strong>Point G.T.C. Email</strong> </div>
          <Input
            placeholder="Point G.T.C. email"
            value={pointEmail}
            onChange={(e) => setPointEmail(e.target.value)}
            className="w-full"
          />
        </label>
          </li>
        </ul>
        <p>
          Any change of contact or legal representative must be communicated
          within <strong>48 hours</strong>.
        </p>

        <h3 className="font-bold text-xl">Article 9 – Data Processing</h3>
        <p>
    In accordance with EU Regulation 2016/679 (GDPR), data processing will only serve the purposes of this agreement.  



        </p>
        <p>The POINT is the **Data Controller**, and the NETWORK will act as **Data Processor**.  </p>
        <p>Both parties guarantee compliance with privacy laws and proper collection of consent from data subjects.</p>

        <h3 className="font-bold text-xl">Article 10 – Jurisdiction</h3>
        <p>
          This agreement is governed by <strong>Italian law</strong>. Any
          dispute arising shall fall under the jurisdiction of the{" "}
          <strong>Court of Salerno</strong>. Parties agree to attempt mediation
          before litigation.
        </p>

        <h3>Attachments</h3>
        <p>
          <strong>Annex A:</strong> Indemnity Agreement
          <br />
          <strong>Annex B:</strong> Point GTC Identification Plaque & Procedure
          <br />
          <strong>Annex C: </strong> Data Processing Appointment
          <br />
          <strong>Annexes for Each Macro-Area</strong>
        </p>

        <h3>Signatures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">
              Place signed (city)
            </div>
            <Input
              placeholder="Place signed (city)"
              value={placeSigned}
              onChange={(e) => setPlaceSigned(e.target.value)}
              className="w-full"
            />
          </label>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">
              Date signed
            </div>
            <Input
              type="date"
              placeholder="Date signed"
              value={dateSigned}
              onChange={(e) => setDateSigned(e.target.value)}
              className="w-full"
            />
          </label>
        </div>
        <p>
          <strong>Network G.T.C.</strong>
          <br />
          President: ____________________
        </p>
        <p>
          <strong>Point G.T.C.</strong>
          <br />
          Legal Representative: 
        </p>

      

      
        <h3>Signature</h3>
        <div
          className="w-full"
          style={{ aspectRatio: "5 / 1", maxHeight: 240 }}
        >
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
              height: "100%",
              touchAction: "none",
            }}
          />
        </div>
       
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" onClick={clearCanvas}>
            {t("onboarding.clear")}
          </Button>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreeArticles}
              onChange={(e) => setAgreeArticles(e.target.checked)}
            />
            <span className="text-sm">
              I have read and agree to Articles 1–10
            </span>
          </label>
        </div>

        {/* Approval Clause (place + date) placed before submit */}
        <div className="mt-4 p-4 border rounded bg-muted">
          <h4 className="font-semibold">Approval Clause</h4>
          <p className="text-sm">Pursuant to Articles 1341 and 1342 of the Civil Code, the parties expressly approve Articles 1–10.</p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Place</div>
              <Input
                placeholder="Place"
                value={placeSigned}
                onChange={(e) => setPlaceSigned(e.target.value)}
                className="w-full"
              />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Date</div>
              <Input
                type="date"
                placeholder="Date"
                value={dateSigned}
                onChange={(e) => setDateSigned(e.target.value)}
                className="w-full"
              />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <Button
            type="submit"
            className="bg-brand-blue-500 text-white"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Agreement"
            )}
          </Button>
        </div>
      </section>
    </form>
  );
}
