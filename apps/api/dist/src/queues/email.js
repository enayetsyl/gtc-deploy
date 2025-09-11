"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = void 0;
exports.enqueueEmail = enqueueEmail;
const bullmq_1 = require("bullmq");
exports.emailQueue = new bullmq_1.Queue("emails", {
    connection: { url: process.env.REDIS_URL },
});
async function enqueueEmail(data) {
    return exports.emailQueue.add("send", data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 100,
    });
}
