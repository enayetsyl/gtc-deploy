"use client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useDownloadLeadAttachment } from "@/hooks/useLeads";
import { useI18n } from "@/providers/i18n-provider";

export function AttachmentChip({
  leadId,
  attId,
  name,
}: {
  leadId: string;
  attId: string;
  name: string;
}) {
  const dl = useDownloadLeadAttachment();
  const { t } = useI18n();

  async function onClick() {
    const blob = await dl.mutateAsync({ leadId, attId });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={dl.isPending}
      className="gap-2"
      title={name}
      aria-label={t("file.downloadAttachment", { name })}
    >
      <Download className="h-4 w-4" />
      <span
        className="max-w-[160px] inline-block align-middle truncate"
        style={{ verticalAlign: "middle" }}
      >
        {name}
      </span>
    </Button>
  );
}
