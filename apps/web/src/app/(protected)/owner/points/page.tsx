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

export default function OwnerPointsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const q = useQuery<
    { items: PointRow[]; total: number; page: number; pageSize: number },
    unknown
  >({
    queryKey: ["me", "points", page, pageSize],
    queryFn: () => listMyPoints(page, pageSize),
  });

  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6">
        <div className="flex items-center justify-between">
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
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className="text-left">{t("table.name")}</th>
                  <th className="text-left">{t("table.email")}</th>
                  <th className="text-left">{t("table.created")}</th>
                </tr>
              </thead>
              <tbody>
                {q.data?.items.map((p: PointRow) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">{p.email}</td>
                    <td className="py-2 text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-text">
                {t("table.showing")}{" "}
                {Math.min((page - 1) * pageSize + 1, total)} -{" "}
                {Math.min(page * pageSize, total)} {t("table.of")} {total}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded px-3 py-1 bg-page-bg/60 disabled:opacity-50"
                >
                  {t("pagination.prev")}
                </button>
                <span className="text-sm text-muted-text">
                  {t("pagination.page")} {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded px-3 py-1 bg-page-bg/60 disabled:opacity-50"
                >
                  {t("pagination.next")}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
