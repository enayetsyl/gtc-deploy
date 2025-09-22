"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOnboardingLink = createOnboardingLink;
exports.submitOnboardingForm = submitOnboardingForm;
exports.approveOnboarding = approveOnboarding;
exports.declineOnboarding = declineOnboarding;
exports.completeRegistration = completeRegistration;
const prisma_1 = require("../lib/prisma");
const node_crypto_1 = require("node:crypto");
const email_1 = require("../queues/email");
const provider_1 = require("../storage/provider");
const notifications_1 = require("./notifications");
const env_1 = require("../config/env");
function token(len = 24) {
    return (0, node_crypto_1.randomBytes)(len).toString("hex");
}
async function createOnboardingLink(input) {
    const onboardingToken = token();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
    const ob = await prisma_1.prisma.pointOnboarding.create({
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
    const link = `${env_1.env.webBaseUrl.replace(/\/$/, "")}/onboarding/points/${ob.onboardingToken}`;
    // send email to point
    await (0, email_1.enqueueEmail)({
        to: ob.email,
        subject: "Complete your GTC Point onboarding",
        html: `<p>Please open the link to complete your details and e-sign: <a href=\"${link}\">${link}</a></p>`,
    });
    return ob;
}
async function submitOnboardingForm(onboardingToken, payload) {
    const ob = await prisma_1.prisma.pointOnboarding.findUnique({ where: { onboardingToken } });
    if (!ob)
        throw new Error("Invalid token");
    if (ob.status !== "DRAFT")
        throw new Error("Onboarding not in DRAFT");
    if (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date())
        throw new Error("Token expired");
    let signaturePath = ob.signaturePath ?? undefined;
    if (payload.signature) {
        const stored = await provider_1.storage.put(payload.signature);
        signaturePath = stored.path;
    }
    await prisma_1.prisma.pointOnboarding.update({
        where: { id: ob.id },
        data: {
            vatOrTaxNumber: payload.vatOrTaxNumber ?? ob.vatOrTaxNumber,
            phone: payload.phone ?? ob.phone,
            signaturePath,
            status: "SUBMITTED",
            submittedAt: new Date(),
            services: ob.includeServices && payload.services && payload.services.length
                ? { deleteMany: {}, create: payload.services.map((s) => ({ serviceId: s })) }
                : undefined,
        },
    });
    // notify admins (all users with role ADMIN) and sector owners
    const admins = await prisma_1.prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });
    const owners = await prisma_1.prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: ob.sectorId }, select: { id: true, email: true } });
    const adminIds = admins.map((a) => a.id);
    const ownerIds = owners.map((o) => o.id);
    const adminAndOwners = Array.from(new Set([...adminIds, ...ownerIds]));
    const adminLink = `${env_1.env.webBaseUrl.replace(/\/$/, "")}/admin/points-onboarding/${ob.id}`;
    if (adminAndOwners.length) {
        await (0, notifications_1.notifyUsers)(adminAndOwners, {
            type: "GENERIC",
            subject: "New GTC Point onboarding submitted",
            contentHtml: `<p>Point <strong>${ob.name}</strong> &lt;${ob.email}&gt; submitted onboarding details. Review: <a href=\"${adminLink}\">Review onboarding</a></p>`,
            email: { subject: "New GTC Point onboarding submitted", html: `<p>Point <strong>${ob.name}</strong> &lt;${ob.email}&gt; submitted onboarding details. Review: <a href=\"${adminLink}\">${adminLink}</a></p>` },
        });
    }
}
async function approveOnboarding(id, adminUserId) {
    const ob = await prisma_1.prisma.pointOnboarding.findUnique({ where: { id }, include: { services: true } });
    if (!ob)
        throw new Error("Not found");
    if (ob.status !== "SUBMITTED")
        throw new Error("Invalid state");
    const point = await prisma_1.prisma.gtcPoint.create({ data: { name: ob.name, email: ob.email, sectorId: ob.sectorId } });
    if (ob.includeServices && ob.services && ob.services.length) {
        await prisma_1.prisma.$transaction(async (tx) => {
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
    await prisma_1.prisma.pointOnboarding.update({
        where: { id: ob.id },
        data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: adminUserId, gtcPointId: point.id, registrationToken, tokenExpiresAt: expires },
    });
    const link = `${env_1.env.webBaseUrl.replace(/\/$/, "")}/onboarding/points/register/${registrationToken}`;
    await (0, email_1.enqueueEmail)({ to: ob.email, subject: "Your GTC Point registration link", html: `<p>Your onboarding was approved. Complete your account by setting password: <a href=\"${link}\">${link}</a></p>` });
    // notify admins and sector owners about approval
    const admins = await prisma_1.prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const owners = await prisma_1.prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: ob.sectorId }, select: { id: true } });
    const recipients = Array.from(new Set([
        ...admins.map((a) => a.id),
        ...owners.map((o) => o.id),
    ]));
    // fetch service names if any
    let serviceNames = [];
    if (ob.includeServices && ob.services && ob.services.length) {
        const serviceIds = ob.services.map((s) => s.serviceId);
        const services = await prisma_1.prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { name: true } });
        serviceNames = services.map((s) => s.name);
    }
    if (recipients.length) {
        const html = `<p>GTC Point <strong>${ob.name}</strong> (&lt;${ob.email}&gt;) was approved by admin.</p>${serviceNames.length ? `<p>Enabled services: <strong>${serviceNames.join(", ")}</strong></p>` : ""}<p>View point: <a href=\"${env_1.env.webBaseUrl.replace(/\/$/, "")}/admin/points/${point.id}\">Open point</a></p>`;
        await (0, notifications_1.notifyUsers)(recipients, { type: "GENERIC", subject: "GTC Point approved", contentHtml: html, email: { subject: "GTC Point approved", html } });
    }
    return { pointId: point.id };
}
async function declineOnboarding(id, adminUserId) {
    const ob = await prisma_1.prisma.pointOnboarding.findUnique({ where: { id } });
    if (!ob)
        throw new Error("Not found");
    if (ob.status !== "SUBMITTED")
        throw new Error("Invalid state");
    await prisma_1.prisma.pointOnboarding.update({ where: { id: ob.id }, data: { status: "DECLINED", approvedByUserId: adminUserId, approvedAt: new Date() } });
    await (0, email_1.enqueueEmail)({ to: ob.email, subject: "Your onboarding was declined", html: `<p>Your onboarding request was declined by admin.</p>` });
    // notify admins and owners that it was declined
    const admins = await prisma_1.prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const owners = await prisma_1.prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: ob.sectorId }, select: { id: true } });
    const recipients = Array.from(new Set([
        ...admins.map((a) => a.id),
        ...owners.map((o) => o.id),
    ]));
    if (recipients.length) {
        await (0, notifications_1.notifyUsers)(recipients, { type: "GENERIC", subject: "GTC Point onboarding declined", contentHtml: `<p>Onboarding for <strong>${ob.name}</strong> (&lt;${ob.email}&gt;) was declined by admin.</p>` });
    }
}
async function completeRegistration(registrationToken, passwordHash) {
    const ob = await prisma_1.prisma.pointOnboarding.findFirst({ where: { registrationToken } });
    if (!ob)
        throw new Error("Invalid token");
    if (ob.status !== "APPROVED")
        throw new Error("Not approved");
    if (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date())
        throw new Error("Token expired");
    if (!ob.gtcPointId)
        throw new Error("Missing gtcPointId");
    const user = await prisma_1.prisma.user.create({ data: { email: ob.email, name: ob.name, passwordHash, role: "GTC_POINT", gtcPointId: ob.gtcPointId } });
    await prisma_1.prisma.pointOnboarding.update({ where: { id: ob.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    // Notify admins and sector owners
    const admins = await prisma_1.prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const point = await prisma_1.prisma.gtcPoint.findUnique({ where: { id: ob.gtcPointId } });
    const owners = point ? await prisma_1.prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: point.sectorId }, select: { id: true } }) : [];
    const recipients = Array.from(new Set([...admins.map((a) => a.id), ...owners.map((o) => o.id)]));
    if (recipients.length) {
        await (0, notifications_1.notifyUsers)(recipients, { type: "GENERIC", subject: "New GTC Point registered", contentHtml: `<p>${ob.name} (${ob.email}) completed registration.</p>` });
    }
    // send welcome email to the newly created user
    await (0, email_1.enqueueEmail)({ to: user.email, subject: "Welcome — your account is ready", html: `<p>Your account has been created and you can now login with your email.</p>` });
    // create an in-app welcome notification for the new user
    await (0, notifications_1.notifyUser)({ userId: user.id, subject: "Welcome to GTC", contentHtml: `<p>Welcome ${user.name}! Your account is now active.</p>` });
    return user;
}
exports.default = {
    createOnboardingLink,
    submitOnboardingForm,
    approveOnboarding,
    declineOnboarding,
    completeRegistration,
};
