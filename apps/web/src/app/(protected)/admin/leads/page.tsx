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
import Pagination from "@/components/ui/pagination";

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
  sector: sector;
};
type sector = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
  const pageSize = 10;
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

  console.log("leads", leads);

  const total = leads?.total ?? 0;
  const currentPage = leads?.page ?? page;
  const currentPageSize = leads?.pageSize ?? pageSize;

  return (
    <div className="p-4 sm:p-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-heading text-xl sm:text-2xl font-semibold">
            {t("admin.leads.title")}
          </CardTitle>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Input
              placeholder={t("admin.leads.filterPlaceholder")}
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="w-full sm:w-[260px] bg-page-bg border border-divider focus-visible:ring-2 ring-focus"
            />
            <Button onClick={applyFilter} className="w-full sm:w-auto">
              {t("ui.apply")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t("ui.loading")}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[700px] sm:min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm text-muted-foreground">
                        {t("table.created")}
                      </TableHead>
                      <TableHead className="text-sm text-muted-foreground">
                        {t("table.sector")}
                      </TableHead>
                      <TableHead className="text-sm text-muted-foreground">
                        {t("table.name")}
                      </TableHead>
                      <TableHead className="text-sm text-muted-foreground">
                        {t("table.email")}
                      </TableHead>
                      <TableHead className="text-sm text-muted-foreground">
                        {t("table.phone")}
                      </TableHead>
                      <TableHead className="text-sm text-muted-foreground">
                        {t("table.message")}
                      </TableHead>
                      <TableHead className="text-sm text-muted-foreground">
                        {t("table.attachments")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leads?.items || []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm text-body">
                          {new Date(l.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-body">
                          {l.sector.name}
                        </TableCell>
                        <TableCell className="text-sm text-body">
                          {l.name}
                        </TableCell>
                        <TableCell className="text-sm text-body">
                          {l.email || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-body">
                          {l.phone || "—"}
                        </TableCell>
                        <TableCell className="max-w-[320px] break-words text-sm text-body">
                          {l.message || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-center mt-4">
                <Pagination
                  total={total}
                  page={currentPage}
                  pageSize={currentPageSize}
                  onPageChange={(p) => go(p)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
