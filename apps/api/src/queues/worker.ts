import { Worker, Job } from "bullmq";
import { mailer } from "../lib/mailer";
import type { EmailJob } from "./email";

const worker = new Worker<EmailJob>(
  "emails",
  async (job: Job<EmailJob>) => {
    const { to, subject, html, text } = job.data;
    await mailer.sendMail({
      from: process.env.MAIL_FROM || "GTC <noreply@gtc.local>",
      to,
      subject,
      html,
      text: html ? undefined : text ?? " ",
    });
  },
  { connection: { url: process.env.REDIS_URL! } }
);

worker.on("completed", (job) => console.log("[email] sent", job.id));
worker.on("failed", (job, err) => console.error("[email] failed", job?.id, err));
