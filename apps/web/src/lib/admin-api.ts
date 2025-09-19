import { api } from "./axios";

export type Sector = { id: string; name: string; createdAt: string; updatedAt: string };
export type Point = { id: string; name: string; email: string; sectorId: string; createdAt: string; updatedAt: string; sector?: Sector };
export type Service = { id: string; code: string; name: string; active: boolean; createdAt: string; updatedAt: string };
export type SectorOwner = {
  id: string;
  name: string;
  email: string;
  role: string;
  sectorId: string | null;
  createdAt: string;
  sectors: Sector[];
};

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

export async function createSectorOwner(payload: { name: string; email: string; sectorId?: string; sectorIds?: string[]; sendInvite?: boolean }) {
  const { data } = await api.post(`/api/admin/sectors/sector-owners`, payload);
  return data as { id: string; name: string; email: string; role: string; sectorId: string; createdAt: string };
}

export async function listSectorOwners(page = 1, pageSize = 50) {
  const { data } = await api.get<Paged<SectorOwner>>(`/api/admin/sectors/sector-owners`, { params: { page, pageSize } });
  return data;
}

export async function updateSectorOwner(id: string, payload: Partial<{ name: string; email: string; sectorIds: string[] }>) {
  const { data } = await api.patch<SectorOwner>(`/api/admin/sectors/sector-owners/${id}`, payload);
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

// Onboarding
export async function createPointOnboarding(payload: { sectorId: string; email: string; name: string; includeServices?: boolean; serviceIds?: string[] }) {
  const { data } = await api.post(`/api/admin/points/onboarding`, payload);
  return data;
}

export async function listPointOnboardings(status?: string) {
  const { data } = await api.get(`/api/admin/points/onboarding`, { params: { status } });
  return data;
}

// Me: my points for sector owners or point users
export async function listMyPoints(page = 1, pageSize = 200) {
  const { data } = await api.get(`/api/me/points`, { params: { page, pageSize } });
  return data as { items: Array<{ id: string; name: string; email: string; sectorId: string; createdAt: string }>; total: number; page: number; pageSize: number };
}

export async function approvePointOnboarding(id: string) {
  const { data } = await api.post(`/api/admin/points/onboarding/${id}/approve`);
  return data;
}

export async function declinePointOnboarding(id: string) {
  const { data } = await api.post(`/api/admin/points/onboarding/${id}/decline`);
  return data;
}

// Public
export async function getPublicOnboarding(token: string) {
  const { data } = await api.get(`/api/public/onboarding/points/${token}`);
  return data;
}

export async function submitPublicOnboarding(token: string, formData: FormData) {
  const { data } = await api.post(`/api/public/onboarding/points/${token}/submit`, formData, { headers: { "Content-Type": "multipart/form-data" } });
  return data;
}

export async function getRegistrationPrefill(regToken: string) {
  const { data } = await api.get(`/api/public/onboarding/points/register/${regToken}`);
  return data;
}

export async function completeRegistration(regToken: string, payload: { password: string; confirm: string }) {
  const { data } = await api.post(`/api/public/onboarding/points/register/${regToken}`, payload);
  return data;
}
