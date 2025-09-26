"use client";

import { useQuery } from "@tanstack/react-query";
import { listMyPoints } from "@/lib/admin-api";
import { useState } from "react";
type PointRow = {
  id: string;
  name: string;
  email: string;
  sectorId: string;
  createdAt: string;
};
import { useI18n } from "@/providers/i18n-provider";
import Pagination from "@/components/ui/pagination";
import {
  getAdminPointServices,
  ServiceLink,
} from "@/lib/clients/servicesClient";
import ServiceStatusBadge from "@/components/services/ServiceStatusBadge";

export default function OwnerPointsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);

  const q = useQuery<
    { items: PointRow[]; total: number; page: number; pageSize: number },
    unknown
  >({
    queryKey: ["me", "points", page, pageSize],
    queryFn: () => listMyPoints(page, pageSize),
  });

  const total = q.data?.total ?? 0;

  return (
    <main className="space-y-6 mb-10">
      <section className="rounded-xl border p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            {t("admin.points.listTitle")}
          </h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-text">
              {t("table.pageSize")}
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border px-2 py-1 bg-page-bg"
            >
              {[5, 10, 20, 50].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {q.isLoading ? (
          <p>{t("ui.loading")}</p>
        ) : (
          <>
            {/* Desktop / md+ table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr>
                    <th className="text-left">{t("table.name")}</th>
                    <th className="text-left">{t("table.email")}</th>
                    <th className="text-left">{t("table.created")}</th>
                    <th className="text-left">Services</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data?.items.map((p: PointRow) => (
                    <>
                      <tr key={p.id} className="border-t">
                        <td className="py-2">{p.name}</td>
                        <td className="py-2">{p.email}</td>
                        <td className="py-2 text-sm text-gray-500">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2">
                          <button
                            className="text-sm underline"
                            onClick={() =>
                              setExpandedPoint((s) =>
                                s === p.id ? null : p.id
                              )
                            }
                          >
                            {expandedPoint === p.id
                              ? t("ui.hide")
                              : t("ui.show")}
                          </button>
                        </td>
                      </tr>

                      {expandedPoint === p.id && (
                        <tr key={`${p.id}-services`} className="bg-card-bg">
                          <td colSpan={4} className="px-4 py-3">
                            <PointServices pointId={p.id} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {q.data?.items.map((p: PointRow) => (
                <div
                  key={`card-${p.id}`}
                  className="border rounded p-3 bg-page-bg"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-text">{p.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        className="text-sm underline"
                        onClick={() =>
                          setExpandedPoint((s) => (s === p.id ? null : p.id))
                        }
                      >
                        {expandedPoint === p.id ? t("ui.hide") : t("ui.show")}
                      </button>
                    </div>
                  </div>

                  {expandedPoint === p.id && (
                    <div className="mt-3">
                      <PointServices pointId={p.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination and summary */}
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-muted-text">
                {t("table.showing")}{" "}
                {Math.min((page - 1) * pageSize + 1, total)} -{" "}
                {Math.min(page * pageSize, total)} {t("table.of")} {total}
              </div>

              <div className="flex items-center justify-center">
                <Pagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function PointServices({ pointId }: { pointId: string }) {
  const { data, isLoading, isError } = useQuery<ServiceLink[]>({
    queryKey: ["admin", "points", pointId, "services"],
    queryFn: () => getAdminPointServices(pointId),
  });

  if (isLoading) return <div className="text-sm">Loading services…</div>;
  if (isError)
    return (
      <div className="text-sm text-destructive">Failed to load services.</div>
    );

  if (!data || data.length === 0)
    return (
      <div className="text-sm text-muted-text">No services configured.</div>
    );

  return (
    <div className="space-y-2">
      {data.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between border rounded px-3 py-2"
        >
          <div>
            <div className="font-medium">{s.service.name}</div>
            <div className="text-sm text-muted-text">{s.service.code}</div>
          </div>
          <div className="flex items-center gap-3">
            <ServiceStatusBadge status={s.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
