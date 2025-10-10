"use client";
import React from "react";
import { useI18n } from "../../providers/i18n-provider";

const NetworkProductsSection: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="mt-4 text-lg">
      <p className="leading-relaxed">{t("convention.articles.art1.body3")}</p>
      <p className="leading-relaxed pt-2">
        {t("convention.articles.art1.body4")}
      </p>
    </div>
  );
};

export default NetworkProductsSection;
