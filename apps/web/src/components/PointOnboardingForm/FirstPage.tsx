"use client";
import React from "react";
import Header from "./Header";
import TopLine from "./TopLine";

type Props = {
  protocolNo: string;
  onProtocolNoChange: (v: string) => void;
  conventionNo: string;
  onConventionNoChange: (v: string) => void;
};

// Component: FirstPage
// Renders the Header and the first top-line with two inputs (protocol and convention)
export default function FirstPage({
  protocolNo,
  onProtocolNoChange,
  conventionNo,
  onConventionNoChange,
}: Props) {
  // top-line uses its own i18n hook
  return (
    <div
      style={{
        maxWidth: "210mm",
        width: "100%",
        margin: "0 auto",
        padding: "0.5rem",
      }}
      className="first-page"
    >
      <Header />

      {/* Top-line: Protocol No. - Convenzionato N° */}
      <TopLine
        protocolNo={protocolNo}
        onProtocolNoChange={onProtocolNoChange}
        conventionNo={conventionNo}
        onConventionNoChange={onConventionNoChange}
      />
    </div>
  );
}
