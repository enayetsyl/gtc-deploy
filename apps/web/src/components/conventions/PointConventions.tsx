"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCreateConvention,
  useMyConventions,
  downloadDocument,
  useDeleteConvention,
} from "../../hooks/useConventions";
import PrefillForm from "./PrefillForm";
import UploadSigned from "./UploadSigned";
import { useSectorsPublic } from "@/hooks/useSectors";
import { listServices } from "@/lib/admin-api";
import { api } from "@/lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../../components/ui/button";
import { useI18n } from "@/providers/i18n-provider";

export default function PointConventionsPage() {
  const [page] = useState(1);
  const [sectorId, setSectorId] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data, isLoading } = useMyConventions(page, 20);
  const createConvention = useCreateConvention();
  const deleteConvention = useDeleteConvention();
  const { t } = useI18n();
  const sectorsQ = useSectorsPublic();
  const servicesQ = useQuery({
    queryKey: ["admin", "services", sectorId || "none"],
    queryFn: () => listServices(sectorId || undefined),
    enabled: !!sectorId,
  });

  const sectorName = (
    sectorsQ.data as Array<{ id: string; name: string }> | undefined
  )?.find((s) => s.id === sectorId)?.name;
  const serviceNames = (selectedServices || [])
    .map(
      (id) =>
        (
          servicesQ.data as Array<{ id: string; name: string }> | undefined
        )?.find((s) => s.id === id)?.name
    )
    .filter(Boolean) as string[];
  const externalLoading = sectorsQ.isLoading || servicesQ.isLoading;
  const [createOpen, setCreateOpen] = useState(false);

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
              : t("convention.create")}
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border p-4 space-y-4">
        <h2 className="font-medium">{t("convention.step1")}</h2>
        {/* Sectors dropdown: fetch public sectors and allow selection */}
        <SectorsDropdown selected={sectorId} onChange={setSectorId} />
        {/* Services multi-select: shows services for selected sector */}
        <ServicesMultiSelect
          sectorId={sectorId}
          value={selectedServices}
          onChange={setSelectedServices}
        />
        <PrefillForm
          sectorName={sectorName}
          serviceNames={serviceNames}
          disabled={externalLoading}
        />
        {createOpen && (
          <CreateConventionModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            sectors={sectorsQ.data as Array<{ id: string; name: string }>}
          />
        )}
      </section>

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
                    {/* <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        {(c.status === "NEW" || c.status === "UPLOADED") && (
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
                    </td> */}
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
                        <div className="font-medium text-sm truncate max-w-[14rem]">
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
              ))}
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

function SectorsDropdown({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (v: string) => void;
}) {
  const sectorsQ = useSectorsPublic();
  const { t } = useI18n();

  const items = (sectorsQ.data || []) as Array<{ id: string; name: string }>;

  return (
    <div>
      <label className="text-sm text-muted-foreground block mb-2">
        {t("point.sectors.title")}
      </label>
      {sectorsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("ui.loading")}</p>
      ) : items.length ? (
        <Select value={selected} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("ui.selectSector")} />
          </SelectTrigger>
          <SelectContent>
            {items.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-sm text-muted-foreground">{t("ui.noSectors")}</p>
      )}
    </div>
  );
}

function ServicesMultiSelect({
  sectorId,
  value,
  onChange,
}: {
  sectorId: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ["admin", "services", sectorId || "none"],
    queryFn: () => listServices(sectorId || undefined),
    enabled: !!sectorId,
  });

  if (!sectorId) return null;

  if (q.isLoading)
    return <p className="text-sm text-muted-foreground">{t("ui.loading")}</p>;

  const items: { id: string; name: string }[] = q.data || [];

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((s) => s !== id));
    else onChange([...value, id]);
  };

  return (
    <div>
      <label className="text-sm text-muted-foreground block mb-2">
        {t("point.services.title")}
      </label>
      {items.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((svc) => (
            <label
              key={svc.id}
              className="inline-flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={value.includes(svc.id)}
                onChange={() => toggle(svc.id)}
                className="rounded border"
              />
              <span className="truncate">{svc.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("ui.noServices")}</p>
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
  const [file, setFile] = useState<File | null>(null);
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

  const toggleService = (id: string) =>
    setServiceIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    try {
      // create convention first
      const conv = await createConvention.mutateAsync();

      // build form data and upload to the convention's upload route
      const fd = new FormData();
      fd.append("file", file);
      if (selectedSector) fd.append("sectorId", selectedSector);
      if (serviceIds.length)
        fd.append("serviceIds", JSON.stringify(serviceIds));

      await api.post(`/api/conventions/${conv.id}/upload`, fd);

      // refresh queries so UI updates
      qc.invalidateQueries({ queryKey: ["conventions"] });
      qc.invalidateQueries({ queryKey: ["admin-conventions"] });

      onClose();
    } catch (err) {
      console.error("Create+upload failed", err);
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
        <h3 className="text-lg font-medium mb-2">{t("convention.create")}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">{t("table.point")}</label>
            <div className="p-2 border rounded">{t("detail.gtcPointName")}</div>
          </div>
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
              {t("point.services.title")}
            </label>
            {servicesQ.isLoading ? (
              <div>{t("ui.loading")}</div>
            ) : services && services.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services.map((svc) => (
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

          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">
              {t("upload.uploadSigned")}
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>
            {t("ui.cancel")}
          </Button>
          <Button disabled={!file || submitting} onClick={handleSubmit}>
            {submitting ? t("upload.uploading") : t("upload.uploadSigned")}
          </Button>
        </div>
      </div>
    </div>
  );
}
