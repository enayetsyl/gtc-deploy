"use client";
import React from "react";
import { useI18n } from "@/providers/i18n-provider";

const AgreementPart2 = () => {
  const { t } = useI18n();

  return (
    <section className="agreement-articles my-6 space-y-4 text-lg">
      <article>
        <h4 className="font-semibold">{t("convention.articles.art2.title")}</h4>
        <p>{t("convention.articles.art2.body1")}</p>
        <p>{t("convention.articles.art2.body2")}</p>
        <p>{t("convention.articles.art2.body3")}</p>
        <p>{t("convention.articles.art2.body4")}</p>
      </article>

      <article>
        <h4 className="font-semibold">{t("convention.articles.art3.title")}</h4>
        <p className="leading-relaxed">{t("convention.articles.art3.body")}</p>
      </article>
      <article>
        <h4 className="font-semibold">{t("convention.articles.art4.title")}</h4>
        <p className="leading-relaxed">{t("convention.articles.art4.body1")}</p>
        <p className="leading-relaxed">{t("convention.articles.art4.body2")}</p>
        <p className="leading-relaxed">{t("convention.articles.art4.body3")}</p>
        <p className="leading-relaxed">{t("convention.articles.art4.body4")}</p>
        <p className="leading-relaxed">{t("convention.articles.art4.body5")}</p>
      </article>
    </section>
  );
};

export default AgreementPart2;
