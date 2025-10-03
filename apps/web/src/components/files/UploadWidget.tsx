"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "../../components/ui/button";

type Props = {
  accept?: string | string[]; // e.g. "application/pdf" or [".pdf","image/*"]
  maxSizeMB?: number; // e.g. 10
  value?: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
};

function toArray(a?: string | string[]) {
  if (!a) return [] as string[];
  return Array.isArray(a) ? a : a.split(",").map((s) => s.trim());
}
function matchesAccept(file: File, accept?: string | string[]) {
  const list = toArray(accept).map((s) => s.toLowerCase());
  if (!list.length) return true;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return list.some((a) => {
    if (a.startsWith(".")) return name.endsWith(a);
    if (a.endsWith("/*")) return mime.startsWith(a.slice(0, -1));
    return mime === a;
  });
}

export default function UploadWidget({
  accept = "application/pdf",
  maxSizeMB = 10,
  value = null,
  onSelect,
  disabled,
  hint,
  className = "",
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useI18n();

  const validateAndSet = useCallback(
    (file: File) => {
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        setError(t("file.errors.tooLarge", { max: String(maxSizeMB) }));
        onSelect(null);
        return;
      }
      if (!matchesAccept(file, accept)) {
        setError(t("file.errors.typeNotAllowed"));
        onSelect(null);
        return;
      }
      setError(null);
      onSelect(file);
    },
    [accept, maxSizeMB, onSelect, t]
  );

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) validateAndSet(f);
  };

  return (
    <div className={className}>
      <div
        className={[
          "rounded-lg border border-dashed p-4 text-sm",
          "flex items-center justify-between gap-3",
          dragOver ? "bg-muted/40" : "bg-muted/20",
          disabled ? "opacity-60 pointer-events-none" : "",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer?.files ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-disabled={disabled}
      >
        <div className="flex-1">
          {value ? (
            <div className="flex flex-col">
              <span className="font-medium">{value.name}</span>
              <span className="text-xs text-muted-foreground">
                {t("file.sizeKb", { size: (value.size / 1024).toFixed(0) })}
              </span>
            </div>
          ) : (
            <div className="text-muted-foreground">
              {t("file.dropOrBrowse", { browse: t("file.choose") })}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm">
          {t("file.choose")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={toArray(accept).join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {hint ??
            t("file.accepted", {
              types: toArray(accept).join(", ") || "any",
              max: String(maxSizeMB),
            })}
        </span>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
