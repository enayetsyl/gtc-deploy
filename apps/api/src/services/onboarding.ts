import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { sendEmail } from "../lib/mailer";
import { notifyUsers, notifyUser } from "./notifications";
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
      services: input.serviceIds && input.serviceIds.length ? { create: input.serviceIds.map((s: string) => ({ serviceId: s })) } : undefined,
    },
  });

  const link = `${env.webBaseUrl.replace(/\/$/, "")}/onboarding/points/${ob.onboardingToken}`;

  // send email to point
  await sendEmail({
    to: ob.email,
    subject: "Complete your GTC Point onboarding",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
        <p>Please open the link to complete your details and e-sign.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:8px 12px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">
            Complete onboarding
          </a>
        </p>
        <p style="font-size:13px;color:#666">If the button doesn't work, copy and paste the following URL into your browser:</p>
        <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      </div>
    `,
  });

  return ob;
}

type SubmitOnboardingPayload = {
  vatOrTaxNumber?: string;
  phone?: string;
  services?: string[];
  signature?: { url: string; key: string; originalName: string; mime: string };
};

export async function submitOnboardingForm(onboardingToken: string, payload: SubmitOnboardingPayload) {
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { onboardingToken } });
  if (!ob) throw new Error("Invalid token");
  if (ob.status !== "DRAFT") throw new Error("Onboarding not in DRAFT");
  if (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date()) throw new Error("Token expired");

  let signaturePath: string | undefined = ob.signaturePath ?? undefined;
  let signatureKey: string | undefined = undefined;
  if (payload.signature) {
    signaturePath = payload.signature.url; // Store UploadThing URL
    signatureKey = payload.signature.key; // Store UploadThing key
  }

  await (prisma as any).pointOnboarding.update({
    where: { id: ob.id },
    data: {
      vatOrTaxNumber: payload.vatOrTaxNumber ?? ob.vatOrTaxNumber,
      phone: payload.phone ?? ob.phone,
      signaturePath,
      // signatureUploadthingKey: signatureKey, // TODO: Add after migration
      status: "SUBMITTED",
      submittedAt: new Date(),
      services:
        ob.includeServices && payload.services && payload.services.length
          ? { deleteMany: {}, create: payload.services.map((s) => ({ serviceId: s })) }
          : undefined,
    },
  });

  // notify admins (all users with role ADMIN) and sector owners
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });
  const owners = await prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: ob.sectorId }, select: { id: true, email: true } });

  const adminIds = admins.map((a: { id: string }) => a.id);
  const ownerIds = owners.map((o: { id: string }) => o.id);

  const adminAndOwners = Array.from(new Set([...adminIds, ...ownerIds]));

  const adminLink = `${env.webBaseUrl.replace(/\/$/, "")}/admin/points-onboarding/${ob.id}`;

  if (adminAndOwners.length) {
    await notifyUsers(adminAndOwners, {
      type: "GENERIC",
      subject: "New GTC Point onboarding submitted",
      contentHtml: `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
          <p>Point <strong>${ob.name}</strong> &lt;${ob.email}&gt; submitted onboarding details.</p>
          <p>
            <a href="${adminLink}" style="display:inline-block;padding:10px 16px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">Review onboarding</a>
          </p>
        </div>
      `,
      email: {
        subject: "New GTC Point onboarding submitted",
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
            <p>Point <strong>${ob.name}</strong> &lt;${ob.email}&gt; submitted onboarding details.</p>
            <p>
              <a href="${adminLink}" style="display:inline-block;padding:8px 12px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">Review onboarding</a>
            </p>
            <p style="font-size:13px;color:#666">If the button doesn't work, copy and paste the following URL into your browser:</p>
            <p style="word-break:break-all"><a href="${adminLink}">${adminLink}</a></p>
          </div>
        `,
      },
    });
  }
}

export async function approveOnboarding(id: string, adminUserId: string) {
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { id }, include: { services: true } });
  if (!ob) throw new Error("Not found");
  if (ob.status !== "SUBMITTED") throw new Error("Invalid state");

  // Use upsert to either create or update the GtcPoint
  const point = await prisma.gtcPoint.upsert({
    where: { email: ob.email },
    update: {
      name: ob.name,
      sectorId: ob.sectorId
    },
    create: {
      name: ob.name,
      email: ob.email,
      sectorId: ob.sectorId
    }
  });

  if (ob.includeServices && ob.services && ob.services.length) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const s of ob.services as any[]) {
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
  await sendEmail({
    to: ob.email,
    subject: "Your GTC Point registration link",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
        <p>Your onboarding was approved. Complete your account by setting a password.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:8px 12px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">
            Complete registration
          </a>
        </p>
        <p style="font-size:13px;color:#666">If the button doesn't work, copy and paste the following URL into your browser:</p>
        <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      </div>
    `,
  });

  // notify admins and sector owners about approval
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  const owners = await prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: ob.sectorId }, select: { id: true } });
  const recipients = Array.from(new Set([
    ...admins.map((a: { id: string }) => a.id),
    ...owners.map((o: { id: string }) => o.id),
  ]));

  // fetch service names if any
  let serviceNames: string[] = [];
  if (ob.includeServices && ob.services && ob.services.length) {
    const serviceIds = (ob.services as any[]).map((s: any) => s.serviceId);
    const services = await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { name: true } });
    serviceNames = services.map((s: { name: string }) => s.name);
  }

  if (recipients.length) {
    const adminPointUrl = `${env.webBaseUrl.replace(/\/$/, "")}/admin/points/${point.id}`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
        <p>GTC Point <strong>${ob.name}</strong> (&lt;${ob.email}&gt;) was approved by admin.</p>
        ${serviceNames.length ? `<p>Enabled services: <strong>${serviceNames.join(", ")}</strong></p>` : ""}
        <p>
          <a href="${adminPointUrl}" style="display:inline-block;padding:8px 20px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">Open point</a>
        </p>
        <p style="font-size:13px;color:#666">If the button doesn't work, copy and paste the following URL into your browser:</p>
        <p style="word-break:break-all"><a href="${adminPointUrl}">${adminPointUrl}</a></p>
      </div>
    `;
    await notifyUsers(recipients, { type: "GENERIC", subject: "GTC Point approved", contentHtml: html, email: { subject: "GTC Point approved", html } });
  }

  return { pointId: point.id };
}

export async function declineOnboarding(id: string, adminUserId: string) {
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { id } });
  if (!ob) throw new Error("Not found");
  if (ob.status !== "SUBMITTED") throw new Error("Invalid state");

  await (prisma as any).pointOnboarding.update({ where: { id: ob.id }, data: { status: "DECLINED", approvedByUserId: adminUserId, approvedAt: new Date() } });
  await sendEmail({ to: ob.email, subject: "Your onboarding was declined", html: `<p>Your onboarding request was declined by admin.</p>` });

  // notify admins and owners that it was declined
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  const owners = await prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: ob.sectorId }, select: { id: true } });
  const recipients = Array.from(
    new Set([
      ...admins.map((a: { id: string }) => a.id),
      ...owners.map((o: { id: string }) => o.id),
    ])
  );
  if (recipients.length) {
    await notifyUsers(recipients, { type: "GENERIC", subject: "GTC Point onboarding declined", contentHtml: `<p>Onboarding for <strong>${ob.name}</strong> (&lt;${ob.email}&gt;) was declined by admin.</p>` });
  }
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
  const recipients = Array.from(new Set([...admins.map((a: { id: string }) => a.id), ...owners.map((o: { id: string }) => o.id)]));
  if (recipients.length) {
    await notifyUsers(recipients, { type: "GENERIC", subject: "New GTC Point registered", contentHtml: `<p>${ob.name} (${ob.email}) completed registration.</p>` });
  }

  // send welcome email to the newly created user
  await sendEmail({ to: user.email, subject: "Welcome — your account is ready", html: `<p>Your account has been created and you can now login with your email.</p>` });

  // create an in-app welcome notification for the new user
  await notifyUser({ userId: user.id, subject: "Welcome to GTC", contentHtml: `<p>Welcome ${user.name}! Your account is now active.</p>` });

  return user;
}

export default {
  createOnboardingLink,
  submitOnboardingForm,
  approveOnboarding,
  declineOnboarding,
  completeRegistration,
};
