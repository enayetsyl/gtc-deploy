"use client";
import React from "react";
import { useI18n } from "@/providers/i18n-provider";

// ConventionSection now uses i18n keys so the content can be localized via
// apps/web/src/locales/{en,it}.json
export default function ConventionSection() {
  const { t } = useI18n();

  return (
    <section className="convention-section mt-6 px-2">
      <h2 className="text-2xl font-bold mb-4">
        {t("convention.section.title")}
      </h2>

      {/* Localized small heading ("Tra" / "Between") */}
      <div className="text-center font-semibold text-xl mb-4">
        {t("convention.section.between")}
      </div>

      <div className="convention-body text-lg leading-relaxed">
        <p>{t("convention.section.intro")}</p>

        <ul className="list-disc pl-8 mt-3 space-y-2">
          <li>
            <strong>{t("convention.section.list.globalform.title")}</strong>{" "}
            {t("convention.section.list.globalform.body")}
          </li>

          <li>
            <strong>{t("convention.section.list.infotel.title")}</strong>{" "}
            {t("convention.section.list.infotel.body")}
          </li>

          <li>
            <strong>{t("convention.section.list.formasec.title")}</strong>{" "}
            {t("convention.section.list.formasec.body")}
          </li>

          <li>
            <strong>{t("convention.section.list.aisf.title")}</strong>{" "}
            {t("convention.section.list.aisf.body")}
          </li>
        </ul>

        <p className="mt-4 italic">{t("convention.section.note")}</p>
      </div>

      {/* small bottom character present in the original PDF/image */}
      <div className="text-center font-semibold text-xl mb-4">
        {t("convention.section.bottomChar")}
      </div>
    </section>
  );
}
