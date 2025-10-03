"use client";

import { useState } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { createSectorOwner, listSectors, type Sector } from "@/lib/admin-api";
import { useI18n } from "@/providers/i18n-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  sectorId: z.string().min(1),
  sendInvite: z.boolean().optional().default(true),
});

export default function CreateSectorOwnerPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [sendInvite, setSendInvite] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      sectorId?: string;
      sectorIds?: string[];
      sendInvite?: boolean;
    }) => createSectorOwner(payload),
    onSuccess: () => {
      const successMsg = t("admin.sectorOwners.created");
      // show toast
      toast.success(successMsg);
      setErr(null);
      setName("");
      setEmail("");
      setSectorId("");
      setSendInvite(true);
      // navigate back to the sector owners list
      router.push("/admin/sector-owners");
    },
    onError: (e: unknown) => {
      const m = (e as { response?: { data?: { error?: string } } }).response
        ?.data?.error;
      setErr(m ?? t("ui.createFailed"));
      setMsg(null);
    },
  });

  // Load sectors server-side? for now reuse listSectors (client call)
  const [sectors, setSectors] = useState<Sector[]>([]);
  // fetch sectors once
  useState(() => {
    (async () => {
      try {
        const r = await listSectors(1, 200);
        setSectors(r.items || []);
      } catch {
        // ignore
      }
    })();
  });

  return (
    <main className="space-y-6 max-w-md mx-auto mb-10">
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
          className="grid gap-3 m-auto"
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
              // Map zod issues to localized messages
              const issue = parsed.error.issues[0];
              const field = issue.path[0] as string | undefined;
              // Default fallback
              let msg = t("form.errors.validation");

              // Use issue.code / validation to map common cases
              type ZodIssueWithDetails = typeof issue & {
                validation?: string;
                minimum?: number;
              };
              const detailed = issue as ZodIssueWithDetails;

              if (field === "name") {
                if (detailed.code === "too_small") {
                  const min = detailed.minimum ?? 2;
                  msg = t("form.errors.name.min", { min });
                }
              } else if (field === "email") {
                if (
                  detailed.code === "invalid_string" &&
                  detailed.validation === "email"
                ) {
                  msg = t("form.errors.email.invalid");
                }
              } else if (field === "sectorId") {
                if (detailed.code === "too_small") {
                  msg = t("form.errors.sector.required");
                }
              }

              setErr(msg);
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
              {sectors.map((s: Sector) => (
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
