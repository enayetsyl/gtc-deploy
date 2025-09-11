"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2_1 = __importDefault(require("argon2"));
const prisma = new client_1.PrismaClient();
const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@gtc.local";
const PASS = process.env.SEED_ADMIN_PASSWORD || "admin123";
async function main() {
    // sanity row
    await prisma.ping.create({ data: {} });
    // admin user
    const hash = await argon2_1.default.hash(PASS);
    await prisma.user.upsert({
        where: { email: EMAIL },
        update: {},
        create: { email: EMAIL, passwordHash: hash, name: "Admin", role: client_1.Role.ADMIN },
    });
    // sectors
    const training = await prisma.sector.upsert({
        where: { name: "Training" },
        update: {},
        create: { name: "Training" },
    });
    const university = await prisma.sector.upsert({
        where: { name: "University" },
        update: {},
        create: { name: "University" },
    });
    // gtc points
    const pointA = await prisma.gtcPoint.upsert({
        where: { email: "point.a@gtc.local" },
        update: {},
        create: { name: "GTC Point A", email: "point.a@gtc.local", sectorId: training.id },
    });
    const pointB = await prisma.gtcPoint.upsert({
        where: { email: "point.b@gtc.local" },
        update: {},
        create: { name: "GTC Point B", email: "point.b@gtc.local", sectorId: university.id },
    });
    // services
    const svcA = await prisma.service.upsert({
        where: { code: "DOC_SIGN" },
        update: {},
        create: { code: "DOC_SIGN", name: "Document Signing" },
    });
    const svcB = await prisma.service.upsert({
        where: { code: "LEAD_INTAKE" },
        update: {},
        create: { code: "LEAD_INTAKE", name: "Lead Intake" },
    });
    // link a couple services to point A
    await prisma.gtcPointService.upsert({
        where: { gtcPointId_serviceId: { gtcPointId: pointA.id, serviceId: svcA.id } },
        update: {},
        create: { gtcPointId: pointA.id, serviceId: svcA.id, status: "ENABLED" },
    });
    await prisma.gtcPointService.upsert({
        where: { gtcPointId_serviceId: { gtcPointId: pointA.id, serviceId: svcB.id } },
        update: { status: "DISABLED" },
        create: { gtcPointId: pointA.id, serviceId: svcB.id, status: "DISABLED" },
    });
    console.log("Seeded admin, sectors, points, services.");
}
main().finally(() => prisma.$disconnect());
