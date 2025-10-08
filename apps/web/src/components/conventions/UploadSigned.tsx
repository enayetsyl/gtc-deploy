"use client";
import { useState } from "react";
import { useUploadSigned } from "../../hooks/useConventions";
// Button removed — upload starts automatically on select
import UploadWidget from "../files/UploadWidget";
import { useListDocuments } from "@/hooks/useConventions";
import { useI18n } from "@/providers/i18n-provider";
import { AxiosProgressEvent } from "axios";
import { useEffect } from "react";

export default function UploadSigned({
  conventionId,
}: {
  conventionId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const mutation = useUploadSigned(conventionId);
  const { t } = useI18n();
  const docsQ = useListDocuments(conventionId);

  async function onUpload() {
    if (!file) return;
    setProgress(0);
    await mutation.mutateAsync({
      file,
      onUploadProgress: (p: AxiosProgressEvent) => {
        if (!p.total) return;
        const pct = Math.round((p.loaded / p.total) * 100);
        setProgress(pct);
      },
    });
    setProgress(null);
    setFile(null);
  }

  // Automatically start upload when a file is chosen
  useEffect(() => {
    if (!file) return;
    // don't auto-trigger if mutation already running
    if (mutation.isPending) return;
    // fire and forget; onUpload handles state
    void onUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full">
      {/* Hide the upload box while uploading to avoid selecting a new file mid-upload */}
      {!(mutation.isPending || (docsQ.data && docsQ.data.length > 0)) && (
        <UploadWidget
          accept="application/pdf"
          maxSizeMB={10}
          value={file}
          onSelect={setFile}
          hint={t("file.accepted", { types: "PDF", max: "10" })}
          className="w-full md:min-w-[360px]"
        />
      )}

      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Show a disabled uploading indicator while mutation is pending, otherwise a hint */}
        {mutation.isPending ? (
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-muted/10">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <span className="text-sm">{t("upload.uploading")}</span>
          </div>
        ) : // Only show the helper label when the upload widget is visible
        // (i.e. there are no existing documents for this convention)
        !(docsQ.data && docsQ.data.length > 0) ? (
          <div className="text-sm text-muted-foreground">
            {t("upload.uploadSigned")}
          </div>
        ) : null}

        {progress !== null && (
          <span className="text-sm text-muted-foreground hidden md:inline-block">
            {progress}%
          </span>
        )}
      </div>

      {progress !== null && (
        <div className="mt-2 md:hidden text-sm text-muted-foreground">
          {progress}%
        </div>
      )}
    </div>
  );
}
