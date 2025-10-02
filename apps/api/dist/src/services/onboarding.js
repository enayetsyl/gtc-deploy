"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOnboardingLink = createOnboardingLink;
exports.submitOnboardingForm = submitOnboardingForm;
exports.approveOnboarding = approveOnboarding;
exports.declineOnboarding = declineOnboarding;
exports.completeRegistration = completeRegistration;
const prisma_1 = require("../lib/prisma");
const node_crypto_1 = require("node:crypto");
const mailer_1 = require("../lib/mailer");
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
            // Validate serviceIds belong to the sector before creating onboarding service links
            services: input.serviceIds && input.serviceIds.length
                ? {
                    create: await Promise.all(input.serviceIds.map(async (s) => {
                        const svc = await prisma_1.prisma.service.findUnique({ where: { id: s } });
                        if (!svc)
                            throw new Error(`Invalid service id: ${s}`);
                        if (svc.sectorId !== input.sectorId)
                            throw new Error(`Service ${s} does not belong to sector ${input.sectorId}`);
                        return { serviceId: s };
                    }))
                }
                : undefined,
        },
    });
    const link = `${env_1.env.webBaseUrl.replace(/\/$/, "")}/onboarding/points/${ob.onboardingToken}`;
    // send email to point
    await (0, mailer_1.sendEmail)({
        to: ob.email,
        subject: "Completa l'onboarding del tuo Punto GTC",
        html: `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
        <p>Apri il link per completare i tuoi dati e firmare elettronicamente.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:8px 12px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">
            Completa l'onboarding
          </a>
        </p>
        <p style="font-size:13px;color:#666">Se il pulsante non funziona, copia e incolla il seguente URL nel tuo browser:</p>
        <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      </div>
    `,
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
    let signatureKey = undefined;
    if (payload.signature) {
        signaturePath = payload.signature.url; // Store UploadThing URL
        signatureKey = payload.signature.key; // Store UploadThing key
    }
    await prisma_1.prisma.pointOnboarding.update({
        where: { id: ob.id },
        data: {
            vatOrTaxNumber: payload.vatOrTaxNumber ?? ob.vatOrTaxNumber,
            phone: payload.phone ?? ob.phone,
            signaturePath,
            // signatureUploadthingKey: signatureKey, // TODO: Add after migration
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
            subject: "Nuova richiesta di onboarding Punto GTC",
            contentHtml: `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
          <p>Il Punto <strong>${ob.name}</strong> &lt;${ob.email}&gt; ha inviato i dettagli di onboarding.</p>
          <p>
            <a href="${adminLink}" style="display:inline-block;padding:10px 16px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">Rivedi onboarding</a>
          </p>
        </div>
      `,
            email: {
                subject: "Nuova richiesta di onboarding Punto GTC",
                html: `
          <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
            <p>Il Punto <strong>${ob.name}</strong> &lt;${ob.email}&gt; ha inviato i dettagli di onboarding.</p>
            <p>
              <a href="${adminLink}" style="display:inline-block;padding:8px 12px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">Rivedi onboarding</a>
            </p>
            <p style="font-size:13px;color:#666">Se il pulsante non funziona, copia e incolla il seguente URL nel tuo browser:</p>
            <p style="word-break:break-all"><a href="${adminLink}">${adminLink}</a></p>
          </div>
        `,
            },
        });
    }
}
async function approveOnboarding(id, adminUserId) {
    const ob = await prisma_1.prisma.pointOnboarding.findUnique({ where: { id }, include: { services: true } });
    if (!ob)
        throw new Error("Not found");
    if (ob.status !== "SUBMITTED")
        throw new Error("Invalid state");
    // Use upsert to either create or update the GtcPoint
    const point = await prisma_1.prisma.gtcPoint.upsert({
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
        await prisma_1.prisma.$transaction(async (tx) => {
            for (const s of ob.services) {
                // Ensure service belongs to the onboarding/point sector
                const svc = await tx.service.findUnique({ where: { id: s.serviceId } });
                if (!svc)
                    throw new Error(`Invalid service id: ${s.serviceId}`);
                if (svc.sectorId !== point.sectorId)
                    throw new Error(`Service ${s.serviceId} does not belong to sector ${point.sectorId}`);
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
    await (0, mailer_1.sendEmail)({
        to: ob.email,
        subject: "Link per la registrazione del tuo Punto GTC",
        html: `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
        <p>La tua richiesta di onboarding è stata approvata. Completa il tuo account impostando una password.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:8px 12px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">
            Completa la registrazione
          </a>
        </p>
        <p style="font-size:13px;color:#666">Se il pulsante non funziona, copia e incolla il seguente URL nel tuo browser:</p>
        <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      </div>
    `,
    });
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
        const adminPointUrl = `${env_1.env.webBaseUrl.replace(/\/$/, "")}/admin/points/${point.id}`;
        const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111">
        <p>Il Punto GTC <strong>${ob.name}</strong> (&lt;${ob.email}&gt;) è stato approvato dall'amministratore.</p>
        ${serviceNames.length ? `<p>Servizi abilitati: <strong>${serviceNames.join(", ")}</strong></p>` : ""}
        <p>
          <a href="${adminPointUrl}" style="display:inline-block;padding:8px 20px;background-color:#0052cc;color:#fff;text-decoration:none;border-radius:6px;">Apri il punto</a>
        </p>
        <p style="font-size:13px;color:#666">Se il pulsante non funziona, copia e incolla il seguente URL nel tuo browser:</p>
        <p style="word-break:break-all"><a href="${adminPointUrl}">${adminPointUrl}</a></p>
      </div>
    `;
        await (0, notifications_1.notifyUsers)(recipients, { type: "GENERIC", subject: "Punto GTC approvato", contentHtml: html, email: { subject: "Punto GTC approvato", html } });
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
    await (0, mailer_1.sendEmail)({ to: ob.email, subject: "La tua richiesta di onboarding è stata rifiutata", html: `<p>La tua richiesta di onboarding è stata rifiutata dall'amministratore.</p>` });
    // notify admins and owners that it was declined
    const admins = await prisma_1.prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const owners = await prisma_1.prisma.user.findMany({ where: { role: "SECTOR_OWNER", sectorId: ob.sectorId }, select: { id: true } });
    const recipients = Array.from(new Set([
        ...admins.map((a) => a.id),
        ...owners.map((o) => o.id),
    ]));
    if (recipients.length) {
        await (0, notifications_1.notifyUsers)(recipients, { type: "GENERIC", subject: "Onboarding Punto GTC rifiutato", contentHtml: `<p>L'onboarding per <strong>${ob.name}</strong> (&lt;${ob.email}&gt;) è stato rifiutato dall'amministratore.</p>` });
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
        await (0, notifications_1.notifyUsers)(recipients, { type: "GENERIC", subject: "Nuovo Punto GTC registrato", contentHtml: `<p>${ob.name} (${ob.email}) ha completato la registrazione.</p>` });
    }
    // send welcome email to the newly created user
    await (0, mailer_1.sendEmail)({ to: user.email, subject: "Benvenuto — il tuo account è pronto", html: `<p>Il tuo account è stato creato e ora puoi accedere con la tua email.</p>` });
    // create an in-app welcome notification for the new user
    await (0, notifications_1.notifyUser)({ userId: user.id, subject: "Benvenuto su GTC", contentHtml: `<p>Benvenuto ${user.name}! Il tuo account è ora attivo.</p>` });
    return user;
}
exports.default = {
    createOnboardingLink,
    submitOnboardingForm,
    approveOnboarding,
    declineOnboarding,
    completeRegistration,
};
