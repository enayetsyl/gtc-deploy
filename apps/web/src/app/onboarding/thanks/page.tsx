"use client";
import React from "react";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";

export const metadata = {
  title: "Thanks — Onboarding",
  description: "Onboarding request received",
};

export default function OnboardingThanksPage() {
  const { t } = useI18n();
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 760, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          {t("onboarding.thanksTitle")}
        </h1>
        <p style={{ color: "#444", lineHeight: 1.6 }}>
          {t("onboarding.thanksMessagePart1")}{" "}
          {t("onboarding.instructionsPart1")}{" "}
          {t("onboarding.thanksMessagePart2")}
        </p>

        <p style={{ color: "#444", lineHeight: 1.6, marginTop: "1rem" }}>
          If you have any questions, contact your sector owner or email{" "}
          <a href="mailto:support@gtc.example">support@gtc.example</a>.
        </p>

        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/" style={{ color: "#0366d6" }}>
            Return to home
          </Link>
        </div>
      </div>
    </main>
  );
}
