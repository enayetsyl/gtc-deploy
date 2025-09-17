import { prisma } from "../lib/prisma";
import { randomBytes } from "node:crypto";
import { enqueueEmail } from "../queues/email";
import { storage } from "../storage/provider";
import { notifyUsers } from "./notifications";
import { env } from "../config/env";

function token(len = 24) {
  return randomBytes(len).toString("hex");
}

type CreateOnboardingInput = {
  sectorId: string;
  email: string;
  name: string;
  includeServices?: boolean;
  serviceIds?: string[];
};

export async function createOnboardingLink(input: CreateOnboardingInput) {
  const onboardingToken = token();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const ob = await (prisma as any).pointOnboarding.create({
    data: {
      sectorId: input.sectorId,
      email: input.email,
      name: input.name,
      includeServices: input.includeServices ?? false,
      onboardingToken,
      tokenExpiresAt: expires,
      services: input.serviceIds && input.serviceIds.length ? { create: input.serviceIds.map((s) => ({ serviceId: s })) } : undefined,
    },
  });

  const link = `${env.webBaseUrl.replace(/\/$/, "")}/onboarding/points/${ob.onboardingToken}`;

  // send email to point
  await enqueueEmail({
    to: ob.email,
    subject: "Complete your GTC Point onboarding",
    html: `<p>Please open the link to complete your details and e-sign: <a href=\"${link}\">${link}</a></p>`,
  });

  return ob;
}

type SubmitOnboardingPayload = {
  vatOrTaxNumber?: string;
  phone?: string;
  services?: string[];
  signature?: { buffer: Buffer; mime: string; originalName: string };
};

export async function submitOnboardingForm(onboardingToken: string, payload: SubmitOnboardingPayload) {
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { onboardingToken } });
  if (!ob) throw new Error("Invalid token");
  if (ob.status !== "DRAFT") throw new Error("Onboarding not in DRAFT");
  if (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date()) throw new Error("Token expired");

  let signaturePath: string | undefined = ob.signaturePath ?? undefined;
  if (payload.signature) {
    const stored = await storage.put(payload.signature);
    signaturePath = stored.path;
  }

  await (prisma as any).pointOnboarding.update({
    where: { id: ob.id },
    data: {
      vatOrTaxNumber: payload.vatOrTaxNumber ?? ob.vatOrTaxNumber,
      phone: payload.phone ?? ob.phone,
      signaturePath,
      status: "SUBMITTED",
      submittedAt: new Date(),
      services:
        ob.includeServices && payload.services && payload.services.length
          ? { deleteMany: {}, create: payload.services.map((s) => ({ serviceId: s })) }
          : undefined,
    },
  });

  // notify admins (all users with role ADMIN)
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await notifyUsers(admins.map((a) => a.id), {
    type: "GENERIC",
    subject: "New GTC Point onboarding submitted",
    contentHtml: `<p>Point: ${ob.name} (${ob.email}) submitted onboarding details.</p>`,
  });
}

export async function approveOnboarding(id: string, adminUserId: string) {
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { id }, include: { services: true } });
  if (!ob) throw new Error("Not found");
  if (ob.status !== "SUBMITTED") throw new Error("Invalid state");

  const point = await prisma.gtcPoint.create({ data: { name: ob.name, email: ob.email, sectorId: ob.sectorId } });

  if (ob.includeServices && ob.services && ob.services.length) {
    await prisma.$transaction(async (tx) => {
      for (const s of ob.services) {
        await tx.gtcPointService.upsert({
          where: { gtcPointId_serviceId: { gtcPointId: point.id, serviceId: s.serviceId } },
          update: { status: "ENABLED" },
          create: { gtcPointId: point.id, serviceId: s.serviceId, status: "ENABLED" },
        });
      }
    });
  }

  const registrationToken = token();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await (prisma as any).pointOnboarding.update({
    where: { id: ob.id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: adminUserId, gtcPointId: point.id, registrationToken, tokenExpiresAt: expires },
  });

  const link = `${env.webBaseUrl.replace(/\/$/, "")}/onboarding/points/register/${registrationToken}`;
  await enqueueEmail({ to: ob.email, subject: "Your GTC Point registration link", html: `<p>Your onboarding was approved. Complete your account by setting password: <a href=\"${link}\">${link}</a></p>` });

  return { pointId: point.id };
}

export async function declineOnboarding(id: string, adminUserId: string) {
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { id } });
  if (!ob) throw new Error("Not found");
  if (ob.status !== "SUBMITTED") throw new Error("Invalid state");

  await (prisma as any).pointOnboarding.update({ where: { id: ob.id }, data: { status: "DECLINED", approvedByUserId: adminUserId, approvedAt: new Date() } });
  await enqueueEmail({ to: ob.email, subject: "Your onboarding was declined", html: `<p>Your onboarding request was declined by admin.</p>` });
}

export async function completeRegistration(registrationToken: string, passwordHash: string) {
  const ob = await (prisma as any).pointOnboarding.findFirst({ where: { registrationToken } });
  if (!ob) throw new Error("Invalid token");
  if (ob.status !== "APPROVED") throw new Error("Not approved");
  if (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date()) throw new Error("Token expired");
  if (!ob.gtcPointId) throw new Error("Missing gtcPointId");

  const user = await prisma.user.create({ data: { email: ob.email, name: ob.name, passwordHash, role: "GTC_POINT", gtcPointId: ob.gtcPointId } });

  await (prisma as any).pointOnboarding.update({ where: { id: ob.id }, data: { status: "COMPLETED", completedAt: new Date() } });

  // Notify admins and sector owners
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  const point = await prisma.gtcPoint.findUnique({ where: { id: ob.gtcPointId } });
  const owners = point ? await prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: point.sectorId }, select: { id: true } }) : [];
  const recipients = Array.from(new Set([...admins.map((a) => a.id), ...owners.map((o) => o.id)]));
  if (recipients.length) {
    await notifyUsers(recipients, { type: "GENERIC", subject: "New GTC Point registered", contentHtml: `<p>${ob.name} (${ob.email}) completed registration.</p>` });
  }

  return user;
}

export default {
  createOnboardingLink,
  submitOnboardingForm,
  approveOnboarding,
  declineOnboarding,
  completeRegistration,
};
