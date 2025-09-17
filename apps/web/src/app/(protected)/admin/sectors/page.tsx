"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSector,
  deleteSector,
  listSectors,
  updateSector,
  type Sector,
} from "@/lib/admin-api";
import { useState } from "react";
import { z } from "zod";
import { useI18n } from "@/providers/i18n-provider";

const sectorSchema = z.object({ name: z.string().min(2).max(100) });

export default function SectorsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<null | Sector>(null);
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "sectors"],
    queryFn: () => listSectors(1, 100),
  });

  const createMut = useMutation({
    mutationFn: (payload: { name: string }) => createSector(payload),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["admin", "sectors"] });
    },
    onError: () => setErr("Failed to create sector"),
  });

  const updateMut = useMutation({
    mutationFn: (p: { id: string; name: string }) =>
      updateSector(p.id, { name: p.name }),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "sectors"] });
    },
    onError: () => setErr("Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSector(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sectors"] }),
    onError: () => setErr("Delete failed (maybe sector has points)"),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {t("admin.sectors.createTitle")}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            const parsed = sectorSchema.safeParse({ name });
            if (!parsed.success)
              return setErr(
                parsed.error.issues[0]?.message ?? "Validation error"
              );
            createMut.mutate(parsed.data);
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder={t("admin.sectors.examplePlaceholder")}
          />
          <button
            className="rounded-md bg-black text-white px-3 py-2"
            disabled={createMut.isPending}
          >
            {createMut.isPending ? t("ui.creating") : t("ui.create")}
          </button>
        </form>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("admin.sectors.title")}
        </h2>
        {q.isLoading ? (
          <p>{t("ui.loading")}</p>
        ) : (
          <div className="divide-y">
            {q.data?.items.map((s) => (
              <div
                key={s.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                {editing?.id === s.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const parsed = sectorSchema.safeParse({
                        name: editing.name,
                      });
                      if (!parsed.success) return;
                      updateMut.mutate({ id: s.id, name: parsed.data.name });
                    }}
                    className="flex-1 flex gap-2"
                  >
                    <input
                      className="rounded-md border px-3 py-2 flex-1"
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value })
                      }
                    />
                    <button
                      className="rounded-md border px-3 py-2"
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                    <button className="rounded-md bg-black text-white px-3 py-2">
                      {updateMut.isPending ? "Saving..." : "Save"}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border px-3 py-1.5"
                        onClick={() => setEditing(s)}
                      >
                        {t("ui.edit")}
                      </button>
                      <button
                        className="rounded-md border px-3 py-1.5"
                        onClick={() => deleteMut.mutate(s.id)}
                        disabled={deleteMut.isPending}
                      >
                        {t("ui.delete")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
