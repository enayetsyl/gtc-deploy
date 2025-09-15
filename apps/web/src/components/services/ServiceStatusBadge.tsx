"use client";
import { Badge } from "@/components/ui/badge";

export default function ServiceStatusBadge({ status }: { status: "ENABLED" | "DISABLED" | "PENDING_REQUEST" }) {
  const map: Record<string, { variant?: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    ENABLED: { variant: "default", label: "Enabled" },
    DISABLED: { variant: "secondary", label: "Disabled" },
    PENDING_REQUEST: { variant: "outline", label: "Pending" },
  };
  const v = map[status] ?? { variant: "outline", label: status };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}
