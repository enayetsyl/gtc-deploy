import { api } from "./axios";

export type Sector = { id: string; name: string; createdAt: string; updatedAt: string };
export type Point = { id: string; name: string; email: string; sectorId: string; createdAt: string; updatedAt: string; sector?: Sector };
export type Service = { id: string; code: string; name: string; active: boolean; createdAt: string; updatedAt: string };

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function listSectors(page = 1, pageSize = 50) {
  const { data } = await api.get<Paged<Sector>>(`/api/admin/sectors`, { params: { page, pageSize } });
  return data;
}
export async function createSector(payload: { name: string }) {
  const { data } = await api.post<Sector>(`/api/admin/sectors`, payload);
  return data;
}
export async function updateSector(id: string, payload: { name: string }) {
  const { data } = await api.patch<Sector>(`/api/admin/sectors/${id}`, payload);
  return data;
}
export async function deleteSector(id: string) {
  const { data } = await api.delete(`/api/admin/sectors/${id}`);
  return data;
}

export async function listPoints(page = 1, pageSize = 50) {
  const { data } = await api.get<Paged<Point>>(`/api/admin/points`, { params: { page, pageSize } });
  return data;
}
export async function createPoint(payload: { name: string; email: string; sectorId: string }) {
  const { data } = await api.post<Point>(`/api/admin/points`, payload);
  return data;
}
export async function updatePoint(id: string, payload: Partial<{ name: string; email: string; sectorId: string }>) {
  const { data } = await api.patch<Point>(`/api/admin/points/${id}`, payload);
  return data;
}
export async function deletePoint(id: string) {
  const { data } = await api.delete(`/api/admin/points/${id}`);
  return data;
}

export async function listServices() {
  const { data } = await api.get<Service[]>(`/api/admin/services`);
  return data;
}
export async function createService(payload: { code: string; name: string; active?: boolean }) {
  const { data } = await api.post<Service>(`/api/admin/services`, payload);
  return data;
}
export async function updateService(id: string, payload: Partial<{ code: string; name: string; active: boolean }>) {
  const { data } = await api.patch<Service>(`/api/admin/services/${id}`, payload);
  return data;
}
export async function deleteService(id: string) {
  const { data } = await api.delete(`/api/admin/services/${id}`);
  return data;
}
