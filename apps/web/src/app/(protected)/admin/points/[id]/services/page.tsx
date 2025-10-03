"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
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
import { useI18n } from "@/providers/i18n-provider";
import Spinner from "@/components/ui/Spinner";
// Link is intentionally not used in this page; keep import removed to satisfy linter

type ToggleVars = { serviceId: string; action: "ENABLE" | "DISABLE" };
type ApiError = AxiosError<{ error?: string }>;
type MutCtx = { prev?: ServiceLink[] };

export default function AdminPointServicesPage() {
  const params = useParams<{ id: string }>();
  const pointId = params.id!;

  const qc = useQueryClient();
  const [togglePending, setTogglePending] = useState<{
    serviceId: string;
    action: "ENABLE" | "DISABLE";
  } | null>(null);
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
      setTogglePending({ serviceId, action });
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
      const errObj = _err as unknown as {
        response?: { data?: { error?: string } };
      };
      const msg = errObj.response?.data?.error ?? t("toast.updateFailed");
      toast.error(String(msg));
    },
    onSuccess: (link) => {
      toast.success(
        t("toast.updateSuccess", { status: link.status.toLowerCase() })
      );
      qc.invalidateQueries({ queryKey: qk.adminPointServices(pointId) });
    },
    onSettled: () => setTogglePending(null),
  });

  const { t } = useI18n();

  return (
    <div className="container mx-auto py-6 space-y-6 mb-10">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.points.servicesTitle")}</CardTitle>
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
                  <TableHead className="text-right">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(
                  (row) => (
                    // debug: log the returned ServiceLink to help trace 'Service not found' issues
                    (console.debug?.("AdminPointServices row:", {
                      id: row.id,
                      serviceId: row.serviceId,
                      serviceIdNested: row.service?.id,
                      serviceCode: row.service?.code,
                      status: row.status,
                    }),
                    null),
                    (
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
                          {/** prefer nested service id when available */}
                          {/** compute id once to use consistently */}
                          {(() => {
                            // prefer the top-level serviceId (from the join table) which maps to Service.id
                            const svcId = row.serviceId ?? row.service?.id;
                            return (
                              <>
                                <Button
                                  size="sm"
                                  disabled={
                                    !svcId ||
                                    (togglePending?.serviceId === svcId &&
                                      togglePending.action === "ENABLE") ||
                                    row.status === "ENABLED"
                                  }
                                  onClick={() => {
                                    if (!svcId) {
                                      console.warn(
                                        "Attempted to enable service but svcId is missing",
                                        row
                                      );
                                      return;
                                    }
                                    toggle.mutate({
                                      serviceId: svcId,
                                      action: "ENABLE",
                                    });
                                  }}
                                >
                                  {togglePending?.serviceId === svcId &&
                                  togglePending.action === "ENABLE" ? (
                                    <span className="inline-flex items-center">
                                      <Spinner />
                                      {t("admin.points.services.enable")}
                                    </span>
                                  ) : (
                                    t("admin.points.services.enable")
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={
                                    !svcId ||
                                    (togglePending?.serviceId === svcId &&
                                      togglePending.action === "DISABLE") ||
                                    row.status === "DISABLED"
                                  }
                                  onClick={() => {
                                    if (!svcId) {
                                      console.warn(
                                        "Attempted to disable service but svcId is missing",
                                        row
                                      );
                                      return;
                                    }
                                    toggle.mutate({
                                      serviceId: svcId,
                                      action: "DISABLE",
                                    });
                                  }}
                                >
                                  {togglePending?.serviceId === svcId &&
                                  togglePending.action === "DISABLE" ? (
                                    <span className="inline-flex items-center">
                                      <Spinner />
                                      {t("admin.points.services.disable")}
                                    </span>
                                  ) : (
                                    t("admin.points.services.disable")
                                  )}
                                </Button>
                              </>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t("admin.points.services.changesHelp")}
      </p>
    </div>
  );
}
