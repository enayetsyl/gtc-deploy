"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { createSectorOwner, listSectors, type Sector } from "@/lib/admin-api";
import { useI18n } from "@/providers/i18n-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [sendInvite, setSendInvite] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sectorsQ = useQuery({
    queryKey: ["admin", "sectors", "options"],
    queryFn: () => listSectors(1, 200),
  });

  const createMut = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      sectorId?: string;
      sectorIds?: string[];
      sendInvite?: boolean;
    }) => createSectorOwner(payload),
    onSuccess: () => {
      setMsg(t("admin.sectorOwners.created"));
      setErr(null);
      setName("");
      setEmail("");
      setSectorId("");
      setSendInvite(true);
    },
    onError: (e: unknown) => {
      const m = (e as { response?: { data?: { error?: string } } }).response
        ?.data?.error;
      setErr(m ?? t("ui.createFailed"));
      setMsg(null);
    },
  });

  return (
    <main className="space-y-6">
      <section
        className="rounded-xl border bg-card p-6 space-y-4"
        aria-labelledby="create-sector-owner"
      >
        <h2
          id="create-sector-owner"
          className="text-lg font-semibold text-heading"
        >
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
              sectorIds,
              sendInvite,
            });
            if (!parsed.success) {
              setErr(parsed.error.issues[0]?.message ?? "Validation error");
              return;
            }
            const payload: {
              name: string;
              email: string;
              sectorId?: string;
              sectorIds?: string[];
              sendInvite?: boolean;
            } = {
              name,
              email,
              sendInvite,
            };
            if (sectorIds && sectorIds.length) payload.sectorIds = sectorIds;
            else if (sectorId) payload.sectorId = sectorId;
            createMut.mutate(payload);
          }}
        >
          <label className="text-sm">
            <div className="mb-1 text-muted-text">{t("form.name")}</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-muted-text">{t("form.email")}</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-muted-text">{t("form.sector")}</div>
            <div className="space-y-2 max-h-56 overflow-auto rounded-md border p-2">
              {sectorsQ.isLoading && (
                <div className="text-sm text-muted-text">{t("ui.loading")}</div>
              )}
              {sectorsQ.data?.items.map((s: Sector) => (
                <label key={s.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sectorIds.includes(s.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSectorIds((prev) => {
                        const next = checked
                          ? [...prev, s.id]
                          : prev.filter((id) => id !== s.id);
                        // keep primary sectorId in sync with the first selected
                        setSectorId(next[0] ?? "");
                        return next;
                      });
                    }}
                  />
                  <span className="text-body">{s.name}</span>
                </label>
              ))}
            </div>
          </label>

          <label className="text-sm inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
            />
            <span className="text-body">
              {t("admin.sectorOwners.sendInvite")}
            </span>
          </label>

          <div className="flex gap-2">
            <Button
              className="bg-button-primary text-button-on-primary"
              type="submit"
              disabled={createMut.isPending}
            >
              {createMut.isPending
                ? t("ui.creating")
                : t("admin.sectorOwners.createTitle")}
            </Button>
          </div>

          {msg && <p className="text-sm text-[var(--color-teal-500)]">{msg}</p>}
          {err && <p className="text-sm text-danger">{err}</p>}
        </form>
      </section>
    </main>
  );
}
