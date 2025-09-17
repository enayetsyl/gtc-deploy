"use client";
import { useState } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { useSearchParams, useRouter } from "next/navigation";
import { useLeadsAdmin } from "@/hooks/useLeads";
import { useLeadRealtime } from "@/hooks/useLeadRealtime";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttachmentChip } from "@/components/lead/AttachmentChip";

type Attachment = { id: string; fileName: string };
type Lead = {
  id: string;
  createdAt: string;
  sectorId?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  attachments?: Attachment[];
};
type LeadsPage = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminLeadsPage() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const page = Number(sp.get("page") || 1);
  const pageSize = 20;
  const [sectorId, setSectorId] = useState<string>(sp.get("sectorId") || "");
  const { data, isLoading } = useLeadsAdmin(
    page,
    pageSize,
    sectorId || undefined
  );

  const leads = data as LeadsPage | undefined;

  useLeadRealtime(() => {
    qc.invalidateQueries({ queryKey: ["leads", "admin"] });
  });

  function applyFilter() {
    const qp = new URLSearchParams(sp.toString());
    if (sectorId) qp.set("sectorId", sectorId);
    else qp.delete("sectorId");
    qp.set("page", "1");
    router.push(`?${qp.toString()}`);
  }

  function go(p: number) {
    const qp = new URLSearchParams(sp.toString());
    qp.set("page", String(p));
    router.push(`?${qp.toString()}`);
  }

  const total = leads?.total ?? 0;
  const currentPage = leads?.page ?? page;
  const currentPageSize = leads?.pageSize ?? pageSize;

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>{t("admin.leads.title")}</CardTitle>
          <div className="flex gap-2 items-center">
            <Input
              placeholder={t("admin.leads.filterPlaceholder")}
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="w-[260px]"
            />
            <Button variant="outline" onClick={applyFilter}>
              {t("ui.apply")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t("ui.loading")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.created")}</TableHead>
                    <TableHead>{t("table.sector")}</TableHead>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.email")}</TableHead>
                    <TableHead>{t("table.phone")}</TableHead>
                    <TableHead>{t("table.message")}</TableHead>
                    <TableHead>{t("table.attachments")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads?.items.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        {new Date(l.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{l.sectorId}</TableCell>
                      <TableCell>{l.name}</TableCell>
                      <TableCell>{l.email || "—"}</TableCell>
                      <TableCell>{l.phone || "—"}</TableCell>
                      <TableCell className="max-w-[320px] truncate">
                        {l.message || "—"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {l.attachments?.length ? (
                          l.attachments.map((a) => (
                            <AttachmentChip
                              key={a.id}
                              leadId={l.id}
                              attId={a.id}
                              name={a.fileName}
                            />
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            {t("ui.none")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Total: {total}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => go(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => go(currentPage + 1)}
                    disabled={currentPage * currentPageSize >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
