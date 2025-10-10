"use client";
import React from "react";
import { useI18n } from "@/providers/i18n-provider";

export default function AgreementArticles() {
  const { t } = useI18n();

  return (
    <section className="agreement-articles my-6 space-y-4 text-lg">
      <article>
        <h4 className="font-semibold">{t("convention.articles.art0.title")}</h4>
        <p>{t("convention.articles.art0.body")}</p>
      </article>

      <article>
        <h4 className="font-semibold">{t("convention.articles.art1.title")}</h4>
        <p className="leading-relaxed">{t("convention.articles.art1.body")}</p>
        <p className="leading-relaxed pt-5">{t("convention.articles.art1.body2")}</p>
      </article>
    </section>
  );
}
