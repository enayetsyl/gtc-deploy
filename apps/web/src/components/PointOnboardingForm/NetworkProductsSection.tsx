"use client";
import React from "react";
import { useI18n } from "../../providers/i18n-provider";

type ServiceItem = { id: string; name: string };

type Props = {
  services?: ServiceItem[];
  selectedServiceIds?: string[];
  onSelectedServiceIdsChange?: (ids: string[]) => void;
};

const NetworkProductsSection: React.FC<Props> = ({
  services = [],
  selectedServiceIds = [],
  onSelectedServiceIdsChange,
}) => {
  const { t } = useI18n();

  function toggleService(id: string) {
    const next = selectedServiceIds.includes(id)
      ? selectedServiceIds.filter((s) => s !== id)
      : [...selectedServiceIds, id];
    onSelectedServiceIdsChange?.(next);
  }

  return (
    <div className="mt-4 text-lg">
      <p className="leading-relaxed">{t("convention.articles.art1.body3")}</p>
      <p className="leading-relaxed pt-2">
        {t("convention.articles.art1.body4")}
      </p>

      <div className="ml-5 mt-2 space-y-2">
        {services.length === 0 && (
          <p className="text-sm text-gray-500">
            {t("convention.articles.noServices") || "No services available"}
          </p>
        )}
        {services.map((s) => (
          <label key={s.id} className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              name="services[]"
              value={s.id}
              checked={selectedServiceIds.includes(s.id)}
              onChange={() => toggleService(s.id)}
              className="form-checkbox"
            />
            <span>{s.name}</span>
          </label>
        ))}
      </div>
      <p className="leading-relaxed pt-6">
        {t("convention.articles.art1.body5")}
      </p>
      <p className="leading-relaxed pt-2">
        {t("convention.articles.art1.body6")}
      </p>
    </div>
  );
};

export default NetworkProductsSection;
