"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useI18n } from "@/providers/i18n-provider";
import FirstPage from "@/components/PointOnboardingForm/FirstPage";
import { submitPublicOnboarding } from "@/lib/admin-api";
import { toast } from "sonner";

type OnboardingPrefill = {
  name?: string | null;
  email?: string | null;
};

export default function OnboardingFormClient({ token }: { token: string }) {
  // States for loading, errors, and token data
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState<OnboardingPrefill | null | undefined>(
    undefined
  );
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Top-line form states (kept here and passed to FirstPage)
  const [protocolNo, setProtocolNo] = useState("");
  const [conventionNo, setConventionNo] = useState("");

  // Inline prefill states (company, vat, city, address, representative)
  const [companyName, setCompanyName] = useState("");
  const [vat, setVat] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [representative, setRepresentative] = useState("");
  // contact fields for agreement part 3
  const [contactSurname, setContactSurname] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  // Point GTC contact/PEC line (Art.8)
  const [pointGtcContact, setPointGtcContact] = useState("");
  // Top signature row
  const [topPlace, setTopPlace] = useState("");
  const [topDate, setTopDate] = useState("");
  // top signatures as dataURLs
  const [topPresidentSignature, setTopPresidentSignature] = useState<
    string | null
  >(null);
  const [topLegalSignature, setTopLegalSignature] = useState<string | null>(
    null
  );
  // Bottom (express approval) signature row
  const [bottomPlace, setBottomPlace] = useState("");
  const [bottomDate, setBottomDate] = useState("");
  const [bottomLegalRepName, setBottomLegalRepName] = useState("");
  // services returned by prefill (from onboarding GET)
  const [services, setServices] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [agreedToArticles, setAgreedToArticles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Setting token
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get(`/api/public/onboarding/points/${token}`);
        if (!mounted) return;
        // typed response may include services array
        const data = r.data as OnboardingPrefill & {
          services?: Array<{ id: string; name: string }>;
        };
        setPrefill(data);
        if (Array.isArray(data.services)) {
          setServices(data.services);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setPrefill(null);
        setLoadingError(String(err) ?? "Failed to load");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Auto-fill bottom fields from top values to reduce duplicate entry.
  // When user fills the top place/date/name, we copy them to bottom if bottom is empty.
  useEffect(() => {
    if (topPlace && !bottomPlace) setBottomPlace(topPlace);
    if (topDate && !bottomDate) setBottomDate(topDate);
    // If bottomLegalRepName is empty and representative exists, use representative as a convenience
    if (!bottomLegalRepName && representative)
      setBottomLegalRepName(representative);
  }, [
    topPlace,
    topDate,
    representative,
    bottomPlace,
    bottomDate,
    bottomLegalRepName,
  ]);

  // Locale
  const { t } = useI18n();
  const router = useRouter();

  // Loading and No prefill UI
  if (loading) return <div className="p-6">{t("ui.loading")}</div>;
  if (!prefill)
    return (
      <div className="p-6">
        {t("onboarding.invalidLink")}
        {loadingError ? ` - ${loadingError}` : ""}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto">
      <FirstPage
        protocolNo={protocolNo}
        onProtocolNoChange={(v: string) => setProtocolNo(v)}
        conventionNo={conventionNo}
        onConventionNoChange={(v: string) => setConventionNo(v)}
        companyName={companyName}
        onCompanyNameChange={(v: string) => setCompanyName(v)}
        vat={vat}
        onVatChange={(v: string) => setVat(v)}
        city={city}
        onCityChange={(v: string) => setCity(v)}
        address={address}
        onAddressChange={(v: string) => setAddress(v)}
        representative={representative}
        onRepresentativeChange={(v: string) => setRepresentative(v)}
        services={services}
        selectedServiceIds={selectedServiceIds}
        onSelectedServiceIdsChange={(ids: string[]) =>
          setSelectedServiceIds(ids)
        }
        contactSurname={contactSurname}
        onContactSurnameChange={(v: string) => setContactSurname(v)}
        contactName={contactName}
        onContactNameChange={(v: string) => setContactName(v)}
        contactRole={contactRole}
        onContactRoleChange={(v: string) => setContactRole(v)}
        contactPhone={contactPhone}
        onContactPhoneChange={(v: string) => setContactPhone(v)}
        pointGtcContact={pointGtcContact}
        onPointGtcContactChange={(v: string) => setPointGtcContact(v)}
        topPlace={topPlace}
        onTopPlaceChange={(v: string) => setTopPlace(v)}
        topDate={topDate}
        onTopDateChange={(v: string) => setTopDate(v)}
        bottomPlace={bottomPlace}
        onBottomPlaceChange={(v: string) => setBottomPlace(v)}
        bottomDate={bottomDate}
        onBottomDateChange={(v: string) => setBottomDate(v)}
        bottomLegalRepName={bottomLegalRepName}
        onBottomLegalRepNameChange={(v: string) => setBottomLegalRepName(v)}
        topPresidentSignature={topPresidentSignature}
        onTopPresidentSignatureChange={(d) => setTopPresidentSignature(d)}
        topLegalSignature={topLegalSignature}
        onTopLegalSignatureChange={(d) => setTopLegalSignature(d)}
      />
      <div className="p-6">
        {submitError ? (
          <div className="text-red-600 mb-2">{submitError}</div>
        ) : null}
        {submitSuccess ? (
          <div className="text-green-700 mb-2">
            {t("onboarding.thanksTitle")}
          </div>
        ) : null}

        <button
          onClick={async () => {
            // delegate to centralized handler
            await handleSubmit();
          }}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {submitting ? t("onboarding.submitting") : t("onboarding.submit")}
        </button>
      </div>
    </div>
  );

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitSuccess(false);

    // validate required fields
    const requiredChecks: Array<{ ok: boolean; key: string; message: string }> =
      [
        {
          ok: !!protocolNo.trim(),
          key: "protocolNo",
          message: t("form.errors.required"),
        },
        {
          ok: !!conventionNo.trim(),
          key: "conventionNo",
          message: t("form.errors.required"),
        },
        {
          ok: !!companyName.trim(),
          key: "companyName",
          message: t("form.errors.required"),
        },
        { ok: !!vat.trim(), key: "vat", message: t("form.errors.required") },
        { ok: !!city.trim(), key: "city", message: t("form.errors.required") },
        {
          ok: !!address.trim(),
          key: "address",
          message: t("form.errors.required"),
        },
        {
          ok: !!representative.trim(),
          key: "representative",
          message: t("form.errors.required"),
        },
        {
          ok: !!contactSurname.trim(),
          key: "contactSurname",
          message: t("form.errors.required"),
        },
        {
          ok: !!contactName.trim(),
          key: "contactName",
          message: t("form.errors.required"),
        },
        {
          ok: !!contactRole.trim(),
          key: "contactRole",
          message: t("form.errors.required"),
        },
        {
          ok: !!contactPhone.trim(),
          key: "contactPhone",
          message: t("form.errors.required"),
        },
        {
          ok: !!pointGtcContact.trim(),
          key: "pointGtcContact",
          message: t("form.errors.required"),
        },
        {
          ok: !!topPlace.trim(),
          key: "topPlace",
          message: t("form.errors.required"),
        },
        {
          ok: !!topDate.trim(),
          key: "topDate",
          message: t("form.errors.required"),
        },
        // bottom fields are auto-filled from top; they are not required separately
        {
          ok: selectedServiceIds.length > 0,
          key: "services",
          message: t("onboarding.mustSelectService"),
        },
        // agreement acceptance and president signature are intentionally not required
        {
          ok: !!topLegalSignature,
          key: "topLegalSignature",
          message: t("onboarding.mustSignLegal"),
        },
      ];

    const failed = requiredChecks.filter((c) => !c.ok);
    if (failed.length) {
      // translate missing keys into readable field labels
      const missingLabels = failed.map((f) => {
        const key = `onboarding.fields.${f.key}`;
        const translated = t(key);
        // if translation missing, fallback to the raw key
        return translated === key ? f.key : translated;
      });

      const message = t("onboarding.validationFailed", {
        fields: missingLabels.join(", "),
      });
      // show toast with readable message and set inline error
      toast.error(message);
      setSubmitError(message);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("protocolNo", protocolNo || "");
      formData.append("conventionNo", conventionNo || "");
      formData.append("companyName", companyName || "");
      formData.append("taxCodeOrVat", vat || "");
      formData.append("registeredCity", city || "");
      formData.append("registeredProvince", "");
      formData.append("registeredAddress", address || "");
      formData.append("legalRepresentative", representative || "");
      formData.append("contactSurname", contactSurname || "");
      formData.append("contactName", contactName || "");
      formData.append("contactRole", contactRole || "");
      formData.append("contactPhone", contactPhone || "");
      if (prefill?.email) {
        formData.append("pointEmail", prefill.email);
        formData.append("contactEmail", prefill.email);
      }
      formData.append("pointGtcContact", pointGtcContact || "");
      formData.append("topPlace", topPlace || "");
      formData.append("topDate", topDate || "");

      // append signatures as blobs if provided
      if (topPresidentSignature) {
        const res = await fetch(topPresidentSignature);
        const blob = await res.blob();
        formData.append("topPresidentSignature", blob, "top-president.png");
      }
      if (topLegalSignature) {
        const res2 = await fetch(topLegalSignature);
        const blob2 = await res2.blob();
        formData.append("topLegalSignature", blob2, "top-legal.png");
      }

      formData.append("bottomPlace", bottomPlace || "");
      formData.append("bottomDate", bottomDate || "");
      formData.append("bottomLegalRepName", bottomLegalRepName || "");
      if (selectedServiceIds && selectedServiceIds.length) {
        selectedServiceIds.forEach((id) => formData.append("services[]", id));
      }
      formData.append("agreedToArticles", "on");
      // Debug: enumerate FormData entries so DevTools shows actual fields and file/blob info
      for (const [k, v] of formData.entries()) {
        // FormDataEntryValue is string | File (File is subclass of Blob)
        if (v instanceof Blob) {
          console.log(
            "[FormData]",
            k,
            "<Blob>",
            "size=" + v.size,
            "type=" + v.type
          );
        } else {
          console.log("[FormData]", k, v);
        }
      }
      // Also log an array snapshot for quick inspection
      console.log("[FormData entries array]", Array.from(formData.entries()));
      await submitPublicOnboarding(token, formData);
      setSubmitSuccess(true);
      toast.success(t("onboarding.submitSuccess"));
      // Redirect to a thank-you page for this onboarding token after a short delay
      setTimeout(() => router.push(`/onboarding/thanks`), 200);
    } catch (err: unknown) {
      let msg = t("onboarding.submitFailed");
      if (typeof err === "string") msg = err;
      else if (err instanceof Error) msg = err.message;
      else msg = String(err);
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }
}
