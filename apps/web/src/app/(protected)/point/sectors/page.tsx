"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
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
          <CardTitle>Available Sectors</CardTitle>
        </CardHeader>
        <CardContent>
          {sectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sectors available.
            </p>
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
