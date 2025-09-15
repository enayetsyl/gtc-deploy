import { api } from "../axios";

export type ServiceLite = { id: string; code: string; name: string; active: boolean };
export type ServiceLink = {
  id: string;
  gtcPointId: string;
  serviceId: string;
  status: "ENABLED" | "DISABLED" | "PENDING_REQUEST";
  createdAt: string;
  updatedAt: string;
  service: ServiceLite;
};

export async function getPointServices() {
  const { data } = await api.get<{ items: ServiceLink[] }>("/api/point/services");
  return data.items;
}

export async function requestServiceByCode(serviceCode: string) {
  const { data } = await api.post<ServiceLink>("/api/point/services/requests", { serviceCode });
  return data;
}
export async function requestServiceById(serviceId: string) {
  const { data } = await api.post<ServiceLink>("/api/point/services/requests", { serviceId });
  return data;
}

export async function getAdminPointServices(pointId: string) {
  const { data } = await api.get<{ items: ServiceLink[] }>(`/api/admin/points/${pointId}/services`);
  return data.items;
}

export async function toggleAdminPointService(
  pointId: string,
  serviceId: string,
  action: "ENABLE" | "DISABLE"
) {
  const { data } = await api.patch<ServiceLink>(
    `/api/admin/points/${pointId}/services/${serviceId}`,
    { action }
  );
  return data;
}

/** Some installs return array for /api/admin/services; normalize to array */
export async function getAdminServicesAll() {
  const { data } = await api.get(`/api/admin/services`);
  return Array.isArray(data) ? (data as ServiceLite[]) : ((data?.items ?? []) as ServiceLite[]);
}
