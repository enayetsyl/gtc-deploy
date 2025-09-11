// apps/api/src/queues/worker.ts
import { Worker } from "bullmq";
const connection = { connection: { url: process.env.REDIS_URL! } };
new Worker("emails", async (job) => { /* send email */ }, connection);
