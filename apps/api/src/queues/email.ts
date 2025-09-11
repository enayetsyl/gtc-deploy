import { Queue } from "bullmq";

export type EmailJob = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

export const emailQueue = new Queue<EmailJob>("emails", {
  connection: { url: process.env.REDIS_URL! },
});

export async function enqueueEmail(data: EmailJob) {
  return emailQueue.add("send", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}
