import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { Convention, ConventionDocument, ConventionStatus } from "../lib/types";
import type { AxiosProgressEvent, AxiosResponseHeaders } from "axios";

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

type UploadSignedVars = {
  file: File;
  onUploadProgress?: (e: AxiosProgressEvent) => void;
  sectorId?: string;
  serviceIds?: string[];
};

export function useUploadSigned(conventionId: string) {
  const qc = useQueryClient();
  return useMutation<
    { ok: boolean; document: ConventionDocument; downloadUrl: string },
    Error,
    UploadSignedVars
  >({
    mutationFn: async ({ file, onUploadProgress, sectorId, serviceIds }) => {
      const fd = new FormData();
      fd.append("file", file);
      if (sectorId) fd.append("sectorId", sectorId);
      if (serviceIds && serviceIds.length) fd.append("serviceIds", JSON.stringify(serviceIds));
      const r = await api.post(`/api/conventions/${conventionId}/upload`, fd, { onUploadProgress });
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conventions"] });
      qc.invalidateQueries({ queryKey: ["admin-conventions"] });
    },
  });
}


export async function prefillPdf(params: { applicantName?: string; pointName?: string; title?: string; sectorName?: string; services?: string[]; signature?: string }) {
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

function parseContentDispositionFilename(h?: string): string | null {
  if (!h) return null;
  // handles: filename="x.zip" OR filename*=UTF-8''x.zip
  const mUtf = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(h);
  if (mUtf?.[1]) return decodeURIComponent(mUtf[1].replace(/^["']|["']$/g, ""));
  const m = /filename=([^;]+)/i.exec(h);
  if (m?.[1]) return m[1].trim().replace(/^["']|["']$/g, "");
  return null;
}

export async function downloadArchive(conventionId: string): Promise<{ blob: Blob; filename: string }> {
  const r = await api.get(`/api/admin/conventions/${conventionId}/archive`, { responseType: "blob" });
  const headers = (r.headers ?? {}) as AxiosResponseHeaders;
  const filename = parseContentDispositionFilename(headers["content-disposition"]) || `convention-${conventionId}.zip`;
  return { blob: r.data as Blob, filename };
}


export function useDeleteConvention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/conventions/${id}`);
      return id;
    },
    onSuccess: (_data, id) => {
      // invalidate lists so UI refreshes
      qc.invalidateQueries({ queryKey: ["conventions"] });
      qc.invalidateQueries({ queryKey: ["admin-conventions"] });
      // Also remove cached docs if any
      qc.removeQueries({ queryKey: ["convention-docs", id] });
    },
  });
}