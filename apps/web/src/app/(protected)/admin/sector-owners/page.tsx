"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { createSectorOwner, listSectors, type Sector } from "@/lib/admin-api";
import { useI18n } from "@/providers/i18n-provider";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  sectorId: z.string().min(1),
  sendInvite: z.boolean().optional().default(true),
});

export default function AdminSectorOwnersPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sectorsQ = useQuery({
    queryKey: ["admin", "sectors", "options"],
    queryFn: () => listSectors(1, 200),
  });

  const createMut = useMutation({
    mutationFn: () => createSectorOwner({ name, email, sectorId, sendInvite }),
    onSuccess: () => {
      setMsg(t("admin.sectorOwners.created"));
      setErr(null);
      setName("");
      setEmail("");
      setSectorId("");
      setSendInvite(true);
    },
    onError: (e: unknown) => {
      // best-effort error message
      const m = (e as { response?: { data?: { error?: string } } }).response
        ?.data?.error;
      setErr(m ?? t("ui.createFailed"));
      setMsg(null);
    },
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {t("admin.sectorOwners.createTitle")}
        </h2>
        <form
          className="grid gap-3 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            setMsg(null);
            const parsed = schema.safeParse({
              name,
              email,
              sectorId,
              sendInvite,
            });
            if (!parsed.success) {
              setErr(parsed.error.issues[0]?.message ?? "Validation error");
              return;
            }
            createMut.mutate();
          }}
        >
          <label className="text-sm">
            <div className="mb-1">{t("form.name")}</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1">{t("form.email")}</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1">{t("form.sector")}</div>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
            >
              <option value="" disabled>
                {sectorsQ.isLoading ? t("ui.loading") : t("ui.selectSector")}
              </option>
              {sectorsQ.data?.items.map((s: Sector) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
            />
            <span>{t("admin.sectorOwners.sendInvite")}</span>
          </label>
          <div className="flex gap-2">
            <button
              className="rounded-md bg-black text-white px-3 py-2"
              disabled={createMut.isPending}
            >
              {createMut.isPending
                ? t("ui.creating")
                : t("admin.sectorOwners.createTitle")}
            </button>
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
        </form>
      </section>
    </main>
  );
}
