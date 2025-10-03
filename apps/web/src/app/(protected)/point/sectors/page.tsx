"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// toast is unused because onboarding modal is currently disabled

export default function Page() {
  const { t } = useI18n();
  const [allSectors, setAllSectors] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [mySectorIds, setMySectorIds] = useState<string[]>([]);
  const [sectorsLoaded, setSectorsLoaded] = useState(false);
  const [mySectorsLoaded, setMySectorsLoaded] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;

    function isAbortError(err: unknown): boolean {
      if (typeof err !== "object" || err === null) return false;
      const maybeName = (err as { name?: unknown }).name;
      return typeof maybeName === "string" && maybeName === "AbortError";
    }

    (async () => {
      try {
        // Load all public sectors
        try {
          const r = await api.get(`/api/sectors/public`, { signal: ac.signal });
          const sectors = r.data || [];
          if (mounted) setAllSectors(sectors);
        } catch (err) {
          if (isAbortError(err)) return;
          console.error("Could not load public sectors", err);
        } finally {
          if (mounted) setSectorsLoaded(true);
        }

        // Load my sectors. Prefer the dedicated endpoint for GTC_POINT if available,
        // otherwise fall back to /api/me/points which contains legacy sectorId values.
        try {
          try {
            const r = await api.get(`/api/point/sectors`, {
              signal: ac.signal,
            });
            const items = (r.data?.items || []) as Array<{ id: string }>;
            const ids = Array.from(new Set(items.map((i) => i.id)));
            if (mounted) setMySectorIds(ids);
          } catch {
            // Fallback to legacy me/points when /api/point/sectors isn't accessible
            try {
              const me = await api.get(`/api/me/points`, {
                params: { page: 1, pageSize: 200 },
                signal: ac.signal,
              });
              if (!mounted) return;
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
              if (mounted) setMySectorIds(ids);
            } catch (err) {
              if (isAbortError(err)) return;
              console.warn("Could not load my sectors (legacy)", err);
            }
          }
        } catch (e) {
          console.warn("Could not load my sectors", e);
        } finally {
          if (mounted) setMySectorsLoaded(true);
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  // Wait until both loads have completed to avoid initial flicker where everything
  // shows up in "other" before the user's sector ids arrive.
  const ready = sectorsLoaded && mySectorsLoaded;

  const mySectors = ready
    ? allSectors.filter((s) => mySectorIds.includes(s.id))
    : [];
  const otherSectors = ready
    ? allSectors.filter((s) => !mySectorIds.includes(s.id))
    : [];

  // Modal for asking to join a sector is currently not rendered; keep code
  // commented in the JSX below. Removing modal state to avoid unused-variable
  // lint warnings. Re-add when enabling the modal UI.

  // async function applyAsk() {
  //   if (!askSector) return;
  //   if (!askName || !askEmail) {
  //     toast.error(t("admin.onboarding.errors.missingNameEmail"));
  //     return;
  //   }
  //   setAskLoading(true);
  //   try {
  //     await api.post("/api/admin/points/onboarding", {
  //       sectorId: askSector.id,
  //       email: askEmail,
  //       name: askName,
  //       includeServices: askSelected.length > 0,
  //       serviceIds: askSelected.length > 0 ? askSelected : undefined,
  //     });
  //     toast.success(t("admin.onboarding.inviteCreated"));
  //     setAskOpen(false);
  //   } catch (err) {
  //     console.error(err);
  //     toast.error(t("ui.createFailed"));
  //   } finally {
  //     setAskLoading(false);
  //   }
  // }

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
            {!ready ? (
              <p className="text-sm text-muted-foreground">{t("ui.loading")}</p>
            ) : mySectors.length === 0 ? (
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
            {!ready ? (
              <p className="text-sm text-muted-foreground">{t("ui.loading")}</p>
            ) : otherSectors.length === 0 ? (
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
                    {/* <Button
                      size="sm"
                      onClick={() => openAskModal(s.id, s.name)}
                    >
                      Ask
                    </Button> */}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Ask modal */}
      {/* {askOpen && askSector && (
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
                readOnly
                onChange={(e) => setAskName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm mb-1">{t("form.email")}</label>
              <Input
                value={askEmail}
                readOnly
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
                  <p className="text-sm text-muted-foreground">{t("ui.noServices")}</p>
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
      )} */}
    </div>
  );
}
