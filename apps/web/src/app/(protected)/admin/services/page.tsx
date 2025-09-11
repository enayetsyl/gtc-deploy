"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createService, deleteService, listServices, updateService, type Service } from "@/lib/admin-api";
import { useState } from "react";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(200),
});

export default function ServicesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "services"], queryFn: () => listServices() });

  const [form, setForm] = useState({ code: "", name: "" });
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: { code: string; name: string }) => createService(payload),
    onSuccess: () => {
      setForm({ code: "", name: "" });
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
    },
    onError: () => setErr("Failed to create service"),
  });

  const toggleMut = useMutation({
    mutationFn: (svc: Service) => updateService(svc.id, { active: !svc.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] }),
    onError: () => setErr("Delete failed (service linked to points)"),
  });

  return (
    <main className="space-y-6">
      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create service</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            const parsed = schema.safeParse(form);
            if (!parsed.success) return setErr(parsed.error.issues[0]?.message ?? "Validation error");
            createMut.mutate(parsed.data);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm mb-1">Code (UPPER_SNAKE)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
              placeholder="DOC_SIGN"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Document Signing"
            />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-md bg-black text-white px-3 py-2" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating..." : "Create"}
            </button>
            {err && <span className="ml-3 text-sm text-red-600">{err}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Services</h2>
        {q.isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="divide-y">
            {q.data?.map((svc) => (
              <div key={svc.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{svc.name}</div>
                  <div className="text-xs text-gray-600">{svc.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border px-3 py-1.5"
                    onClick={() => toggleMut.mutate(svc)}
                    disabled={toggleMut.isPending}
                  >
                    {svc.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="rounded-md border px-3 py-1.5"
                    onClick={() => delMut.mutate(svc.id)}
                    disabled={delMut.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
