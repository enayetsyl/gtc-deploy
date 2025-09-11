"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// prisma/seed.ts
const client_1 = require("@prisma/client");
const argon2_1 = __importDefault(require("argon2"));
const prisma = new client_1.PrismaClient();
const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@gtc.local";
const PASS = process.env.SEED_ADMIN_PASSWORD || "admin123";
async function main() {
    // keep a ping row for connectivity sanity
    await prisma.ping.create({ data: {} });
    const hash = await argon2_1.default.hash(PASS);
    await prisma.user.upsert({
        where: { email: EMAIL },
        update: {},
        create: {
            email: EMAIL,
            passwordHash: hash,
            name: "Admin",
            role: "ADMIN",
        },
    });
    console.log(`Seeded admin -> ${EMAIL} / ${PASS}`);
}
main().finally(() => prisma.$disconnect());
