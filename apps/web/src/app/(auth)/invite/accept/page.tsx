import { Suspense } from "react";
import { AcceptInviteClient } from "./AcceptInviteClient";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <p>Loading...</p>
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}
