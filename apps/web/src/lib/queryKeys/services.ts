export const qk = {
  pointServices: ["point-services"] as const,
  adminPointServices: (pointId: string) => ["admin", "points", pointId, "services"] as const,
  adminServices: ["admin", "services"] as const,
};
