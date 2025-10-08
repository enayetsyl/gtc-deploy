"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCreateConvention,
  useMyConventions,
  downloadDocument,
  useDeleteConvention,
} from "../../hooks/useConventions";
import UploadSigned from "./UploadSigned";
import { useSectorsPublic } from "@/hooks/useSectors";
import { listServices } from "@/lib/admin-api";
import { api } from "@/lib/axios";
import { Button } from "../../components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

export default function PointConventionsPage() {
  const [page] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data, isLoading } = useMyConventions(page, 20);
  const createConvention = useCreateConvention();
  const deleteConvention = useDeleteConvention();
  const { t } = useI18n();
  const sectorsQ = useSectorsPublic();
  const [createOpen, setCreateOpen] = useState(false);

  function displayStatusFor(status: unknown) {
    const s = String(status || "").toUpperCase();
    if (s === "NEW" || s === "UPLOADED" || s === "PENDING") return "PENDING";
    return s;
  }

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
    <div className="p-2 space-y-6 mb-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("nav.myConventions")}</h1>
        <div className="w-full md:w-auto">
          <Button
            className="w-full md:w-auto"
            onClick={() => setCreateOpen(true)}
            disabled={createConvention.isPending}
          >
            {createConvention.isPending
              ? t("ui.creating")
              : t("convention.request")}
          </Button>
        </div>
      </div>

      {createOpen && (
        <CreateConventionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          sectors={sectorsQ.data as Array<{ id: string; name: string }>}
        />
      )}

      <section className="rounded-2xl border">
        {isLoading && <div className="p-4">{t("ui.loading")}</div>}

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
                  {/* <th className="p-3">{t("table.actions")}</th> */}
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((c, idx) => {
                  const displayStatus = displayStatusFor(c.status);

                  return (
                    <tr key={c.id} className="border-t align-top">
                      <td className="p-3 align-top">
                        {(data.page - 1) * data.pageSize + idx + 1}
                      </td>
                      <td className="p-3 align-top">
                        <span className="inline-flex items-center gap-2">
                          <span className="font-medium">
                            {t(`status.${displayStatus.toLowerCase()}`) ||
                              displayStatus}
                          </span>
                          {c.internalSalesRep && (
                            <span className="text-xs text-muted-foreground">
                              / {c.internalSalesRep}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-3 align-top">
                        <div>{c.gtcPoint?.name ?? "—"}</div>
                      </td>
                      <td className="p-3 align-top break-words">
                        {c.sector?.name ?? t("ui.none")}
                      </td>
                      <td className="p-3 align-top break-words">
                        {c.documents?.length ? (
                          <ul className="space-y-1">
                            {c.documents.map((d) => (
                              <li
                                key={d.id}
                                className="flex items-center gap-2"
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDownload(c.id, d.id, d.fileName)
                                  }
                                >
                                  {t("convention.download")}
                                </Button>
                                <span className="text-xs text-muted-foreground truncate max-w-[6rem]">
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
                        <div className="flex items-center gap-2">
                          {displayStatus === "PENDING" && (
                            <UploadSigned conventionId={c.id} />
                          )}

                          {c.status === "NEW" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmingId(c.id)}
                              disabled={
                                deleteConvention.isPending ||
                                deletingId === c.id
                              }
                            >
                              {deletingId === c.id
                                ? t("convention.deleting")
                                : t("convention.delete")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile: stacked card list */}
        {!isLoading && (
          <div className="md:hidden">
            <div className="space-y-3 p-3">
              {data?.items?.map((c, idx) => {
                const displayStatus = ((): string => {
                  const s = String(c.status).toUpperCase();
                  if (s === "NEW" || s === "UPLOADED" || s === "PENDING")
                    return "PENDING";
                  return s;
                })();

                return (
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
                          <div className="font-medium text-sm truncate max-w-[14rem]">
                            {c.gtcPoint?.name ?? t("ui.none")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.sector?.name ?? t("ui.none")}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-medium text-sm">
                          {t(`status.${displayStatus.toLowerCase()}`) ||
                            displayStatus}
                        </div>
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
                      {displayStatus === "PENDING" && (
                        <UploadSigned conventionId={c.id} />
                      )}

                      {c.status === "NEW" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmingId(c.id)}
                          disabled={
                            deleteConvention.isPending || deletingId === c.id
                          }
                        >
                          {deletingId === c.id
                            ? t("convention.deleting")
                            : t("convention.delete")}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Confirmation modal */}
      {confirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmingId(null)}
          />
          <div className="bg-white rounded-lg p-6 z-10 w-[min(90%,32rem)]">
            <h3 className="text-lg font-medium mb-2">
              {t("convention.confirmDeleteTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("convention.confirmDeleteBody")}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmingId(null)}>
                {t("ui.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const id = confirmingId;
                  if (!id) return;
                  setConfirmingId(null);
                  setDeletingId(id);
                  deleteConvention.mutate(id, {
                    onSettled: () => setDeletingId(null),
                  });
                }}
                disabled={deleteConvention.isPending}
              >
                {deleteConvention.isPending
                  ? t("convention.deleting")
                  : t("convention.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateConventionModal({
  open,
  onClose,
  sectors,
}: {
  open: boolean;
  onClose: () => void;
  sectors?: Array<{ id: string; name: string }>;
}) {
  const { t } = useI18n();
  const [selectedSector, setSelectedSector] = useState<string>(
    sectors?.[0]?.id ?? ""
  );
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();
  const createConvention = useCreateConvention();

  const servicesQ = useQuery({
    queryKey: ["admin", "services", selectedSector || "none", "modal"],
    queryFn: () => listServices(selectedSector || undefined),
    enabled: !!selectedSector,
  });

  const services =
    (servicesQ.data as { id: string; name: string }[] | undefined) ?? undefined;

  // fetch my point's services so modal doesn't offer services already enabled
  const myServicesModalQ = useQuery({
    queryKey: ["point", "services", "modal"],
    queryFn: async () => {
      const res = await api.get<{
        items: Array<{ serviceId: string; status: string }>;
      }>(`/api/point/services`);
      return res.data;
    },
    enabled: !!selectedSector,
  });

  const ownedEnabledModalIds = new Set<string>(
    (myServicesModalQ.data?.items || [])
      .filter((it) => it.status === "ENABLED")
      .map((it) => it.serviceId)
  );

  const toggleService = (id: string) =>
    setServiceIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Create only — validate and pass selected sector/services so backend can attach requests
      const isUuid = (s: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          s
        );
      const payload: { sectorId?: string; serviceIds?: string[] } = {};
      if (selectedSector && isUuid(selectedSector))
        payload.sectorId = selectedSector;
      const validServiceIds = serviceIds.filter((id) => isUuid(id));
      if (validServiceIds.length) payload.serviceIds = validServiceIds;

      await createConvention.mutateAsync(payload);

      // refresh queries so UI updates
      qc.invalidateQueries({ queryKey: ["conventions"] });
      qc.invalidateQueries({ queryKey: ["admin-conventions"] });

      onClose();
    } catch (err) {
      console.error("Create convention failed", err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-lg p-6 z-10 w-[min(96%,40rem)]">
        <h3 className="text-lg font-medium mb-2">{t("convention.request")}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* <div>
            <label className="block text-sm mb-1">{t("table.point")}</label>
            <div className="p-2 border rounded">{t("detail.gtcPointName")}</div>
          </div> */}
          <div>
            <label className="block text-sm mb-1">{t("ui.sector")}</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">{t("ui.selectSector")}</option>
              {sectors?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">
              {t("point.services.add")}
            </label>
            {servicesQ.isLoading || myServicesModalQ.isLoading ? (
              <div>{t("ui.loading")}</div>
            ) : services && services.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services
                  .filter((svc) => !ownedEnabledModalIds.has(svc.id))
                  .map((svc) => (
                    <label
                      key={svc.id}
                      className="inline-flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={serviceIds.includes(svc.id)}
                        onChange={() => toggleService(svc.id)}
                      />
                      <span className="truncate">{svc.name}</span>
                    </label>
                  ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t("ui.noServices")}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>
            {t("ui.cancel")}
          </Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting ? t("ui.sending") : t("ui.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
