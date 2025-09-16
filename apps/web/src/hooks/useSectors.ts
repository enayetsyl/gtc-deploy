"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";


export type Sector = { id: string; name: string };

type RawSector = Sector;
type ApiResponse = RawSector[] | { items?: RawSector[] };

export function useSectorsPublic() {
return useQuery({
queryKey: ["sectors", "public"],
queryFn: async () => {
const url = `${process.env.NEXT_PUBLIC_API_URL}/api/sectors/public`;
try {
const { data } = await axios.get<ApiResponse>(url);
const items: RawSector[] = Array.isArray(data) ? data : data?.items ?? [];
return items.map((s) => ({ id: s.id, name: s.name }));
      } catch {
return [] as Sector[]; // fallback: no list (manual entry)
}
},
staleTime: 5 * 60 * 1000,
});
}