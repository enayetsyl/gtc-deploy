"use client";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/providers/i18n-provider";

export default function ServiceStatusBadge({
  status,
}: {
  status: "ENABLED" | "DISABLED" | "PENDING_REQUEST";
}) {
  const { t } = useI18n();

  const map: Record<
    string,
    {
      variant?: "default" | "secondary" | "destructive" | "outline";
      key?: string;
    }
  > = {
    ENABLED: { variant: "default", key: "service.status.enabled" },
    DISABLED: { variant: "secondary", key: "service.status.disabled" },
    PENDING_REQUEST: {
      variant: "outline",
      key: "service.status.pendingRequest",
    },
  };

  const v = map[status] ?? { variant: "outline" };
  const label = v.key ? t(v.key) : status;
  return <Badge variant={v.variant}>{label}</Badge>;
}
