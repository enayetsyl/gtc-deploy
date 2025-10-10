"use client";
import React from "react";
import Header from "./Header";
import TopLine from "./TopLine";
import ConventionSection from "./ConventionSection";
import InlinePrefill from "./InlinePrefill";
import PremiseSection from "./PremiseSection";
import PageCounter from "./PageCounter";
import FoundingMembers from "./FoundingMembers";
import PageHeader from "./PageHeader";
import AgreementIntro from "./AgreementIntro";
import AgreementArticles from "./AgreementArticles";
import NetworkProductsSection from "./NetworkProductsSection";
import AgreementPart2 from "./AgreementPart2";
import AgreementPart3 from "./AgreementPart3";
import AgreementArticlePart4 from "./AgreementArticlePart4";

type Props = {
  protocolNo: string;
  onProtocolNoChange: (v: string) => void;
  conventionNo: string;
  onConventionNoChange: (v: string) => void;
  companyName: string;
  onCompanyNameChange: (v: string) => void;
  vat: string;
  onVatChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  representative: string;
  onRepresentativeChange: (v: string) => void;
  services?: Array<{ id: string; name: string }>;
  selectedServiceIds?: string[];
  onSelectedServiceIdsChange?: (ids: string[]) => void;
  contactSurname?: string;
  onContactSurnameChange?: (v: string) => void;
  contactName?: string;
  onContactNameChange?: (v: string) => void;
  contactRole?: string;
  onContactRoleChange?: (v: string) => void;
  contactPhone?: string;
  onContactPhoneChange?: (v: string) => void;
  pointGtcContact?: string;
  onPointGtcContactChange?: (v: string) => void;
};

// Component: FirstPage
// Renders the Header and the first top-line with two inputs (protocol and convention)
export default function FirstPage({
  protocolNo,
  onProtocolNoChange,
  conventionNo,
  onConventionNoChange,
  companyName,
  onCompanyNameChange,
  vat,
  onVatChange,
  city,
  onCityChange,
  address,
  onAddressChange,
  representative,
  onRepresentativeChange,
  services = [],
  selectedServiceIds = [],
  onSelectedServiceIdsChange,
  contactSurname = "",
  onContactSurnameChange,
  contactName = "",
  onContactNameChange,
  contactRole = "",
  onContactRoleChange,
  contactPhone = "",
  onContactPhoneChange,
  pointGtcContact = "",
  onPointGtcContactChange = () => {},
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

      {/* Convention static section (moved from image attachment) */}
      <ConventionSection />
      <InlinePrefill
        companyName={companyName}
        onCompanyNameChange={onCompanyNameChange}
        vat={vat}
        onVatChange={onVatChange}
        city={city}
        onCityChange={onCityChange}
        address={address}
        onAddressChange={onAddressChange}
        representative={representative}
        onRepresentativeChange={onRepresentativeChange}
      />

      <PremiseSection />
      <PageCounter current={1} total={7} />

      <PageHeader />
      <TopLine
        protocolNo={protocolNo}
        onProtocolNoChange={onProtocolNoChange}
        conventionNo={conventionNo}
        onConventionNoChange={onConventionNoChange}
      />
      <FoundingMembers />
      <AgreementIntro />
      <AgreementArticles />
      <PageCounter current={2} total={7} />
      <PageHeader />
      <TopLine
        protocolNo={protocolNo}
        onProtocolNoChange={onProtocolNoChange}
        conventionNo={conventionNo}
        onConventionNoChange={onConventionNoChange}
      />
      <NetworkProductsSection
        services={services}
        selectedServiceIds={selectedServiceIds}
        onSelectedServiceIdsChange={onSelectedServiceIdsChange}
      />
      <PageCounter current={3} total={7} />
      <PageHeader />
      <TopLine
        protocolNo={protocolNo}
        onProtocolNoChange={onProtocolNoChange}
        conventionNo={conventionNo}
        onConventionNoChange={onConventionNoChange}
      />
      <AgreementPart2 />
      <PageCounter current={4} total={7} />
      <PageHeader />
      <TopLine
        protocolNo={protocolNo}
        onProtocolNoChange={onProtocolNoChange}
        conventionNo={conventionNo}
        onConventionNoChange={onConventionNoChange}
      />
      <AgreementPart3
        contactSurname={contactSurname}
        onContactSurnameChange={onContactSurnameChange!}
        contactName={contactName}
        onContactNameChange={onContactNameChange!}
        contactRole={contactRole}
        onContactRoleChange={onContactRoleChange!}
        contactPhone={contactPhone}
        onContactPhoneChange={onContactPhoneChange!}
      />
      <PageCounter current={5} total={7} />
      <PageHeader />
      <TopLine
        protocolNo={protocolNo}
        onProtocolNoChange={onProtocolNoChange}
        conventionNo={conventionNo}
        onConventionNoChange={onConventionNoChange}
      />
      <AgreementArticlePart4 />
      <AgreementArticlePart4
        pointGtcContact={pointGtcContact}
        onPointGtcContactChange={onPointGtcContactChange}
      />
    </div>
  );
}
