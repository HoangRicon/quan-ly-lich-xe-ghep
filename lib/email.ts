import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

function isMaskedSecret(value: string | null | undefined) {
  return typeof value === "string" && value.includes("•");
}

export async function getSmtpSettingsFromDb(): Promise<SmtpSettings> {
  const rows = await prisma.systemSettings.findMany({
    where: { category: "email" },
  });

  const map: Record<string, string> = {};
  for (const r of rows) {
    if (r.value) map[r.key] = r.value;
  }

  const host = (map.smtp_host || "").trim();
  const port = Number((map.smtp_port || "587").trim());
  const user = (map.smtp_user || "").trim();
  const pass = map.smtp_password || "";
  const fromEmail = (map.from_email || "").trim();
  const fromName = (map.from_name || "Xe Ghép").trim();

  if (!host || !user) {
    throw new Error("Chưa cấu hình SMTP Host/Username");
  }
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP Port không hợp lệ");
  }
  if (!pass || isMaskedSecret(pass)) {
    throw new Error("SMTP Password chưa được lưu (vui lòng nhập lại và bấm Lưu cấu hình Email)");
  }
  if (!fromEmail) {
    throw new Error("Chưa cấu hình Email người gửi (from_email)");
  }

  return { host, port, user, pass, fromEmail, fromName };
}

export async function sendEmailViaSmtp(opts: {
  to: string;
  subject: string;
  text: string;
}) {
  const smtp = await getSmtpSettingsFromDb();

  const secure = smtp.port === 465; // SMTPS

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });

  const toJsonSafeAddress = (v: unknown) => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      const maybe = v as { address?: unknown; name?: unknown };
      if (typeof maybe.address === "string") return maybe.address;
      if (typeof maybe.name === "string") return maybe.name;
    }
    return String(v);
  };

  return {
    messageId: info.messageId,
    accepted: (info.accepted || []).map(toJsonSafeAddress),
    rejected: (info.rejected || []).map(toJsonSafeAddress),
  };
}

