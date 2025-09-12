"use client";
import { useState } from "react";
import { prefillPdf } from "../../hooks/useConventions";
import { downloadBlob } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";


export default function PrefillForm() {
const [applicantName, setApplicantName] = useState("");
const [loading, setLoading] = useState(false);


async function handlePrefill() {
try {
setLoading(true);
const blob = await prefillPdf({ applicantName });
downloadBlob(blob, "convention-prefill.pdf");
} finally {
setLoading(false);
}
}


return (
<div className="flex items-end gap-3">
<div className="flex-1">
<label className="text-sm mb-1 block">Applicant name</label>
<Input placeholder="Jane Doe" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
</div>
<Button onClick={handlePrefill} disabled={loading}>
{loading ? "Building…" : "Download prefill PDF"}
</Button>
</div>
);
}