import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "./env";

// Sends mail only when SMTP_URL and MAIL_FROM are set; otherwise does nothing.
let transport: Transporter | null = null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!ENV.smtpUrl || !ENV.mailFrom) return false;
  transport ??= nodemailer.createTransport(ENV.smtpUrl);
  await transport.sendMail({ from: ENV.mailFrom, to, subject, text });
  return true;
}
