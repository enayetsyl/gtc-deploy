// apps/api/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma._Ping.create({ data: {} });
await prisma.$disconnect();
