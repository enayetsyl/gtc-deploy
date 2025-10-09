import { prisma } from "../src/lib/prisma";
// stub notifications to avoid socket/email side-effects in smoke test
import * as notifications from "../src/services/notifications";
import { createOnboardingLink, submitAgreement } from "../src/services/onboarding";

// Replace notify functions with no-ops during test
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(notifications as any).notifyUsers = async () => [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(notifications as any).notifyUser = async (_: any) => null;
import { randomBytes } from "node:crypto";

async function run() {
  console.log("Starting smoke test: submitAgreement");
  // create a sector
  const sectorName = `smoke-sector-${Date.now()}`;
  const sector = await prisma.sector.create({ data: { name: sectorName } });

  // create some services
  const svc1 = await prisma.service.create({ data: { code: "S1", name: "Service 1", sectorId: sector.id } });
  const svc2 = await prisma.service.create({ data: { code: "S2", name: "Service 2", sectorId: sector.id } });

  // create an onboarding invite
  const onb = await prisma.pointOnboarding.create({ data: { sectorId: sector.id, email: `smoke+${Date.now()}@example.com`, name: "Smoke Test", includeServices: false, onboardingToken: randomBytes(12).toString("hex"), tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60) } });

  // submit agreement
  const payload = {
    companyName: "Smoke Co",
    taxCodeOrVat: "TAX123",
    contactEmail: "contact@smoke.example",
    placeSigned: "Townsville",
    dateSigned: new Date().toISOString(),
    services: [svc1.id, svc2.id],
    signature: { url: "https://example.com/sign.png", key: "sign-1", originalName: "sig.png", mime: "image/png" },
  } as any;

  const agreement = await submitAgreement(onb.onboardingToken, payload);
  console.log("Agreement created id=", agreement.id);

  const dbAgreement = await prisma.pointAgreement.findUnique({ where: { id: agreement.id }, include: { services: true } });
  if (!dbAgreement) throw new Error("Agreement not found in DB");
  if (!dbAgreement.services || dbAgreement.services.length !== 2) throw new Error("Agreement services missing");

  console.log("Smoke test PASS — agreement and services persisted");

  // cleanup
  await prisma.pointAgreementService.deleteMany({ where: { agreementId: agreement.id } });
  await prisma.pointAgreement.delete({ where: { id: agreement.id } });
  await prisma.pointOnboarding.delete({ where: { id: onb.id } });
  await prisma.service.deleteMany({ where: { sectorId: sector.id } });
  await prisma.sector.delete({ where: { id: sector.id } });

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Smoke test FAILED:", err);
  prisma.$disconnect().finally(() => process.exit(1));
});
