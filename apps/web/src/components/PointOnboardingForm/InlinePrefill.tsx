"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  vat: string;
  onVatChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  representative: string;
  onRepresentativeChange: (v: string) => void;
};

// InlinePrefill renders the paragraph with inline inputs styled to resemble
// the scanned PDF: pale-blue input backgrounds and an underline.
export default function InlinePrefill({
  companyName,
  onCompanyNameChange,
  vat,
  onVatChange,
  city,
  onCityChange,
  address,
  onAddressChange,
  representative,
  onRepresentativeChange,
}: Props) {
  const { t } = useI18n();

  const fieldBg = "bg-[#e9f0ff]"; // pale-blue similar to the screenshot
  const fieldBase = `${fieldBg} text-lg border-b-2 border-black px-3 py-1 rounded-md`;

  return (
    <div className="inline-prefill mt-4 leading-relaxed text-lg">
      {/* First row: wide company name and small VAT on the right */}
      <div className="flex items-start gap-4">
        <Input
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder={t("convention.inline.companyPlaceholder")}
          className={`${fieldBase} flex-1 mr-2`}
        />

        <div className="flex items-center gap-2">
          <span className="whitespace-pre">
            {t("convention.inline.cfLabel")}
          </span>
          <Input
            value={vat}
            onChange={(e) => onVatChange(e.target.value)}
            placeholder={t("convention.inline.vatPlaceholder")}
            className={`${fieldBase} w-48`}
          />
          <span className="ml-1">{t("convention.inline.closeParen")}</span>
        </div>
      </div>

      {/* Second row: 'con sede legale in' + city short input + long address line */}
      <div className="mt-3 flex items-center gap-2">
        <span className="mr-2">{t("convention.inline.headquarters")}</span>

        <Input
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder={t("convention.inline.cityPlaceholder")}
          className={`${fieldBase} w-80`}
        />


        <span className="inline-flex items-center gap-2 flex-1">
          <span>(</span>
          <Input
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder={t("convention.inline.addressPlaceholder")}
            className={`${fieldBase} flex-1`}
          />
          <span>)</span>
        </span>
        <span className="whitespace-pre">{t("convention.inline.allaVia")}</span>
      </div>

      {/* Representative line */}
      <div className="mt-3">
        <Input
          value={representative}
          onChange={(e) => onRepresentativeChange(e.target.value)}
          placeholder={t("convention.inline.repPlaceholder")}
          className={`${fieldBase} w-72 inline-block`}
        />
        <span className="ml-2">{t("convention.inline.representedBy")}</span>
        <span className="ml-2">{t("convention.inline.endingPunctuation")}</span>
      </div>

      {/* short name note */}
      <div className="mt-2 italic">{t("convention.inline.shortName")}</div>
    </div>
  );
}
