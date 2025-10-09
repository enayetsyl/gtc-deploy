"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  protocolNo: string;
  onProtocolNoChange: (v: string) => void;
  conventionNo: string;
  onConventionNoChange: (v: string) => void;
};

export default function TopLine({
  protocolNo,
  onProtocolNoChange,
  conventionNo,
  onConventionNoChange,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-4 mt-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{t("onboarding.protocolShort")}</span>
        <Input
          value={protocolNo}
          onChange={(e) => onProtocolNoChange(e.target.value)}
          className="w-40"
          placeholder={t("onboarding.protocolShort")}
        />
      </div>

      <div className="ml-3">- {t("onboarding.conventionShort")}</div>

      <div className="flex-1 max-w-sm">
        <Input
          value={conventionNo}
          onChange={(e) => onConventionNoChange(e.target.value)}
          placeholder={t("onboarding.conventionShort")}
        />
      </div>
    </div>
  );
}
