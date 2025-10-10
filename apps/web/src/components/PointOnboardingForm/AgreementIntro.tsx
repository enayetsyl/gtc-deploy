"use client";
import React from "react";
import { useI18n } from "@/providers/i18n-provider";

export default function AgreementIntro() {
  const { t } = useI18n();

  return (
    <div className="agreement-intro my-6 ">
      <h3 className="text-center text-lg font-semibold">
        {t("convention.agreementIntro")}
      </h3>
    </div>
  );
}
