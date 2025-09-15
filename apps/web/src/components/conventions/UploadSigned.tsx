"use client";
import { useState } from "react";
import { useUploadSigned } from "../../hooks/useConventions";
import { Button } from "../../components/ui/button";
import UploadWidget from "../files/UploadWidget";
import { AxiosProgressEvent } from "axios";


export default function UploadSigned({ conventionId }: { conventionId: string }) {
const [file, setFile] = useState<File | null>(null);
const [progress, setProgress] = useState<number | null>(null);
const mutation = useUploadSigned(conventionId);


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


return (
<div className="flex items-center gap-3">
<UploadWidget
        accept="application/pdf"
        maxSizeMB={10}
        value={file}
        onSelect={setFile}
        disabled={mutation.isPending}
        hint="Signed PDF only · Max 10MB"
        className="min-w-[360px]"
      />
<Button disabled={!file || mutation.isPending} onClick={onUpload}>
{mutation.isPending ? "Uploading…" : "Upload signed PDF"}
</Button>
{progress !== null && <span className="text-sm text-muted-foreground">{progress}%</span>}
</div>
);
}