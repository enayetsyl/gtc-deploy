"use client";
import { api } from "@/lib/axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";


export type Lead = {
  id: string;
  sectorId: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  createdAt: string;
  attachments: LeadAttachment[];
};


export type LeadAttachment = {
  id: string;
  fileName: string;
  path: string;
  mime: string;
  size: number;
  checksum: string;
};


export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};


// ---- Public submit hook (no auth required) ----
export function useSubmitLeadPublic() {
  return useMutation({
    mutationFn: async (params: {
      sectorId: string;
      name: string;
      email?: string;
      phone?: string;
      message?: string;
      gdprAgree: boolean;
      files: File[];
      onUploadProgress?: (percent: number) => void;
    }) => {
      const fd = new FormData();
      fd.set("sectorId", params.sectorId);
      fd.set("name", params.name);
      if (params.email) fd.set("email", params.email);
      if (params.phone) fd.set("phone", params.phone);
      if (params.message) fd.set("message", params.message);
      fd.set("gdprAgree", String(params.gdprAgree));
      for (const f of params.files) fd.append("files", f);


      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/leads/public`;
      await axios.post(url, fd, {
        withCredentials: false,
        onUploadProgress: (p) => {
          if (!params.onUploadProgress || !p.total) return;
          const pct = Math.round((p.loaded / p.total) * 100);
          params.onUploadProgress(pct);
        },
        headers: { Accept: "application/json" },
      });
    },
  });
}

// ---- Authed list hooks ----
export function useLeadsMe(page: number, pageSize: number) {
  return useQuery<Paginated<Lead>, Error>({
    queryKey: ["leads", "me", { page, pageSize }],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Lead>>("/api/me/leads", {
        params: { page, pageSize },
      });
      return data;
    },

  });
}

export function useLeadsAdmin(page: number, pageSize: number, sectorId?: string) {
  return useQuery<Paginated<Lead>, Error>({
    queryKey: ["leads", "admin", { page, pageSize, sectorId }],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Lead>>("/api/admin/leads", {
        params: { page, pageSize, sectorId },
      });
      return data;
    },
    enabled: true,
  });
}


export function useDownloadLeadAttachment() {
  return useMutation({
    mutationFn: async (args: { leadId: string; attId: string }) => {
      const { data } = await api.get(`/api/leads/${args.leadId}/attachments/${args.attId}/download`, {
        responseType: "blob",
      });
      return data as Blob;
    },
  });
}























