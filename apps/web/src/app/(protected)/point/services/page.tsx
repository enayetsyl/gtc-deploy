"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys/services";
import {
  getPointServices,
  requestServiceById,
  ServiceLink,
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
import { useI18n } from "@/providers/i18n-provider";

export default function PointServicesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery<ServiceLink[]>({
    queryKey: qk.pointServices,
    queryFn: getPointServices,
  });

  const requestMut = useMutation<
    ServiceLink, // return type
    AxiosError<{ error?: string }>, // error type
    string // variables type (serviceId)
  >({
    mutationFn: (serviceId: string) => requestServiceById(serviceId),
    onSuccess: () => {
      toast.success(t("point.services.requestSent"));
      qc.invalidateQueries({ queryKey: qk.pointServices });
    },
    onError: (err) =>
      toast.error(err.response?.data?.error ?? t("ui.requestFailed")),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("point.services.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>{t("ui.loading")}</p>}
          {isError && (
            <p className="text-destructive">{t("ui.failedToLoad")}</p>
          )}
          {!isLoading && data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%]">
                    {t("table.service")}
                  </TableHead>
                  <TableHead>{t("table.code")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="text-right">{t("ui.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const canRequest = row.status === "DISABLED";
                  return (
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
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!canRequest || requestMut.isPending}
                          onClick={() => requestMut.mutate(row.serviceId)}
                        >
                          {canRequest
                            ? t("point.services.request")
                            : row.status === "PENDING_REQUEST"
                            ? t("ui.pending")
                            : "—"}
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
        Tip: “Request” is only available for services that are currently{" "}
        <b>Disabled</b>.
      </p>
    </div>
  );
}
