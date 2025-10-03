"use client";
import { useState } from "react";
import {
  downloadArchive,
  useAdminConventions,
  useAdminDecision,
} from "../../hooks/useConventions";
import type { ConventionStatus } from "../../lib/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { downloadBlob } from "@/lib/axios";
import { useI18n } from "@/providers/i18n-provider";
import Spinner from "@/components/ui/Spinner";

const statusTabs: (ConventionStatus | "ALL")[] = [
  "ALL",
  "NEW",
  "UPLOADED",
  "APPROVED",
  "DECLINED",
];

export default function AdminConventionsPage() {
  const [status, setStatus] = useState<ConventionStatus | undefined>(
    "UPLOADED"
  );
  const items = useAdminConventions(status);

  const { t } = useI18n();

  return (
    <div className="p-2 space-y-6 mb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t("admin.conventionsTitle")}
        </h1>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex items-center gap-2 px-1 pb-3">
          {statusTabs.map((s) => (
            <Button
              key={s}
              variant={s === (status ?? "ALL") ? "default" : "outline"}
              onClick={() =>
                setStatus(s === "ALL" ? undefined : (s as ConventionStatus))
              }
            >
              {t(`status.${s.toLowerCase()}`) || s}
            </Button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border">
        {items.isLoading && (
          <div className="p-4 flex items-center">
            <Spinner className="w-4 h-4 mr-2" />
            <span>{t("ui.loading")}</span>
          </div>
        )}
        {!items.isLoading && (
          <div>
            {/* Desktop/table view */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left">
                    <th className="p-3">{t("table.conventionId")}</th>
                    <th className="p-3">{t("table.pointSector")}</th>
                    <th className="p-3">{t("table.status")}</th>
                    <th className="p-3">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.data?.map((c) => (
                    <AdminRow
                      key={c.id}
                      id={c.id}
                      point={c.gtcPoint?.name ?? t("ui.none")}
                      sector={c.sector?.name ?? t("ui.none")}
                      status={c.status}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/card view */}
            <div className="block md:hidden space-y-3 p-3">
              {items.data?.map((c) => (
                <AdminCard
                  key={c.id}
                  id={c.id}
                  point={c.gtcPoint?.name ?? t("ui.none")}
                  sector={c.sector?.name ?? t("ui.none")}
                  status={c.status}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AdminRow({
  id,
  point,
  sector,
  status,
}: {
  id: string;
  point: string;
  sector: string;
  status: ConventionStatus;
}) {
  const { t } = useI18n();
  const [rep, setRep] = useState("");
  const decision = useAdminDecision(id);

  const canDecide = status === "NEW" || status === "UPLOADED";
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [downloading, setDownloading] = useState(false);

  return (
    <tr className="border-t">
      <td className="p-3 align-top font-mono text-xs">{id}</td>
      <td className="p-3 align-top">
        {point} <span className="text-muted-foreground">/ {sector}</span>
      </td>
      <td className="p-3 align-top font-medium">
        {t(`status.${status.toLowerCase()}`) || status}
      </td>
      <td className="p-3 align-top">
        {canDecide ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("form.internalSalesRep")}
              value={rep}
              onChange={(e) => setRep(e.target.value)}
            />
            <Button
              size="sm"
              onClick={async () => {
                try {
                  setApproving(true);
                  await decision.mutateAsync({
                    action: "APPROVE",
                    internalSalesRep: rep || undefined,
                  });
                } finally {
                  setApproving(false);
                }
              }}
            >
              {/* Always render the Spinner node but hide it when not needed to avoid
                  DOM insertion/removal ordering issues that can surface as
                  "insertBefore" errors in some environments (HMR/dev). */}
              <Spinner
                className={approving ? "w-4 h-4 mr-2" : "w-4 h-4 mr-2 hidden"}
              />
              {t("convention.approve")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  setDeclining(true);
                  await decision.mutateAsync({ action: "DECLINE" });
                } finally {
                  setDeclining(false);
                }
              }}
            >
              <Spinner
                className={declining ? "w-4 h-4 mr-2" : "w-4 h-4 mr-2 hidden"}
              />
              {t("convention.decline")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  setDownloading(true);
                  const { blob, filename } = await downloadArchive(id);
                  downloadBlob(blob, filename);
                } finally {
                  setDownloading(false);
                }
              }}
              title={t("convention.downloadAll")}
            >
              <Spinner
                className={downloading ? "w-4 h-4 mr-2" : "w-4 h-4 mr-2 hidden"}
              />
              {t("convention.downloadZip")}
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function AdminCard({
  id,
  point,
  sector,
  status,
}: {
  id: string;
  point: string;
  sector: string;
  status: ConventionStatus;
}) {
  const { t } = useI18n();
  const [rep, setRep] = useState("");
  const decision = useAdminDecision(id);

  const canDecide = status === "NEW" || status === "UPLOADED";
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-mono text-xs text-muted-foreground break-all">
            {id}
          </div>
          <div className="mt-2">
            <div className="font-medium">{point}</div>
            <div className="text-sm text-muted-foreground">{sector}</div>
          </div>
        </div>
        <div className="ml-2 text-sm font-medium">
          {t(`status.${status.toLowerCase()}`) || status}
        </div>
      </div>

      <div className="mt-3">
        {canDecide ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Input
              placeholder={t("form.internalSalesRep")}
              value={rep}
              onChange={(e) => setRep(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    setApproving(true);
                    await decision.mutateAsync({
                      action: "APPROVE",
                      internalSalesRep: rep || undefined,
                    });
                  } finally {
                    setApproving(false);
                  }
                }}
              >
                <Spinner
                  className={approving ? "w-4 h-4 mr-2" : "w-4 h-4 mr-2 hidden"}
                />
                {t("convention.approve")}
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  try {
                    setDeclining(true);
                    await decision.mutateAsync({ action: "DECLINE" });
                  } finally {
                    setDeclining(false);
                  }
                }}
              >
                <Spinner
                  className={declining ? "w-4 h-4 mr-2" : "w-4 h-4 mr-2 hidden"}
                />
                {t("convention.decline")}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    setDownloading(true);
                    const { blob, filename } = await downloadArchive(id);
                    downloadBlob(blob, filename);
                  } finally {
                    setDownloading(false);
                  }
                }}
                title={t("convention.downloadAll")}
              >
                <Spinner
                  className={
                    downloading ? "w-4 h-4 mr-2" : "w-4 h-4 mr-2 hidden"
                  }
                />
                {t("convention.downloadZip")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">—</div>
        )}
      </div>
    </div>
  );
}
