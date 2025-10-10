"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  pointGtcContact?: string;
  onPointGtcContactChange?: (v: string) => void;
};

const AgreementArticlePart4: React.FC<Props> = ({
  pointGtcContact = "",
  onPointGtcContactChange,
}) => {
  const { t } = useI18n();
  return (
    <section className="agreement-articles my-6 space-y-4 text-lg">
      <article>
        <p>{t("convention.articles.art6.body2")}</p>
      </article>

      <article>
        <h4 className="font-semibold">{t("convention.articles.art7.title")}</h4>

        <p className="pt-3">{t("convention.articles.art7.body1")}</p>
      </article>
      <article>
        <h4 className="font-semibold">{t("convention.articles.art8.title")}</h4>
        <p>{t("convention.articles.art8.body1")}</p>
        <p>{t("convention.articles.art8.body2")}</p>
        {/* Network PEC line */}
        <p>{t("convention.articles.art8.body3")}</p>
        {/* Point GTC editable PEC / contact line (inline input matching PDF blank) */}
        <p className="flex items-center gap-3">
          <span className="mr-2">- Point GTC:</span>
          {/* pale-blue underline controlled input similar to other inline fields */}
          <Input
            name="pointGtcContact"
            value={pointGtcContact}
            onChange={(e) => onPointGtcContactChange?.(e.target.value)}
            className={`bg-[#e9f0ff] text-base border-b-2 border-black px-2 py-1 rounded-sm w-80`}
          />
        </p>
        <p>{t("convention.articles.art8.body4")}</p>
        <p>{t("convention.articles.art8.body5")}</p>
      </article>
      <article>
        <h4 className="font-semibold">{t("convention.articles.art9.title")}</h4>
        <p>{t("convention.articles.art9.body1")}</p>
        <p>{t("convention.articles.art9.body2")}</p>
        <p>{t("convention.articles.art9.body3")}</p>
      </article>
    </section>
  );
};

export default AgreementArticlePart4;
