"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Choose provider at runtime. Default is nodemailer+Gmail for local dev.
const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || "gmail").toLowerCase();
// Reusable Gmail transporter (kept for dev/local or if explicitly chosen)
const gmailTransporter = nodemailer_1.default.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});
// Helper: normalize recipients
function normalizeRecipients(to) {
    const list = Array.isArray(to) ? to : to.split(",").map((s) => s.trim()).filter(Boolean);
    return list.map((email) => ({ Email: email }));
}
// Simple email sending function without queues
async function sendEmail(options) {
    const { to, subject, html, text } = options;
    const fromEmail = (process.env.MJ_SENDER_EMAIL || process.env.MAIL_FROM?.match(/<(.+)>/)?.[1] || process.env.MAIL_USER || "noreply@gtc.local");
    const fromName = (process.env.MJ_SENDER_NAME || process.env.MAIL_FROM?.replace(/<.*>/, "").trim() || "GTC");
    try {
        if (MAIL_PROVIDER === "mailjet") {
            // Send via Mailjet HTTP API (v3.1)
            const apiKey = process.env.MJ_APIKEY_PUBLIC;
            const apiSecret = process.env.MJ_APIKEY_PRIVATE;
            if (!apiKey || !apiSecret) {
                throw new Error("Mailjet API keys missing. Set MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE.");
            }
            const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
            const payload = {
                Messages: [
                    {
                        From: { Email: fromEmail, Name: fromName },
                        To: normalizeRecipients(to),
                        Subject: subject,
                        TextPart: html ? undefined : (text ?? " "),
                        HTMLPart: html,
                        CustomID: "gtc-mail",
                    },
                ],
            };
            const res = await fetch("https://api.mailjet.com/v3.1/send", {
                method: "POST",
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const textBody = await res.text();
                throw new Error(`Mailjet API error: ${res.status} ${res.statusText} — ${textBody}`);
            }
            const json = await res.json();
            console.log("[email] sent via Mailjet:", JSON.stringify(json));
            return json;
        }
        // Default: send via Gmail SMTP (nodemailer)
        const info = await gmailTransporter.sendMail({
            from: process.env.MAIL_FROM || "GTC <noreply@gtc.local>",
            to,
            subject,
            html,
            text: html ? undefined : text ?? " ",
        });
        console.log("[email] sent via Gmail:", info.messageId);
        return info;
    }
    catch (error) {
        console.error("[email] failed to send:", error);
        throw error;
    }
}
