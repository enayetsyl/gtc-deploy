"use client";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  protocolNo: string;
  onProtocolNoChange: (v: string) => void;
  conventionNo: string;
  onConventionNoChange: (v: string) => void;
};

// Module-level cache to persist the most recently entered values across
// multiple TopLine instances. This allows later instances to show the values
// entered in earlier instances when their props are empty.
const TopLineCache: { protocolNo: string; conventionNo: string } = {
  protocolNo: "",
  conventionNo: "",
};

export default function TopLine({
  protocolNo,
  onProtocolNoChange,
  conventionNo,
  onConventionNoChange,
}: Props) {
  const { t } = useI18n();

  // Local state initialised from props or from the module cache. This lets
  // later TopLine instances display previously entered values when their
  // props are empty.
  const [localProtocol, setLocalProtocol] = useState<string>(
    protocolNo || TopLineCache.protocolNo || ""
  );
  const [localConvention, setLocalConvention] = useState<string>(
    conventionNo || TopLineCache.conventionNo || ""
  );

  // Keep local state in sync when parent props change (explicit prop values
  // should override the cache).
  useEffect(() => {
    if (protocolNo && protocolNo !== localProtocol) {
      setLocalProtocol(protocolNo);
      TopLineCache.protocolNo = protocolNo;
    } else if (!protocolNo && TopLineCache.protocolNo && !localProtocol) {
      // If parent prop is empty but cache has a value and local is empty,
      // populate from cache.
      setLocalProtocol(TopLineCache.protocolNo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolNo]);

  useEffect(() => {
    if (conventionNo && conventionNo !== localConvention) {
      setLocalConvention(conventionNo);
      TopLineCache.conventionNo = conventionNo;
    } else if (!conventionNo && TopLineCache.conventionNo && !localConvention) {
      setLocalConvention(TopLineCache.conventionNo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conventionNo]);

  const handleProtocolChange = (v: string) => {
    setLocalProtocol(v);
    TopLineCache.protocolNo = v;
    onProtocolNoChange(v);
  };

  const handleConventionChange = (v: string) => {
    setLocalConvention(v);
    TopLineCache.conventionNo = v;
    onConventionNoChange(v);
  };

  return (
    <div className="flex items-center gap-4 mt-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{t("onboarding.protocolShort")}</span>
        <Input
          value={localProtocol}
          onChange={(e) => handleProtocolChange(e.target.value)}
          className="w-40"
          placeholder={t("onboarding.protocolShort")}
        />
      </div>

      <div className="ml-3">- {t("onboarding.conventionShort")}</div>

      <div className="flex-1 max-w-sm">
        <Input
          value={localConvention}
          onChange={(e) => handleConventionChange(e.target.value)}
          placeholder={t("onboarding.conventionShort")}
        />
      </div>
    </div>
  );
}
