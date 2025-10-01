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
    <div className="p-2 space-y-6 mb-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("nav.myConventions")}</h1>
        <div className="w-full md:w-auto">
          <Button
            className="w-full md:w-auto"
            onClick={() => createConvention.mutate()}
          >
            {t("convention.create")}
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border p-4 space-y-4">
        <h2 className="font-medium">{t("convention.step1")}</h2>
        <PrefillForm />
      </section>

      <section className="rounded-2xl border">
        {isLoading && <div className="p-4">Loading…</div>}

        {/* Desktop / larger screens: table */}
        {!isLoading && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
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
                  <tr key={c.id} className="border-t align-top">
                    <td className="p-3 align-top">
                      {(data.page - 1) * data.pageSize + idx + 1}
                    </td>
                    <td className="p-3 align-top">
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium">
                          {t(`status.${c.status.toLowerCase()}`) || c.status}
                        </span>
                        {c.internalSalesRep && (
                          <span className="text-xs text-muted-foreground">
                            / {c.internalSalesRep}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-3 align-top">{c.gtcPoint?.name ?? "—"}</td>
                    <td className="p-3 align-top break-words">
                      {c.sector?.name ?? t("ui.none")}
                    </td>
                    <td className="p-3 align-top break-words">
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
                                · {d.mime || t("file.typeUnknown")} ·{" "}
                                {t("file.sizeKb", {
                                  size: (d.size / 1024).toFixed(0),
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("convention.noDocuments")}
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
          </div>
        )}

        {/* Mobile: stacked card list */}
        {!isLoading && (
          <div className="md:hidden">
            <div className="space-y-3 p-3">
              {data?.items?.map((c, idx) => (
                <article
                  key={c.id}
                  className="border rounded-lg p-3 bg-white shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        #{(data.page - 1) * data.pageSize + idx + 1}
                      </div>
                      <div className="mt-1">
                        <div className="font-medium text-sm">
                          {c.gtcPoint?.name ?? t("ui.none")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.sector?.name ?? t("ui.none")}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium text-sm">{c.status}</div>
                      {c.internalSalesRep && (
                        <div className="text-xs text-muted-foreground">
                          {c.internalSalesRep}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-medium mb-1">
                      {t("table.documents")}
                    </div>
                    {c.documents?.length ? (
                      <ul className="space-y-2">
                        {c.documents.map((d) => (
                          <li
                            key={d.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDownload(c.id, d.id, d.fileName)
                                }
                              >
                                {t("convention.download")}
                              </Button>
                              <div className="text-xs text-muted-foreground truncate max-w-[10rem]">
                                {d.fileName}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("file.sizeKb", {
                                size: (d.size / 1024).toFixed(0),
                              })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {t("convention.noDocuments")}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    {(c.status === "NEW" || c.status === "UPLOADED") && (
                      <UploadSigned conventionId={c.id} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
