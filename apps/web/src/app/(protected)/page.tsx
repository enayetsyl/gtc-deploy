import ClientTouch from "./client-touch";
import { useI18n } from "@/providers/i18n-provider";

export const runtime = "nodejs"; // ensure node runtime (avoid edge quirks)

export default function AdminHome() {
  const { t } = useI18n();
  return (
    <main className="rounded-xl border p-6">
      <ClientTouch />
      <p className="text-gray-700">{t("protected.home.chooseSection")}</p>
    </main>
  );
}
