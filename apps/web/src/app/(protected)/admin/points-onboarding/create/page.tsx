"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/axios";

type Sector = { id: string; name: string };

import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";

export default function CreateInvite() {
  const { t } = useI18n();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sector, setSector] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [includeServices, setIncludeServices] = useState(false);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Sector[]>("/api/sectors/public");
        setSectors(data);
      } catch {
        // ignore
      }
    })();
    (async () => {
      try {
        const { data } = await api.get<{ id: string; name: string }[]>(
          "/api/admin/services"
        );
        setServices(data || []);
      } catch {
        // ignore — services list is optional
      }
    })();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sector) return alert("Please select a sector");
    if (!email || !name) return alert("Name and email are required");
    setLoading(true);
    try {
      await api.post("/api/admin/points/onboarding", {
        sectorId: sector,
        email,
        name,
        includeServices,
        serviceIds: includeServices ? selectedServices : undefined,
      });
      // use a basic toast via browser alert (sonner Toaster can be mounted globally)
      toast.success(t("admin.onboarding.inviteCreated"));
      setEmail("");
      setName("");
      setIncludeServices(false);
    } catch {
      toast.error(t("ui.createFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-2 mb-10">
      <Toaster />
      <div className="w-full max-w-2xl">
        <Card>
          <div className="p-6">
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-lg font-semibold">
                {t("admin.onboarding.createInvite")}
              </h2>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  {t("ui.sector")}
                </label>
                <Select value={sector} onValueChange={(v) => setSector(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("ui.selectSector")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  {t("form.name")}
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  {t("form.email")}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeServices}
                  onCheckedChange={(c) => setIncludeServices(Boolean(c))}
                />
                <label className="text-sm">
                  {t("admin.onboarding.includeServices")}
                </label>
              </div>

              {includeServices && (
                <div className="p-2 border rounded bg-background">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("admin.onboarding.selectServices")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {services.length ? (
                      services.map((s) => {
                        const checked = selectedServices.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 p-2 border rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setSelectedServices((prev) => [
                                    ...prev,
                                    s.id,
                                  ]);
                                else
                                  setSelectedServices((prev) =>
                                    prev.filter((id) => id !== s.id)
                                  );
                              }}
                            />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("ui.noServices")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  className="bg-brand-blue-500 hover:bg-brand-blue-600 text-white"
                  disabled={loading}
                >
                  {loading
                    ? t("ui.creating")
                    : t("admin.onboarding.createInvite")}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
