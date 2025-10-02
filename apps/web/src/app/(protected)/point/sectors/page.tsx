"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function Page() {
  const { t } = useI18n();
  const [allSectors, setAllSectors] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [mySectorIds, setMySectorIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // Load all public sectors
        const r = await api.get(`/api/sectors/public`);
        const sectors = r.data || [];
        setAllSectors(sectors);

        // Load my points (will include sectorId for GTC_POINT or SECTOR_OWNER links)
        try {
          const me = await api.get(`/api/me/points`, {
            params: { page: 1, pageSize: 200 },
          });
          type PointItem = { sectorId?: string };
          const items = (me.data?.items || []) as PointItem[];
          const ids = Array.from(
            new Set(
              items
                .map((i) => i?.sectorId)
                .filter(
                  (x): x is string => typeof x === "string" && x.length > 0
                )
            )
          );
          setMySectorIds(ids);
        } catch (err) {
          // If me/points is not available (no auth), just leave mySectorIds empty
          console.warn("Could not load my sectors", err);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const mySectors = allSectors.filter((s) => mySectorIds.includes(s.id));
  const otherSectors = allSectors.filter((s) => !mySectorIds.includes(s.id));

  // Modal state for asking to join a sector
  const [askOpen, setAskOpen] = useState(false);
  const [askSector, setAskSector] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [askServices, setAskServices] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [askSelected, setAskSelected] = useState<string[]>([]);
  const [askName, setAskName] = useState("");
  const [askEmail, setAskEmail] = useState("");
  const [askLoading, setAskLoading] = useState(false);

  async function openAskModal(sectorId: string, sectorName: string) {
    setAskSector({ id: sectorId, name: sectorName });
    setAskSelected([]);
    setAskServices([]);
    setAskName("");
    setAskEmail("");
    setAskOpen(true);
    try {
      // Try to prefill name/email from /api/me when available
      try {
        const me = await api.get(`/api/me`);
        const user = me.data as { name?: string; email?: string };
        if (user?.name) setAskName(user.name);
        if (user?.email) setAskEmail(user.email);
      } catch {
        // ignore if /api/me not available
      }
      const { data } = await api.get<{ id: string; name: string }[]>(
        "/api/admin/services",
        { params: { sectorId } }
      );
      setAskServices(data || []);
    } catch (err) {
      // show error but allow user to continue without services
      console.warn("Could not load services for sector", err);
      toast.error(t("ui.failedToLoad"));
      setAskServices([]);
    }
  }

  async function applyAsk() {
    if (!askSector) return;
    if (!askName || !askEmail) {
      toast.error(t("admin.onboarding.errors.missingNameEmail"));
      return;
    }
    setAskLoading(true);
    try {
      await api.post("/api/admin/points/onboarding", {
        sectorId: askSector.id,
        email: askEmail,
        name: askName,
        includeServices: askSelected.length > 0,
        serviceIds: askSelected.length > 0 ? askSelected : undefined,
      });
      toast.success(t("admin.onboarding.inviteCreated"));
      setAskOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("ui.createFailed"));
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <div className="p-4 mb-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-heading text-lg font-semibold">
              {t("point.sectors.mySectors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mySectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("point.sectors.none")}
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2">
                {mySectors.map((s) => (
                  <li
                    key={s.id}
                    className="p-3 rounded-md border border-divider bg-card-bg text-body"
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-heading text-lg font-semibold">
              {t("point.sectors.otherSectors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {otherSectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("ui.noSectors")}
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2">
                {otherSectors.map((s) => (
                  <li
                    key={s.id}
                    className="p-3 rounded-md border border-divider bg-card-bg text-body flex items-center justify-between"
                  >
                    <span>{s.name}</span>
                    <Button
                      size="sm"
                      onClick={() => openAskModal(s.id, s.name)}
                    >
                      Ask
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Ask modal */}
      {askOpen && askSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAskOpen(false)}
          />
          <div className="relative max-w-xl w-full bg-popover text-popover-foreground rounded-xl shadow-lg p-4 sm:p-6 mx-4">
            <h3 className="text-lg font-semibold mb-2">
              {t("point.sectors.askTitle", { sector: askSector.name })}
            </h3>
            <div className="mb-3">
              <label className="block text-sm mb-1">{t("form.name")}</label>
              <Input
                value={askName}
                onChange={(e) => setAskName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">{t("form.email")}</label>
              <Input
                value={askEmail}
                onChange={(e) => setAskEmail(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <p className="text-sm text-muted-foreground mb-2">
                {t("admin.onboarding.selectServices")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {askServices.length ? (
                  askServices.map((svc) => {
                    const checked = askSelected.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className="flex items-center gap-2 p-2 border rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked)
                              setAskSelected((prev) => [...prev, svc.id]);
                            else
                              setAskSelected((prev) =>
                                prev.filter((id) => id !== svc.id)
                              );
                          }}
                        />
                        <span className="text-sm">{svc.name}</span>
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
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" onClick={() => setAskOpen(false)}>
                {t("ui.cancel")}
              </Button>
              <Button onClick={applyAsk} disabled={askLoading}>
                {t("ui.apply")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
