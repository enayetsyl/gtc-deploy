"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { useI18n } from "@/providers/i18n-provider";
import FirstPage from "@/components/PointOnboardingForm/FirstPage";

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
  // services returned by prefill (from onboarding GET)
  const [services, setServices] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

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

  // Locale
  const { t } = useI18n();

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
      />
    </div>
  );
}
