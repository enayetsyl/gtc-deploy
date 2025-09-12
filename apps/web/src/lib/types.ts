export type ConventionStatus = "NEW" | "UPLOADED" | "APPROVED" | "DECLINED";


export type GtcPoint = { id: string; name: string; email: string; sectorId: string };
export type Sector = { id: string; name: string };


export type ConventionDocument = {
id: string;
conventionId: string;
kind: "PREFILL" | "SIGNED" | "OTHER";
fileName: string;
path: string;
mime: string;
size: number;
checksum: string;
uploadedById: string | null;
createdAt: string;
};


export type Convention = {
id: string;
gtcPointId: string;
sectorId: string;
status: ConventionStatus;
internalSalesRep?: string | null;
createdAt: string;
updatedAt: string;
gtcPoint?: GtcPoint;
sector?: Sector;
documents?: ConventionDocument[];
};