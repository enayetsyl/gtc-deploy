"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
// import { z } from "zod";
import {
  // createSectorOwner,
  listSectors,
  listSectorOwners,
  updateSectorOwner,
  type Sector,
  type SectorOwner,
} from "@/lib/admin-api";
import { useI18n } from "@/providers/i18n-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// const schema = z.object({
//   name: z.string().min(2).max(120),
//   email: z.string().email(),
//   sectorId: z.string().min(1),
//   sendInvite: z.boolean().optional().default(true),
// });

export default function AdminSectorOwnersPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  // const [name, setName] = useState("");
  // const [email, setEmail] = useState("");
  // const [sectorId, setSectorId] = useState("");
  // const [sectorIds, setSectorIds] = useState<string[]>([]);
  // const [sendInvite, setSendInvite] = useState(true);
  // const [msg, setMsg] = useState<string | null>(null);
  // const [err, setErr] = useState<string | null>(null);

  const sectorsQ = useQuery({
    queryKey: ["admin", "sectors", "options"],
    queryFn: () => listSectors(1, 200),
  });

  const ownersQ = useQuery({
    queryKey: ["admin", "sector-owners", 1],
    queryFn: () => listSectorOwners(1, 200),
  });

  // Editing state
  const [editing, setEditing] = useState<SectorOwner | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSectorIds, setEditSectorIds] = useState<string[]>([]);
  const [editErr, setEditErr] = useState<string | null>(null);
  const editMut = useMutation({
    mutationFn: (payload: {
      id: string;
      name?: string;
      email?: string;
      sectorIds?: string[];
    }) =>
      updateSectorOwner(payload.id, {
        name: payload.name,
        email: payload.email,
        sectorIds: payload.sectorIds,
      }),
    onSuccess: () => {
      setEditErr(null);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "sector-owners", 1] });
    },
    onError: (e: unknown) => {
      const m = (e as { response?: { data?: { error?: string } } }).response
        ?.data?.error;
      setEditErr(m ?? t("ui.createFailed"));
    },
  });

  // const createMut = useMutation({
  //   mutationFn: (payload: {
  //     name: string;
  //     email: string;
  //     sectorId?: string;
  //     sectorIds?: string[];
  //     sendInvite?: boolean;
  //   }) => createSectorOwner(payload),
  //   onSuccess: () => {
  //     setMsg(t("admin.sectorOwners.created"));
  //     setErr(null);
  //     setName("");
  //     setEmail("");
  //     setSectorId("");
  //     setSendInvite(true);
  //   },
  //   onError: (e: unknown) => {
  //     const m = (e as { response?: { data?: { error?: string } } }).response
  //       ?.data?.error;
  //     setErr(m ?? t("ui.createFailed"));
  //     setMsg(null);
  //   },
  // });

  return (
    <main className="space-y-6 mb-10">
      <section className="rounded-xl " aria-labelledby="create-sector-owner">
        <div className="flex items-center justify-end">
          <div>
            <a href="/admin/sector-owners/create">
              <Button className="bg-button-primary text-button-on-primary">
                {t("admin.sectorOwners.createTitle")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section
        className="rounded-xl border bg-card p-6 space-y-4"
        aria-labelledby="list-sector-owners"
      >
        <h2
          id="list-sector-owners"
          className="text-lg font-semibold text-heading"
        >
          {t("nav.sectorOwners")}
        </h2>
        {ownersQ.isLoading && (
          <div className="text-sm text-muted-text">{t("ui.loading")}</div>
        )}
        {ownersQ.data && (
          <>
            {/* Desktop/tablet: show table on md+ */}
            <div className="hidden md:block">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-divider">
                    <th className="py-2 pr-3">{t("table.name")}</th>
                    <th className="py-2 pr-3">{t("table.email")}</th>
                    <th className="py-2 pr-3">{t("table.sector")}</th>
                    <th className="py-2 pr-3">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ownersQ.data.items.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b last:border-0 border-divider"
                    >
                      <td className="py-2 pr-3 align-top">{o.name}</td>
                      <td className="py-2 pr-3 align-top">{o.email}</td>
                      <td className="py-2 pr-3 align-top">
                        {o.sectors && o.sectors.length ? (
                          o.sectors.map((s) => s.name).join(", ")
                        ) : (
                          <span className="text-muted-text">
                            {t("ui.none")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(o);
                            setEditName(o.name);
                            setEditEmail(o.email);
                            setEditSectorIds(o.sectors.map((s) => s.id));
                            setEditErr(null);
                          }}
                        >
                          {t("ui.edit")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="block md:hidden space-y-3">
              {ownersQ.data.items.map((o) => (
                <div
                  key={o.id}
                  className="border rounded-lg p-3 bg-card flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-body truncate">
                        {o.name}
                      </div>
                      <div className="text-sm text-muted-text truncate">
                        {o.email}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(o);
                          setEditName(o.name);
                          setEditEmail(o.email);
                          setEditSectorIds(o.sectors.map((s) => s.id));
                          setEditErr(null);
                        }}
                      >
                        {t("ui.edit")}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-text">
                    {o.sectors && o.sectors.length ? (
                      <div className="truncate">
                        {o.sectors.map((s) => s.name).join(", ")}
                      </div>
                    ) : (
                      <span className="text-muted-text">{t("ui.none")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center p-4 sm:p-6 z-50 overflow-auto">
          <div className="bg-card-bg border border-card-border rounded-lg shadow-lg w-full max-w-lg p-4 sm:p-6 space-y-4 mx-2 sm:mx-0">
            <h3 className="text-heading font-semibold text-base">
              {t("ui.edit")} {editing.name}
            </h3>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setEditErr(null);
                if (!editSectorIds.length) {
                  setEditErr("At least one sector");
                  return;
                }
                editMut.mutate({
                  id: editing.id,
                  name: editName,
                  email: editEmail,
                  sectorIds: editSectorIds,
                });
              }}
            >
              <label className="text-sm block">
                <span className="mb-1 block text-muted-text">
                  {t("form.name")}
                </span>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </label>
              <label className="text-sm block">
                <span className="mb-1 block text-muted-text">
                  {t("form.email")}
                </span>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </label>
              <div className="text-sm">
                <div className="mb-1 text-muted-text">{t("form.sector")}</div>
                <div className="space-y-2 max-h-56 overflow-auto rounded-md border p-2">
                  {sectorsQ.data?.items.map((s: Sector) => (
                    <label key={s.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editSectorIds.includes(s.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditSectorIds((prev) =>
                            checked
                              ? [...prev, s.id]
                              : prev.filter((id) => id !== s.id)
                          );
                        }}
                      />
                      <span className="text-body">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {editErr && <p className="text-sm text-danger">{editErr}</p>}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                  disabled={editMut.isPending}
                >
                  {t("ui.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="bg-button-primary text-button-on-primary"
                  disabled={editMut.isPending}
                >
                  {editMut.isPending ? t("ui.saving") : t("ui.save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
