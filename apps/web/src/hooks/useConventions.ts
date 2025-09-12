import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { Convention, ConventionDocument, ConventionStatus } from "../lib/types";


export function useMyConventions(page = 1, pageSize = 20) {
return useQuery({
queryKey: ["conventions", { page, pageSize }],
queryFn: async () => {
const { data } = await api.get<{ items: Convention[]; total: number; page: number; pageSize: number }>(
`/api/conventions`,
{ params: { page, pageSize } }
);
return data;
},
});
}


export function useAdminConventions(status?: ConventionStatus) {
return useQuery({
queryKey: ["admin-conventions", { status }],
queryFn: async () => {
const { data } = await api.get<{ items: Convention[] }>(`/api/admin/conventions`, {
params: status ? { status } : undefined,
});
return data.items;
},
});
}


export function useCreateConvention() {
const qc = useQueryClient();
return useMutation({
mutationFn: async () => {
const { data } = await api.post<Convention>(`/api/conventions`, {});
return data;
},
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["conventions"] });
},
});
}

export function useUploadSigned(conventionId: string) {
const qc = useQueryClient();
return useMutation({
mutationFn: async (file: File) => {
const fd = new FormData();
fd.append("file", file);
const { data } = await api.post(`/api/conventions/${conventionId}/upload`, fd, {
headers: { "Content-Type": "multipart/form-data" },
});
return data as { ok: boolean; document: ConventionDocument; downloadUrl: string };
},
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["conventions"] });
qc.invalidateQueries({ queryKey: ["admin-conventions"] });
},
});
}


export async function prefillPdf(params: { applicantName?: string; pointName?: string; title?: string }) {
const { data } = await api.post(`/api/conventions/prefill`, params, { responseType: "blob" });
return data as Blob;
}


export function useListDocuments(conventionId: string) {
return useQuery({
queryKey: ["convention-docs", conventionId],
queryFn: async () => {
const { data } = await api.get<{ items: ConventionDocument[] }>(`/api/conventions/${conventionId}/documents`);
return data.items;
},
enabled: !!conventionId,
});
}


export async function downloadDocument(conventionId: string, docId: string) {
const { data } = await api.get(`/api/conventions/${conventionId}/documents/${docId}/download`, {
responseType: "blob",
});
return data as Blob;
}


export function useAdminDecision(conventionId: string) {
const qc = useQueryClient();
return useMutation({
mutationFn: async (payload: { action: "APPROVE" | "DECLINE"; internalSalesRep?: string }) => {
const { data } = await api.patch(`/api/admin/conventions/${conventionId}`, payload);
return data as Convention;
},
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["admin-conventions"] });
qc.invalidateQueries({ queryKey: ["conventions"] });
},
});
}