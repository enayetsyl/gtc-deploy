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


  // Setting token
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get(`/api/public/onboarding/points/${token}`);
        if (!mounted) return;
        setPrefill(r.data as OnboardingPrefill);
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
    <FirstPage/>
    </div>
  );
}
