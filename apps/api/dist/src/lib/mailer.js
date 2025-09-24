"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailer = void 0;
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
exports.mailer = nodemailer_1.default.createTransport({
    service: 'gmail', // Use Gmail service
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports like 587
    auth: {
        user: process.env.MAIL_USER, // Your Gmail address
        pass: process.env.MAIL_PASS, // Your Gmail app password (not regular password)
    },
});
// Simple email sending function without queues
async function sendEmail(options) {
    const { to, subject, html, text } = options;
    try {
        const info = await exports.mailer.sendMail({
            from: process.env.MAIL_FROM || "GTC <noreply@gtc.local>",
            to,
            subject,
            html,
            text: html ? undefined : text ?? " ",
        });
        console.log("[email] sent successfully:", info.messageId);
        return info;
    }
    catch (error) {
        console.error("[email] failed to send:", error);
        throw error;
    }
}
