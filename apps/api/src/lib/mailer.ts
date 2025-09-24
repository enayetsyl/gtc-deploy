import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
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
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  const { to, subject, html, text } = options;

  try {
    const info = await mailer.sendMail({
      from: process.env.MAIL_FROM || "GTC <noreply@gtc.local>",
      to,
      subject,
      html,
      text: html ? undefined : text ?? " ",
    });

    console.log("[email] sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("[email] failed to send:", error);
    throw error;
  }
}
