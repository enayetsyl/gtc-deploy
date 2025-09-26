"use client";

import { useI18n } from "@/providers/i18n-provider";

export default function MobileLangSwitch() {
  const { locale, setLocale } = useI18n();

  const toggle = () => setLocale(locale === "en" ? "it" : "en");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className="h-8 w-8 rounded-md bg-white/10 text-white flex items-center justify-center text-xs font-medium"
    >
      {locale.toUpperCase()}
    </button>
  );
}
