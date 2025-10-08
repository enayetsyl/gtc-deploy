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
  }, []);

  // Fetch services for the selected sector. Only load when a sector is chosen.
  // no-op: services are no longer selected at invite creation time
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Sector[]>("/api/sectors/public");
        setSectors(data);
      } catch {
        // ignore
      }
    })();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sector) {
      toast.error(t("admin.onboarding.errors.noSector"));
      return;
    }
    if (!email || !name) {
      toast.error(t("admin.onboarding.errors.missingNameEmail"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/admin/points/onboarding", {
        sectorId: sector,
        email,
        name,
      });
      // use a basic toast via browser alert (sonner Toaster can be mounted globally)
      toast.success(t("admin.onboarding.inviteCreated"));
      setEmail("");
      setName("");
      setSector("");
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

              {/* services preselection removed — invites are sector-only now */}

              <div>
                <Button
                  type="submit"
                  className="bg-brand-blue-500 hover:bg-brand-blue-600 text-white"
                  disabled={loading || !sector || !name || !email}
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
