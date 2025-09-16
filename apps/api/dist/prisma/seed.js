"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2_1 = __importDefault(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    // Admin (kept if you already had this)
    await prisma.user.upsert({
        where: { email: "admin@gtc.local" },
        update: {},
        create: {
            email: "admin@gtc.local",
            name: "Admin",
            passwordHash: await argon2_1.default.hash("admin123"),
            role: "admin".toUpperCase(), // or "ADMIN" if your enum is uppercase
        },
    });
    // One sector to attach the owner/point
    const training = await prisma.sector.upsert({
        where: { name: "Training" },
        update: {},
        create: { name: "Training" },
    });
    // Sector Owner login
    await prisma.user.upsert({
        where: { email: "owner.training@gtc.local" },
        update: {},
        create: {
            email: "owner.training@gtc.local",
            name: "Valentina Owner",
            passwordHash: await argon2_1.default.hash("owner123"),
            role: "SECTOR_OWNER",
            sectorId: training.id,
        },
    });
    // A GTC point + user (handy for /point/leads testing)
    const point = await prisma.gtcPoint.upsert({
        where: { email: "point.training@gtc.local" },
        update: {},
        create: {
            name: "Training Point A",
            email: "point.training@gtc.local",
            sectorId: training.id,
        },
    });
    await prisma.user.upsert({
        where: { email: "user.pointA@gtc.local" },
        update: {},
        create: {
            email: "user.pointA@gtc.local",
            name: "Point User A",
            passwordHash: await argon2_1.default.hash("point123"),
            role: "GTC_POINT",
            gtcPointId: point.id,
        },
    });
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => prisma.$disconnect());
