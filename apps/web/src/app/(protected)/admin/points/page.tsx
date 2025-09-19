"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPoint,
  listPoints,
  listSectors,
  type Point,
} from "@/lib/admin-api";
import { useMemo, useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";

const schema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  sectorId: z.string().min(1),
});

export default function PointsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", sectorId: "" });
  const [err, setErr] = useState<string | null>(null);

  const sectorsQ = useQuery({
    queryKey: ["admin", "sectors"],
    queryFn: () => listSectors(1, 100),
  });
  const pointsQ = useQuery({
    queryKey: ["admin", "points"],
    queryFn: () => listPoints(1, 100),
  });

  const sectorOptions = useMemo(
    () => sectorsQ.data?.items ?? [],
    [sectorsQ.data]
  );

  const createMut = useMutation({
    mutationFn: (payload: { name: string; email: string; sectorId: string }) =>
      createPoint(payload),
    onSuccess: () => {
      setForm({ name: "", email: "", sectorId: "" });
      qc.invalidateQueries({ queryKey: ["admin", "points"] });
    },
    onError: () => setErr("Failed to create point (check sector)"),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {t("admin.points.createTitle")}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            const parsed = schema.safeParse(form);
            if (!parsed.success) {
              return setErr(
                parsed.error.issues[0]?.message ?? "Validation error"
              );
            }
            createMut.mutate(parsed.data);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-1">
            <label className="block text-sm mb-1">{t("form.name")}</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm mb-1">{t("form.email")}</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">{t("ui.sector")}</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={form.sectorId}
              onChange={(e) =>
                setForm((s) => ({ ...s, sectorId: e.target.value }))
              }
              disabled={sectorsQ.isLoading}
            >
              <option value="">{t("ui.selectSector")}</option>
              {sectorOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t("admin.points.sectorHelp")}
            </p>
          </div>

          <div className="sm:col-span-2">
            <button
              className="rounded-md bg-black text-white px-3 py-2"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? t("ui.creating") : t("ui.create")}
            </button>
            {err && <span className="ml-3 text-sm text-red-600">{err}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("admin.points.listTitle")}
        </h2>
        {pointsQ.isLoading ? (
          <p>{t("ui.loading")}</p>
        ) : (
          <div className="divide-y">
            {pointsQ.data?.items.map((p: Point) => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600">{p.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t("admin.points.sectorLabel", {
                      sector: p.sector?.name ?? p.sectorId,
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/points/${p.id}/services`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    title={t("admin.points.manageServicesTitle")}
                  >
                    {t("admin.points.services")}
                  </Link>
                  {/* (optional) overview/edit buttons can go here too */}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
