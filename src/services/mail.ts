import nodemailer from "nodemailer";

function mailConfig() {
  const { SMTP_HOST: host, SMTP_FROM: from, SMTP_USER: user, SMTP_PASSWORD: password, SMTP_PORT: rawPort, SMTP_SECURE: rawSecure } = process.env;
  const port = Number(rawPort);
  if (!host || !from || !rawPort || !Number.isInteger(port) || port < 1 || port > 65535 || !["true", "false"].includes(rawSecure ?? "") || Boolean(user) !== Boolean(password)) {
    throw new Error("SMTP_HOST, SMTP_PORT, SMTP_SECURE and SMTP_FROM must be configured; SMTP_USER and SMTP_PASSWORD must be supplied together.");
  }
  const secure = rawSecure === "true";
  return { host, from, port, secure, auth: user && password ? { user, pass: password } : undefined };
}

export function assertMailConfigured() { mailConfig(); }

export async function sendAccountEmail(to: string, subject: string, message: string) {
  const { from, ...options } = mailConfig();
  const transport = nodemailer.createTransport({ ...options, requireTLS: !options.secure });
  try { await transport.sendMail({ from, to, subject, text: message }); }
  finally { transport.close(); }
}
