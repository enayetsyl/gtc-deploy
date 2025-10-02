"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";

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
                    className="p-3 rounded-md border border-divider bg-card-bg text-body"
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
