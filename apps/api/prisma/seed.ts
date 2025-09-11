// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@gtc.local";
const PASS  = process.env.SEED_ADMIN_PASSWORD || "admin123";

async function main() {
  // keep a ping row for connectivity sanity
  await prisma.ping.create({ data: {} });

  const hash = await argon2.hash(PASS);
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
