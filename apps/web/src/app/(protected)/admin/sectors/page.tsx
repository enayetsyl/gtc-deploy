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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";

const sectorSchema = z.object({ name: z.string().min(2).max(100) });

export default function SectorsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<null | Sector>(null);
  const [err, setErr] = useState<string | null>(null);
  const [updatePendingId, setUpdatePendingId] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

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
  onMutate: (p: { id: string; name: string }) => setUpdatePendingId(p.id),
    onSettled: () => setUpdatePendingId(null),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSector(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sectors"] }),
    onError: () => setErr("Delete failed (maybe sector has points)"),
    onMutate: (id: string) => setDeletePendingId(id),
    onSettled: () => setDeletePendingId(null),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-heading">
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
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("admin.sectors.examplePlaceholder")}
          />
          <Button
            type="submit"
            disabled={createMut.isPending}
            size="sm"
            className="bg-button-primary text-button-on-primary"
          >
            {createMut.isPending ? (
              <span className="inline-flex items-center">
                <Spinner />
                {t("ui.creating")}
              </span>
            ) : (
              t("ui.create")
            )}
          </Button>
        </form>
        {err && <p className="text-sm text-danger">{err}</p>}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 text-heading">
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
                    <Input
                      className="flex-1"
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value })
                      }
                    />
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setEditing(null)}
                      size="sm"
                    >
                      {t("ui.cancel") ?? "Cancel"}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-button-primary text-button-on-primary"
                    >
                      {updatePendingId === s.id ? (
                        <span className="inline-flex items-center">
                          <Spinner />
                          {t("ui.saving") ?? "Saving..."}
                        </span>
                      ) : (
                        t("ui.save") ?? "Save"
                      )}
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium text-body">{s.name}</div>
                      <div className="text-xs text-muted-text">{s.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(s)}
                        className="text-body border-border"
                      >
                        {t("ui.edit")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMut.mutate(s.id)}
                        disabled={deletePendingId != null}
                      >
                        {deletePendingId === s.id ? (
                          <span className="inline-flex items-center">
                            <Spinner />
                            {t("ui.delete")}
                          </span>
                        ) : (
                          t("ui.delete")
                        )}
                      </Button>
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
