"use client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useDownloadLeadAttachment } from "@/hooks/useLeads";


export function AttachmentChip({ leadId, attId, name }: { leadId: string; attId: string; name: string }) {
const dl = useDownloadLeadAttachment();


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
<Button variant="outline" size="sm" onClick={onClick} disabled={dl.isPending} className="gap-2">
<Download className="h-4 w-4" /> {name}
</Button>
);
}