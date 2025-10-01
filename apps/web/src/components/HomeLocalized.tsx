"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";

export default function HomeLocalized() {
  const { t } = useI18n();
  return (
    <>
      <header className="w-full bg-page-bg border-b border-divider">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt={t("home.logoAlt")}
              width={160}
              height={48}
              className="rounded-sm object-cover"
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-block rounded-md bg-button-primary hover:bg-button-primary-hover text-white px-4 py-2"
            >
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen flex items-center justify-center bg-page-bg p-6">
        <div className="max-w-3xl w-full text-center">
          <h1 className="text-3xl font-semibold text-heading mb-4">
            {t("home.title")}
          </h1>

          <p className="text-body text-sm mb-2">{t("home.welcome")}</p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/lead"
              className="inline-block rounded-md bg-page-bg border border-card-border text-link px-4 py-2 hover:bg-divider"
            >
              {t("home.contact")}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
