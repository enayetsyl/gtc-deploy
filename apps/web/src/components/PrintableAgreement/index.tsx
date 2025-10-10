"use client";
import React, { forwardRef } from "react";
import FirstPage from "@/components/PointOnboardingForm/FirstPage";
import styles from "./printable.module.css";

export type PrintableAgreementData = {
  protocolNo?: string;
  conventionNo?: string;
  companyName?: string;
  vat?: string;
  city?: string;
  address?: string;
  representative?: string;
  contactSurname?: string;
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  pointGtcContact?: string;
  topPlace?: string;
  topDate?: string;
  topPresidentSignature?: string | null;
  topLegalSignature?: string | null;
  bottomPlace?: string;
  bottomDate?: string;
  bottomLegalRepName?: string;
  services?: Array<{ id: string; name: string }>;
  selectedServiceIds?: string[];
};

// PrintableAgreement renders the full agreement using existing subcomponents but in a read-only mode.
// It forwards a ref to the container so parent can capture it for printing/PDF.
const PrintableAgreement = forwardRef<
  HTMLDivElement,
  { data: PrintableAgreementData }
>(({ data }, ref) => {
  return (
    <div ref={ref} className={styles.printContainer}>
      <FirstPage
        protocolNo={data.protocolNo ?? ""}
        onProtocolNoChange={() => {}}
        conventionNo={data.conventionNo ?? ""}
        onConventionNoChange={() => {}}
        companyName={data.companyName ?? ""}
        onCompanyNameChange={() => {}}
        vat={data.vat ?? ""}
        onVatChange={() => {}}
        city={data.city ?? ""}
        onCityChange={() => {}}
        address={data.address ?? ""}
        onAddressChange={() => {}}
        representative={data.representative ?? ""}
        onRepresentativeChange={() => {}}
        services={data.services}
        selectedServiceIds={data.selectedServiceIds}
        onSelectedServiceIdsChange={() => {}}
        contactSurname={data.contactSurname ?? ""}
        onContactSurnameChange={() => {}}
        contactName={data.contactName ?? ""}
        onContactNameChange={() => {}}
        contactRole={data.contactRole ?? ""}
        onContactRoleChange={() => {}}
        contactPhone={data.contactPhone ?? ""}
        onContactPhoneChange={() => {}}
        pointGtcContact={data.pointGtcContact ?? ""}
        onPointGtcContactChange={() => {}}
        topPlace={data.topPlace ?? ""}
        onTopPlaceChange={() => {}}
        topDate={data.topDate ?? ""}
        onTopDateChange={() => {}}
        bottomPlace={data.bottomPlace ?? ""}
        onBottomPlaceChange={() => {}}
        bottomDate={data.bottomDate ?? ""}
        onBottomDateChange={() => {}}
        bottomLegalRepName={data.bottomLegalRepName ?? ""}
        onBottomLegalRepNameChange={() => {}}
        topPresidentSignature={data.topPresidentSignature ?? null}
        onTopPresidentSignatureChange={() => {}}
        topLegalSignature={data.topLegalSignature ?? null}
        onTopLegalSignatureChange={() => {}}
      />
    </div>
  );
});
PrintableAgreement.displayName = "PrintableAgreement";
export default PrintableAgreement;
