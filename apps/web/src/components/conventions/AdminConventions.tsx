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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t("admin.conventionsTitle")}
        </h1>
      </div>

      <div className="flex gap-2">
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

      <section className="rounded-2xl border">
        {items.isLoading && <div className="p-4">{t("ui.loading")}</div>}
        {!items.isLoading && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="p-3">{t("table.convention")}</th>
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
                  point={c.gtcPoint?.name ?? "—"}
                  sector={c.sector?.name ?? "—"}
                  status={c.status}
                />
              ))}
            </tbody>
          </table>
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

  return (
    <tr className="border-t">
      <td className="p-3 align-top font-mono text-xs">{id}</td>
      <td className="p-3 align-top">
        {point} <span className="text-muted-foreground">/ {sector}</span>
      </td>
      <td className="p-3 align-top font-medium">{status}</td>
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
              onClick={() =>
                decision.mutate({
                  action: "APPROVE",
                  internalSalesRep: rep || undefined,
                })
              }
            >
              {t("convention.approve")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => decision.mutate({ action: "DECLINE" })}
            >
              {t("convention.decline")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { blob, filename } = await downloadArchive(id);
                downloadBlob(blob, filename);
              }}
              title={t("convention.downloadAll")}
            >
              ZIP
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
