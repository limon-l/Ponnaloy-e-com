import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SMTPServer } from "smtp-server";
import type { AddressInfo } from "node:net";

/**
 * Verifies the real SMTP code path: the application must hand the message to a
 * live SMTP server and report it as delivered. This complements the capture
 * transport tests, which only prove that nothing is claimed as delivered when
 * no mail server exists.
 */

let server: SMTPServer;
let port: number;
const received: string[] = [];

beforeAll(async () => {
  server = new SMTPServer({
    // The test server is local and unauthenticated; STARTTLS is disabled so the
    // exchange stays on a plain loopback socket.
    authOptional: true,
    disabledCommands: ["STARTTLS", "AUTH"],
    onData(stream, _session, callback) {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        received.push(Buffer.concat(chunks).toString("utf8"));
        callback();
      });
      stream.on("error", callback);
    },
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  port = (server.server.address() as AddressInfo).port;

  // Config is read when the module is imported, so these must be set first.
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(port);
  process.env.SMTP_SECURE = "false";
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
}, 60_000);

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("SMTP email delivery", () => {
  it("delivers a password reset message through a live SMTP server", async () => {
    const { buildPasswordResetEmail, sendMail } = await import("../src/lib/email");

    const resetUrl = "http://localhost:3000/reset-password?token=test-token-value";
    const result = await sendMail({
      to: "buyer@example.com",
      ...buildPasswordResetEmail(resetUrl),
    });

    expect(result.transport).toBe("smtp");
    expect(result.delivered).toBe(true);
    expect(result.messageId).toBeTruthy();
    expect(result.preview).toBeUndefined();

    expect(received).toHaveLength(1);
    // The raw MIME body is quoted-printable encoded and folded, so assert on
    // the encoded token rather than the literal URL.
    expect(received[0]).toContain("To: buyer@example.com");
    expect(received[0]).toContain("Subject: Reset your Ponnaloy password");
    expect(received[0]).toContain("reset-password?token=3Dtest-token-value");
  }, 30_000);
});
