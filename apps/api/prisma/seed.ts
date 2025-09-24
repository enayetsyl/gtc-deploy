import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  // Admin (kept if you already had this)
  await prisma.user.upsert({
    where: { email: "fabriziogtcadmin@yopmail.com" },
    update: {},
    create: {
      email: "fabriziogtcadmin@yopmail.com",
      name: "Admin",
      passwordHash: await argon2.hash("admin123"),
      role: "admin".toUpperCase() as any, // or "ADMIN" if your enum is uppercase
    },
  });

  // Second Admin
  await prisma.user.upsert({
    where: { email: "enayetflweb@gmail.com" },
    update: {},
    create: {
      email: "enayetflweb@gmail.com",
      name: "Admin",
      passwordHash: await argon2.hash("admin123"),
      role: "admin".toUpperCase() as any, // or "ADMIN" if your enum is uppercase
    },
  });

  // // One sector to attach the owner/point
  // const training = await prisma.sector.upsert({
  //   where: { name: "Training" },
  //   update: {},
  //   create: { name: "Training" },
  // });

  // // Sector Owner login
  // await prisma.user.upsert({
  //   where: { email: "owner.training@gtc.local" },
  //   update: {},
  //   create: {
  //     email: "owner.training@gtc.local",
  //     name: "Valentina Owner",
  //     passwordHash: await argon2.hash("owner123"),
  //     role: "SECTOR_OWNER" as any,
  //     sectorId: training.id,
  //   },
  // });

  // // A GTC point + user (handy for /point/leads testing)
  // const point = await prisma.gtcPoint.upsert({
  //   where: { email: "point.training@gtc.local" },
  //   update: {},
  //   create: {
  //     name: "Training Point A",
  //     email: "point.training@gtc.local",
  //     sectorId: training.id,
  //   },
  // });

  // await prisma.user.upsert({
  //   where: { email: "user.pointA@gtc.local" },
  //   update: {},
  //   create: {
  //     email: "user.pointA@gtc.local",
  //     name: "Point User A",
  //     passwordHash: await argon2.hash("point123"),
  //     role: "GTC_POINT" as any,
  //     gtcPointId: point.id,
  //   },
  // });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
