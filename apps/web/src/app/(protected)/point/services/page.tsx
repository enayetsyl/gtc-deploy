"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys/services";
import { getPointServices, requestServiceById, ServiceLink } from "@/lib/clients/servicesClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ServiceStatusBadge from "@/components/services/ServiceStatusBadge";
import { toast } from "sonner";
import { AxiosError } from "axios";

export default function PointServicesPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<ServiceLink[]>({ queryKey: qk.pointServices, queryFn: getPointServices });

  const requestMut = useMutation<
    ServiceLink,                            // return type
    AxiosError<{ error?: string }>,         // error type
    string                                  // variables type (serviceId)
  >({
    mutationFn: (serviceId: string) => requestServiceById(serviceId),
    onSuccess: () => {
      toast.success("Request sent to Admins");
      qc.invalidateQueries({ queryKey: qk.pointServices });
    },
     onError: (err) => toast.error(err.response?.data?.error ?? "Failed to request service"),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Services</CardTitle>
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const canRequest = row.status === "DISABLED";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.service.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.service.code}</TableCell>
                      <TableCell><ServiceStatusBadge status={row.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!canRequest || requestMut.isPending}
                          onClick={() => requestMut.mutate(row.serviceId)}
                        >
                          {canRequest ? "Request" : row.status === "PENDING_REQUEST" ? "Pending…" : "—"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Tip: “Request” is only available for services that are currently <b>Disabled</b>.
      </p>
    </div>
  );
}
