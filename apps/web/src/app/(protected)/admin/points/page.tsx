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
import { Button } from "@/components/ui/button";

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
    <main className="space-y-6 mb-10">
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
                  <Button variant="default">
                    <Link
                      href={`/admin/points/${p.id}/services`}
                      title={t("admin.points.manageServicesTitle")}
                    >
                      {t("admin.points.services")}
                    </Link>
                  </Button>
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
