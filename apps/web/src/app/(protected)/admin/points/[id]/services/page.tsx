"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys/services";
import {
  getAdminPointServices,
  ServiceLink,
  toggleAdminPointService,
} from "@/lib/clients/servicesClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ServiceStatusBadge from "@/components/services/ServiceStatusBadge";
import { toast } from "sonner";
import { AxiosError } from "axios";
// Link is intentionally not used in this page; keep import removed to satisfy linter

type ToggleVars = { serviceId: string; action: "ENABLE" | "DISABLE" };
type ApiError = AxiosError<{ error?: string }>;
type MutCtx = { prev?: ServiceLink[] };

export default function AdminPointServicesPage() {
  const params = useParams<{ id: string }>();
  const pointId = params.id!;

  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<ServiceLink[]>({
    queryKey: qk.adminPointServices(pointId),
    queryFn: () => getAdminPointServices(pointId),
  });

  const toggle = useMutation<ServiceLink, ApiError, ToggleVars, MutCtx>({
    mutationFn: ({
      serviceId,
      action,
    }: {
      serviceId: string;
      action: "ENABLE" | "DISABLE";
    }) => toggleAdminPointService(pointId, serviceId, action),
    onMutate: async ({ serviceId, action }) => {
      await qc.cancelQueries({ queryKey: qk.adminPointServices(pointId) });
      const prev = qc.getQueryData<ServiceLink[]>(
        qk.adminPointServices(pointId)
      );

      if (prev) {
        const next: ServiceLink[] = prev.map((x) =>
          x.serviceId === serviceId
            ? { ...x, status: action === "ENABLE" ? "ENABLED" : "DISABLED" }
            : x
        );
        qc.setQueryData(qk.adminPointServices(pointId), next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev)
        qc.setQueryData<ServiceLink[]>(
          qk.adminPointServices(pointId),
          ctx.prev
        );
      toast.error("Update failed");
    },
    onSuccess: (link) => {
      toast.success(`Service ${link.status.toLowerCase()} for point`);
      qc.invalidateQueries({ queryKey: qk.adminPointServices(pointId) });
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Point Services</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading…</p>}
          {isError && <p className="text-destructive">Failed to load.</p>}
          {!isLoading && data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%]">Service</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.service.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.service.code}
                    </TableCell>
                    <TableCell>
                      <ServiceStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggle.isPending || row.status === "ENABLED"}
                        onClick={() =>
                          toggle.mutate({
                            serviceId: row.serviceId,
                            action: "ENABLE",
                          })
                        }
                      >
                        Enable
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={toggle.isPending || row.status === "DISABLED"}
                        onClick={() =>
                          toggle.mutate({
                            serviceId: row.serviceId,
                            action: "DISABLE",
                          })
                        }
                      >
                        Disable
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Changes notify the point in real-time (in-app + email).
      </p>
    </div>
  );
}
