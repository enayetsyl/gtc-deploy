"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createService,
  deleteService,
  listServices,
  updateService,
  type Service,
} from "@/lib/admin-api";
import { useState } from "react";
import { z } from "zod";
import { useI18n } from "@/providers/i18n-provider";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/button";

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(200),
});

export default function ServicesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [togglePendingId, setTogglePendingId] = useState<string | null>(null);
  const [delPendingId, setDelPendingId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin", "services"],
    queryFn: () => listServices(),
  });

  const [form, setForm] = useState({ code: "", name: "" });
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: { code: string; name: string }) =>
      createService(payload),
    onSuccess: () => {
      setForm({ code: "", name: "" });
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
    },
    onError: () => setErr("Failed to create service"),
  });

  const toggleMut = useMutation({
    mutationFn: (svc: Service) =>
      updateService(svc.id, { active: !svc.active }),
    onMutate: (svc: Service) => {
      setTogglePendingId(svc.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
    onSettled: () => setTogglePendingId(null),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
    onMutate: (id: string) => setDelPendingId(id),
    onError: () => setErr("Delete failed (service linked to points)"),
    onSettled: () => setDelPendingId(null),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {t("admin.services.createTitle")}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            const parsed = schema.safeParse(form);
            if (!parsed.success)
              return setErr(
                parsed.error.issues[0]?.message ?? "Validation error"
              );
            createMut.mutate(parsed.data);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm mb-1">
              {t("admin.services.codeLabel")}
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.code}
              onChange={(e) =>
                setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))
              }
              placeholder={t("admin.services.codePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              {t("admin.services.nameLabel")}
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder={t("admin.services.namePlaceholder")}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              disabled={createMut.isPending}
            >
              {createMut.isPending ? (
                <span className="inline-flex items-center">
                  <Spinner className="w-4 h-4 mr-2" />
                  {t("ui.creating")}
                </span>
              ) : (
                t("ui.create")
              )}
            </Button>
            {err && <span className="ml-3 text-sm text-red-600">{err}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">
          {t("admin.services.title")}
        </h2>
        {q.isLoading ? (
          <p>{t("ui.loading")}</p>
        ) : (
          <div className="divide-y">
            {q.data?.map((svc) => (
              <div
                key={svc.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{svc.name}</div>
                  <div className="text-xs text-gray-600">{svc.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-md border px-3 py-1.5"
                    onClick={() => toggleMut.mutate(svc)}
                    disabled={togglePendingId != null}
                  >
                    {togglePendingId === svc.id ? (
                      <span className="inline-flex items-center">
                        <Spinner className="w-4 h-4 mr-2" />
                        {svc.active ? t("ui.disable") : t("ui.enable")}
                      </span>
                    ) : svc.active ? (
                      t("ui.disable")
                    ) : (
                      t("ui.enable")
                    )}
                  </Button>
                  <Button
                  variant='destructive'
                    className="rounded-md border px-3 py-1.5"
                    onClick={() => delMut.mutate(svc.id)}
                    disabled={delPendingId != null}
                  >
                    {delPendingId === svc.id ? (
                      <span className="inline-flex items-center">
                        <Spinner className="w-4 h-4 mr-2" />
                        {t("ui.delete")}
                      </span>
                    ) : (
                      t("ui.delete")
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
