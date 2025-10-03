"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { qk } from "@/lib/queryKeys/services";
import {
  getPointServices,
  requestServiceById,
  ServiceLink,
} from "@/lib/clients/servicesClient";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";
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
    // Ensure we call the API every time this route/component mounts
    retryOnMount: true,
    
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

  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);

  const handleRequest = async (serviceId: string) => {
    try {
      setPendingServiceId(serviceId);
      await requestMut.mutateAsync(serviceId);
    } finally {
      setPendingServiceId(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 mb-10">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("point.services.title")}
        
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="flex items-center">
              <Spinner className="w-4 h-4 mr-2" />
              {t("ui.loading")}
            </p>
          )}
          {isError && (
            <p className="text-destructive">{t("ui.failedToLoad")}</p>
          )}
          {!isLoading &&
            (Array.isArray(data) && data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[34%]">
                      {t("table.service")}
                    </TableHead>
                    <TableHead className="w-[20%]">{t("table.code")}</TableHead>
                    <TableHead>{t("table.sector")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("ui.action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(data) ? data : []).map((row) => {
                    const canRequest = row.status === "DISABLED";
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.service.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.service.code}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.service.sector?.name ?? "-"}
                        </TableCell>
                        <TableCell>
                          <ServiceStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={
                              !canRequest || pendingServiceId === row.serviceId
                            }
                            onClick={() => handleRequest(row.serviceId)}
                          >
                            {pendingServiceId === row.serviceId && (
                              <Spinner className="w-4 h-4 mr-2" />
                            )}
                            {canRequest
                              ? t("point.services.request")
                              : row.status === "PENDING_REQUEST"
                              ? t("ui.pending")
                              : t("ui.none")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              // If data is not an array or empty, show a user-friendly message
              !isError && (
                <p className="text-sm text-muted-foreground">
                  {t("ui.noServices")}
                </p>
              )
            ))}
        </CardContent>
      </Card>

      <p
        className="text-sm text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: t("point.services.tip") }}
      />
    </div>
  );
}
