"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
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

export default function CreateInvite() {
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
      } catch (err) {
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
      alert("Invite created");
      setEmail("");
      setName("");
      setIncludeServices(false);
    } catch {
      alert("Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Toaster />
      <form onSubmit={submit} className="max-w-xl space-y-4">
        <h2 className="text-lg font-semibold">Create invite</h2>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Sector
          </label>
          <Select value={sector} onValueChange={(v) => setSector(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sector" />
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
            Name
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Email
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
          <label className="text-sm">Include services</label>
        </div>

        {includeServices && (
          <div className="p-2 border rounded bg-background">
            <p className="text-sm text-muted-foreground mb-2">
              Select services to include for this onboarding:
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
                            setSelectedServices((prev) => [...prev, s.id]);
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
                  No services available
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create invite"}
          </Button>
        </div>
      </form>
    </div>
  );
}
