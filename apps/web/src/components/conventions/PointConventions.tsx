"use client";
import { useState } from "react";
import {
  useCreateConvention,
  useMyConventions,
  downloadDocument,
} from "../../hooks/useConventions";
import PrefillForm from "./PrefillForm";
import UploadSigned from "./UploadSigned";
import { Button } from "../../components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

export default function PointConventionsPage() {
  const [page] = useState(1);
  const { data, isLoading } = useMyConventions(page, 20);
  const createConvention = useCreateConvention();
  const { t } = useI18n();

  async function handleDownload(
    conventionId: string,
    docId: string,
    name: string
  ) {
    const blob = await downloadDocument(conventionId, docId);
    const filename = name || `convention-${conventionId}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("nav.myConventions")}</h1>
        <Button onClick={() => createConvention.mutate()}>
          {t("convention.create")}
        </Button>
      </div>

      <section className="rounded-2xl border p-4 space-y-4">
        <h2 className="font-medium">{t("convention.step1")}</h2>
        <PrefillForm />
      </section>

      <section className="rounded-2xl border">
        {isLoading && <div className="p-4">Loading…</div>}
        {!isLoading && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="p-3">#</th>
                <th className="p-3">{t("table.status")}</th>
                <th className="p-3">{t("table.point")}</th>
                <th className="p-3">{t("table.sector")}</th>
                <th className="p-3">{t("table.documents")}</th>
                <th className="p-3">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((c, idx) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 align-top">
                    {(data.page - 1) * data.pageSize + idx + 1}
                  </td>
                  <td className="p-3 align-top">
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium">{c.status}</span>
                      {c.internalSalesRep && (
                        <span className="text-xs text-muted-foreground">
                          / {c.internalSalesRep}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-3 align-top">{c.gtcPoint?.name ?? "—"}</td>
                  <td className="p-3 align-top">{c.sector?.name ?? "—"}</td>
                  <td className="p-3 align-top">
                    {c.documents?.length ? (
                      <ul className="space-y-1">
                        {c.documents.map((d) => (
                          <li key={d.id} className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDownload(c.id, d.id, d.fileName)
                              }
                            >
                              {t("convention.download")}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {d.fileName}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {d.mime || "file"} ·{" "}
                              {(d.size / 1024).toFixed(0)} KB
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">
                        No documents
                      </span>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    {(c.status === "NEW" || c.status === "UPLOADED") && (
                      <UploadSigned conventionId={c.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
