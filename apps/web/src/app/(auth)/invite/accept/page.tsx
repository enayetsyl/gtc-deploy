import { Suspense } from "react";
import { AcceptInviteClient } from "./AcceptInviteClient";
import { useI18n } from "@/providers/i18n-provider";

export default function AcceptInvitePage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <p>{t("ui.loading")}</p>
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}
