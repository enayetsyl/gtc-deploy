"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/queues/worker.ts
const bullmq_1 = require("bullmq");
const connection = { connection: { url: process.env.REDIS_URL } };
new bullmq_1.Worker("emails", async (job) => { }, connection);
