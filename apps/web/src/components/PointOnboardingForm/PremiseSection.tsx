"use client";
import React from "react";
import { useI18n } from "@/providers/i18n-provider";

export default function PremiseSection() {
  const { t } = useI18n();

  return (
    <section className="premise-section my-6" aria-labelledby="premise-title">
      <h3 id="premise-title" className="text-xl font-bold mb-3">
        {t("convention.premise.title")}
      </h3>

      <p className="text-lg leading-relaxed">
        {t("convention.premise.paragraph1")}
      </p>

      <p className="text-lg leading-relaxed mt-4">
        {t("convention.premise.paragraph2")}
      </p>
    </section>
  );
}
