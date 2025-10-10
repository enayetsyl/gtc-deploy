"use client";
import React from "react";
import { useI18n } from "@/providers/i18n-provider";

export default function FoundingMembers() {
  const { t } = useI18n();

  return (
    <section className="founding-members mt-6">
      {/* <h4 className="text-lg font-semibold mb-3">
        {t("convention.founders.title")}
      </h4> */}

      <div className="space-y-4 text-lg leading-relaxed">
        <p>
          <strong>{t("convention.founders.infotelName")}</strong>{" "}
          {t("convention.founders.infotelBody")}
        </p>

        <p>
          <strong>{t("convention.founders.formasecName")}</strong>{" "}
          {t("convention.founders.formasecBody")}
        </p>

        {/* connective line from the scanned document */}
        <p className="font-semibold">
          {t("convention.section.andAssociations")}
        </p>

        <p>
          <strong>{t("convention.founders.aisfName")}</strong>{" "}
          {t("convention.founders.aisfBody")}
        </p>

        <p>
          <strong>{t("convention.founders.pointName")}</strong>{" "}
          {t("convention.founders.pointBody")}
        </p>

        <p className="italic">{t("convention.founders.closing")}</p>
      </div>
    </section>
  );
}
