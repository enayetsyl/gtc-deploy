"use client";
import React from "react";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  current: number;
  total: number;
};

export default function PageCounter({ current, total }: Props) {
  const { t } = useI18n();
  return (
    <div className="text-center mt-6 mb-2 text-base">
      {t("convention.pageCounter", { current, total })}
    </div>
  );
}
