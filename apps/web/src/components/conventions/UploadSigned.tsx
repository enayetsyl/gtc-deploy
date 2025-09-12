"use client";
import { useState } from "react";
import { useUploadSigned } from "../../hooks/useConventions";
import { Button } from "../../components/ui/button";


export default function UploadSigned({ conventionId }: { conventionId: string }) {
const [file, setFile] = useState<File | null>(null);
const [progress, setProgress] = useState<number | null>(null);
const mutation = useUploadSigned(conventionId);


async function onUpload() {
if (!file) return;
setProgress(0);
await mutation.mutateAsync(file);
setProgress(null);
setFile(null);
}


return (
<div className="flex items-center gap-3">
<input
type="file"
accept="application/pdf"
onChange={(e) => setFile(e.target.files?.[0] ?? null)}
/>
<Button disabled={!file || mutation.isPending} onClick={onUpload}>
{mutation.isPending ? "Uploading…" : "Upload signed PDF"}
</Button>
{progress !== null && <span className="text-sm text-muted-foreground">{progress}%</span>}
</div>
);
}