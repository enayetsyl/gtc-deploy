import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Thanks — Onboarding",
  description:
    "Your onboarding request was submitted. Download, sign and upload the pre-filled form; an administrator will review it shortly.",
};

export default function OnboardingThanksPage() {
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
          Thank you — request received
        </h1>
        <p style={{ color: "#444", lineHeight: 1.6 }}>
          We have received your onboarding request for a GTC point. Please
          download the pre-filled convention form, sign it, and re-upload it in
          your dashboard. An administrator will review your submission and
          notify you by email when it is processed.
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
