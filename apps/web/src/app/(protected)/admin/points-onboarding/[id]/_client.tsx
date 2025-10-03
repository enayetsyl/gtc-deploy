"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/Spinner";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";

type OnboardDetail = {
  id: string;
  name: string;
  email: string;
  vatOrTaxNumber?: string;
  phone?: string;
  signaturePath?: string;
  sector?: { id: string; name?: string } | null;
  status?: string;
  services?: Array<{ id: string; serviceId: string }>;
};

export default function Client({ id }: { id: string }) {
  const [item, setItem] = useState<OnboardDetail | null>(null);
  const [servicesList, setServicesList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const { t } = useI18n();

  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/admin/points/onboarding`);
        const json = r.data;
        const items: OnboardDetail[] = json.items || [];
        const found = (items.find((x) => x.id === id) ?? null) as
          | (OnboardDetail & { internalSalesRep?: string })
          | null;
        setItem(found);
      } catch (err) {
        console.error(err);
      }
    })();
    // fetch services to map serviceId -> name for display
    (async () => {
      try {
        const r = await api.get<{ id: string; name: string }[]>(
          `/api/admin/services`
        );
        const data = r.data || [];
        setServicesList(data.map((s) => ({ id: s.id, name: s.name })));
      } catch {
        // ignore
      }
    })();
  }, [id]);

  async function approve() {
    setApproving(true);
    try {
      await api.post(`/api/admin/points/onboarding/${id}/approve`);
      toast.success(t("detail.approvedMsg"));
      router.push("/admin/points-onboarding/list");
    } catch (err) {
      console.error(err);
    } finally {
      setApproving(false);
    }
  }
  async function decline() {
    setDeclining(true);
    try {
      await api.post(`/api/admin/points/onboarding/${id}/decline`);
      toast.success(t("detail.declinedMsg"));
      router.push("/admin/points-onboarding/list");
    } catch (err) {
      console.error(err);
    } finally {
      setDeclining(false);
    }
  }

  if (!item)
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        {t("ui.loading")}
      </div>
    );

  const isSubmitted = item.status === "SUBMITTED";
  const statusLabel = item.status ?? t("status.unknown");
  const statusClasses =
    item.status === "SUBMITTED"
      ? "bg-emerald-100 text-emerald-800"
      : item.status === "APPROVED"
      ? "bg-blue-100 text-blue-800"
      : item.status === "DECLINED"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white/5 rounded-lg shadow-sm mb-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl font-semibold">
            {t("detail.gtcPointName")}:{" "}
            <span className="font-normal">{item.name}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("detail.emailLabel")}:{" "}
            <span className="font-medium">{item.email}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div>
          <p className="text-sm text-muted-foreground">{t("detail.sector")}</p>
          <p className="mt-1 font-medium">
            {item.sector && item.sector.name ? item.sector.name : t("ui.none")}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("detail.vat")}</p>
          <p className="mt-1 font-medium">
            {item.vatOrTaxNumber ? item.vatOrTaxNumber : t("ui.none")}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("detail.phone")}</p>
          <p className="mt-1 font-medium">
            {item.phone ? item.phone : t("ui.none")}
          </p>
        </div>
        <div></div>
      </div>

      {item.services && item.services.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-2">
            {t("detail.requestedServices")}
          </p>
          <div className="flex flex-wrap gap-2">
            {item.services.map((s) => {
              const svc = servicesList.find((x) => x.id === s.serviceId);
              return (
                <span
                  key={s.id}
                  className="text-sm bg-slate-100 text-slate-800 px-2 py-1 rounded-full"
                >
                  {svc ? svc.name : s.serviceId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm text-muted-foreground mb-2">
          {t("detail.signature")}
        </p>
        <div className="w-full border rounded-md p-4 bg-white/2">
          {item.signaturePath ? (
            <div className="relative w-full h-40 sm:h-48">
              <Image
                src={`${item.signaturePath}`}
                alt={t("detail.signatureAlt")}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t("detail.noSignature")}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto justify-center"
              variant="default"
              onClick={approve}
              disabled={!isSubmitted || approving}
              title={
                !isSubmitted ? t("detail.actionsOnlyWhenSubmitted") : undefined
              }
            >
              {approving && <Spinner className="w-4 h-4 mr-2" />}
              {approving ? t("detail.approving") : t("detail.approve")}
            </Button>
            <Button
              className="w-full sm:w-auto justify-center"
              variant="destructive"
              onClick={decline}
              disabled={!isSubmitted || declining}
              title={
                !isSubmitted ? t("detail.actionsOnlyWhenSubmitted") : undefined
              }
            >
              {declining && <Spinner className="w-4 h-4 mr-2" />}
              {declining ? t("detail.declining") : t("detail.decline")}
            </Button>
          </div>

          {!isSubmitted && (
            <p className="text-xs text-muted-foreground">
              {t("detail.actionsOnlyWhenSubmitted")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
