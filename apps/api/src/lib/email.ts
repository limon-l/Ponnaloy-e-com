import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface DeliveryResult {
  /** True only when an SMTP server accepted the message. */
  delivered: boolean;
  transport: "smtp" | "capture";
  messageId?: string;
  /** Text preview for captured (non-delivered) messages. */
  preview?: string;
}

let transport: Transporter | null = null;
const captured: MailMessage[] = [];

function getTransport(): Transporter {
  if (transport) return transport;

  if (config.email.smtpHost) {
    transport = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth: config.email.smtpUser
        ? { user: config.email.smtpUser, pass: config.email.smtpPassword }
        : undefined,
    });
  } else {
    // JSON transport performs real message serialisation but never contacts a
    // network. It keeps development and tests honest: nothing is "delivered".
    transport = nodemailer.createTransport({ jsonTransport: true });
  }

  return transport;
}

export async function sendMail(message: MailMessage): Promise<DeliveryResult> {
  const info = await getTransport().sendMail({
    from: config.email.from,
    ...message,
  });

  if (!config.email.smtpHost) {
    captured.push(message);
    return {
      delivered: false,
      transport: "capture",
      messageId: info.messageId,
      preview: message.text,
    };
  }

  return {
    delivered: true,
    transport: "smtp",
    messageId: info.messageId,
  };
}

export function getCapturedEmails(): MailMessage[] {
  return [...captured];
}

export function clearCapturedEmails(): void {
  captured.length = 0;
}

export function lastCapturedEmailFor(to: string): MailMessage | undefined {
  const normalised = to.toLowerCase();
  for (let index = captured.length - 1; index >= 0; index -= 1) {
    if (captured[index].to.toLowerCase() === normalised) return captured[index];
  }
  return undefined;
}

export function buildPasswordResetEmail(resetUrl: string): Omit<MailMessage, "to"> {
  return {
    subject: "Reset your Ponnaloy password",
    text: [
      "We received a request to reset your Ponnaloy password.",
      "",
      `Open this link to choose a new password: ${resetUrl}`,
      "",
      "The link expires in 30 minutes and can be used once.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;margin:0 0 12px">Reset your password</h1>
        <p style="color:#334155;line-height:1.6">
          We received a request to reset your Ponnaloy password. Choose a new
          password using the button below.
        </p>
        <p style="margin:24px 0">
          <a href="${resetUrl}"
             style="background:#056b4c;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
            Reset password
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;line-height:1.6">
          This link expires in 30 minutes and can be used once. If you did not
          request it, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
