"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";

export default function Page() {
  const { t } = useI18n();
  const [sectors, setSectors] = useState<Array<{ id: string; name: string }>>(
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/sectors/public`);
        setSectors(r.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("point.sectors.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {sectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ui.noSectors")}</p>
          ) : (
            <ul className="list-disc pl-6 space-y-1">
              {sectors.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
