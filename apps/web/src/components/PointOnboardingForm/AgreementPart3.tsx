"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  contactSurname: string;
  onContactSurnameChange: (v: string) => void;
  contactName: string;
  onContactNameChange: (v: string) => void;
  contactRole: string;
  onContactRoleChange: (v: string) => void;
  contactPhone: string;
  onContactPhoneChange: (v: string) => void;
};

const AgreementPart3: React.FC<Props> = ({
  contactSurname,
  onContactSurnameChange,
  contactName,
  onContactNameChange,
  contactRole,
  onContactRoleChange,
  contactPhone,
  onContactPhoneChange,
}) => {
  const { t } = useI18n();

  const fieldBg = "bg-[#e9f0ff]";
  const fieldBase = `${fieldBg} text-base border-b-2 border-black px-2 py-1 rounded-sm`;

  return (
    <section className="agreement-articles my-6 space-y-4 text-lg">
      <article>
        <p>{t("convention.articles.art4.body6")}</p>
        <p className="pt-3">{t("convention.articles.art4.body7")}</p>
      </article>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="flex gap-2 items-baseline">
          <label className=" text-sm text-gray-700">
            {t("agreement.contact.surname") || "Cognome"}
          </label>
          <Input
            value={contactSurname}
            onChange={(e) => onContactSurnameChange(e.target.value)}
            className={`${fieldBase} w-full`}
          />
        </div>

        <div className="flex gap-2 items-baseline">
          <label className=" text-sm text-gray-700">
            {t("agreement.contact.name") || "Nome"}
          </label>
          <Input
            value={contactName}
            onChange={(e) => onContactNameChange(e.target.value)}
            className={`${fieldBase} w-full`}
          />
        </div>

        <div className="flex gap-2 items-baseline">
          <label className=" text-sm text-gray-700">
            {t("agreement.contact.role") || "Mansione"}
          </label>
          <Input
            value={contactRole}
            onChange={(e) => onContactRoleChange(e.target.value)}
            className={`${fieldBase} w-full`}
          />
        </div>

        <div className="flex gap-2 items-baseline">
          <label className=" text-sm text-gray-700">
            {t("agreement.contact.phoneOrEmail") || "Recapito telefonico/email"}
          </label>
          <Input
            value={contactPhone}
            onChange={(e) => onContactPhoneChange(e.target.value)}
            className={`${fieldBase} w-full`}
          />
        </div>
      </div>
    </section>
  );
};

export default AgreementPart3;
