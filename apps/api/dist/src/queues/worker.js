"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const mailer_1 = require("../lib/mailer");
const worker = new bullmq_1.Worker("emails", async (job) => {
    const { to, subject, html, text } = job.data;
    await (0, mailer_1.sendEmail)({ to, subject, html, text });
}, { connection: { url: process.env.REDIS_URL } });
worker.on("completed", (job) => console.log("[email] sent", job.id));
worker.on("failed", (job, err) => console.error("[email] failed", job?.id, err));
