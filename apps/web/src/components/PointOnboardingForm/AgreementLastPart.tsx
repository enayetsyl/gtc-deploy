"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  // top signature row
  topPlace?: string;
  onTopPlaceChange?: (v: string) => void;
  topDate?: string;
  onTopDateChange?: (v: string) => void;
  // bottom signature row
  bottomPlace?: string;
  onBottomPlaceChange?: (v: string) => void;
  bottomDate?: string;
  onBottomDateChange?: (v: string) => void;
  bottomLegalRepName?: string;
  onBottomLegalRepNameChange?: (v: string) => void;
};

const AgreementLastPart = ({
  topPlace = "",
  onTopPlaceChange = () => {},
  topDate = "",
  onTopDateChange = () => {},

  bottomPlace = "",
  onBottomPlaceChange = () => {},
  bottomDate = "",
  onBottomDateChange = () => {},
  bottomLegalRepName = "",
  onBottomLegalRepNameChange = () => {},
}: Props) => {
  const { t } = useI18n();
  const fieldBg = "bg-[#e9f0ff]";
  const fieldBase = `${fieldBg} text-base border-b-2 border-black px-2 py-1 rounded-sm`;

  return (
    <section className="agreement-articles my-6 space-y-4 text-lg">
      <article>
        <p>{t("convention.articles.art9.body4")}</p>
      </article>

      <article>
        <h4 className="font-semibold">
          {t("convention.articles.art10.title")}
        </h4>
        <p className="pt-3">{t("convention.articles.art10.body1")}</p>
        <p className="pt-3">{t("convention.articles.art10.body2")}</p>
      </article>

      {/* Attachments list (Allegati) that appears in the scanned PDF */}
      <article className="mt-6">
        <h4 className="font-semibold">{t("agreement.attachments.title")}</h4>
        <ul className="list-disc pl-6 mt-2 text-base">
          <li>{t("agreement.attachments.itemA")}</li>
          <li>{t("agreement.attachments.itemB")}</li>
          <li>{t("agreement.attachments.itemC")}</li>
          <li>{t("agreement.attachments.itemD")}</li>
        </ul>
      </article>

      {/* Top signature row */}
      <article className="mt-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col justify-center items-center">
            <div className="flex items-center gap-2">
              <Input
                name="topPlace"
                value={topPlace}
                onChange={(e) => onTopPlaceChange(e.target.value)}
                // placeholder={t("agreement.signature.placePlaceholder")}
                className={`${fieldBase} w-24`}
              />
              <span>Li,</span>
             
              <Input
                name="topDate"
                value={topDate}
                onChange={(e) => onTopDateChange(e.target.value)}
                placeholder={t("agreement.signature.datePlaceholder")}
                className={`${fieldBase} w-40`}
              />
            </div>
            <div className="text-sm text-gray-700 pt-2">
              {t("agreement.signature.presidentLabel1")}
            </div>
            <div className="text-sm text-gray-700 pt-2">
              {t("agreement.signature.presidentLabel2")}
            </div>
          </div>
          <div className="flex-1 text-center"></div>

          <div className="w-64 text-right">
            <div
              className={`${fieldBg} inline-block border-black border-dotted border-b-2 h-6 mt-4 w-48`}
            />
            <div className="text-sm text-gray-700">
              {t("agreement.signature.legalRepresentativeLabel")}
            </div>
          </div>
        </div>
      </article>

      {/* Express approval clause and repeat of signature row */}
      <article className="mt-6">
        <h4 className="font-semibold">
          {t("agreement.expressApproval.title")}
        </h4>
        <p className="pt-3">{t("agreement.expressApproval.text")}</p>
      </article>

      {/* Bottom signature row */}
          <article className="mt-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col justify-center items-center">
            <div className="flex items-center gap-2">
              <Input
                name="topPlace"
                value={topPlace}
                onChange={(e) => onTopPlaceChange(e.target.value)}
                // placeholder={t("agreement.signature.placePlaceholder")}
                className={`${fieldBase} w-24`}
              />
              <span>Li,</span>
             
              <Input
                name="topDate"
                value={topDate}
                onChange={(e) => onTopDateChange(e.target.value)}
                placeholder={t("agreement.signature.datePlaceholder")}
                className={`${fieldBase} w-40`}
              />
            </div>
            <div className="text-sm text-gray-700 pt-2">
              {t("agreement.signature.presidentLabel1")}
            </div>
            <div className="text-sm text-gray-700 pt-2">
              {t("agreement.signature.presidentLabel2")}
            </div>
          </div>
          <div className="flex-1 text-center"></div>

          <div className="w-64 text-right">
            <div
              className={`${fieldBg} inline-block border-black border-dotted border-b-2 h-6 mt-4 w-48`}
            />
            <div className="text-sm text-gray-700">
              {t("agreement.signature.legalRepresentativeLabel")}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
};

export default AgreementLastPart;
