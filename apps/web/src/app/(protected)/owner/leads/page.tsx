"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useLeadsMe } from "@/hooks/useLeads";
import { useI18n } from "@/providers/i18n-provider";
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
import { AttachmentChip } from "@/components/lead/AttachmentChip";

type Attachment = { id: string; fileName: string };
type Lead = {
  id: string;
  createdAt: string;
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

export default function OwnerLeadsPage() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const page = Number(sp.get("page") || 1);
  const pageSize = 20;
  const { data, isLoading } = useLeadsMe(page, pageSize);

  const leads = data as LeadsPage | undefined;

  function go(p: number) {
    const qp = new URLSearchParams(sp.toString());
    qp.set("page", String(p));
    router.push(`?${qp.toString()}`);
  }
  return (
    <div className="p-2 mb-10">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-heading text-xl font-semibold">
            {t("nav.leads")} ({t("table.sector")})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t("ui.loading")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm text-muted-foreground">
                      {t("table.created")}
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
                  {(leads?.items || []).map((l: Lead) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm text-body">
                        {new Date(l.createdAt).toLocaleString()}
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
                      <TableCell className="max-w-[320px] truncate text-sm text-body">
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
                  {t("table.total", { total: leads?.total ?? 0 })}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => go(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    {t("pagination.prev")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => go(page + 1)}
                    disabled={
                      (leads?.page ?? 1) * (leads?.pageSize ?? pageSize) >=
                      (leads?.total ?? 0)
                    }
                  >
                    {t("pagination.next")}
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
