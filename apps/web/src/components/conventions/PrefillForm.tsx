"use client";
import { useState } from "react";
import { prefillPdf } from "../../hooks/useConventions";
import { useI18n } from "@/providers/i18n-provider";
import { downloadBlob } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { set } from "zod";

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
  const { t } = useI18n();

  async function handlePrefill() {
    try {
      setLoading(true);
      const blob = await prefillPdf({
        applicantName,
        sectorName,
        title: t("convention.title") as string,
        pointName: undefined,
        // pass services as names (backend expects string[] for services)
        ...(serviceNames ? { services: serviceNames } : {}),
      });
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
      </div>
      <Button onClick={handlePrefill} disabled={loading || disabled}>
        {loading ? t("prefill.building") : t("prefill.download")}
      </Button>
    </div>
  );
}
