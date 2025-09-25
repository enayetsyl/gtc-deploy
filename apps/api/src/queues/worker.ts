import { Worker, Job } from "bullmq";
import { sendEmail } from "../lib/mailer";
import type { EmailJob } from "./email";

const worker = new Worker<EmailJob>(
  "emails",
  async (job: Job<EmailJob>) => {
    const { to, subject, html, text } = job.data;
    await sendEmail({ to, subject, html, text });
  },
  { connection: { url: process.env.REDIS_URL! } }
);

worker.on("completed", (job) => console.log("[email] sent", job.id));
worker.on("failed", (job, err) => console.error("[email] failed", job?.id, err));
