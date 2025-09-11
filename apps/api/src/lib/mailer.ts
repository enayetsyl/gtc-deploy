import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "127.0.0.1",
  port: Number(process.env.MAIL_PORT || 1025),
  secure: false,
});
