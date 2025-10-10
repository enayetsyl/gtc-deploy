"use client";

import React, { createContext, useContext, useState } from "react";
import en from "@/locales/en.json";
import it from "@/locales/it.json";

type Locale = "en" | "it";
type Translations = Record<string, string>;

const LOCALE_KEY = "gtc_locale";

const map: Record<Locale, Translations> = {
  en,
  it,
};

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const normalizeLocale = (l?: string | null): Locale => {
    if (!l) return "it";
    const code = String(l).slice(0, 2).toLowerCase();
    return code === "it" ? "it" : "en";
  };

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "it";
    const storedRaw = localStorage.getItem(LOCALE_KEY);
    if (storedRaw) return normalizeLocale(storedRaw);
    // Try to infer from browser settings
    const nav =
      typeof navigator !== "undefined" ? navigator.language : undefined;
    return normalizeLocale(nav);
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_KEY, l);
    } catch {
      // ignore
    }
  };

  const t = (
    key: string,
    vars?: Record<string, string | number | undefined>
  ) => {
    // Guard access: if map doesn't contain the current locale (e.g. stored value was 'en-US'),
    // fall back to English translations.
    const translations = map[locale] ?? map["en"];
    const txt = translations[key] ?? map["en"][key] ?? key;
    if (!vars) return txt;
    return Object.keys(vars).reduce((s, k) => {
      const value = vars[k];
      const safe = value === null || value === undefined ? "" : String(value);
      // support both {name} and {{name}} placeholders (optional spaces)
      const re = new RegExp(`\\{\\{?\\s*${k}\\s*\\}?\\}`, "g");
      return s.replace(re, safe);
    }, txt);
  };

  const value: I18nCtx = { locale, setLocale, t };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
