import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailViaSmtp } from "@/lib/email";

export const runtime = "nodejs";

function renderTemplate(input: string, data: Record<string, unknown>) {
  let out = input;
  for (const [key, value] of Object.entries(data)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
}

function isValidEmail(email: string) {
  const v = String(email || "").trim();
  // simple + safe check (avoids pulling extra deps)
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// POST /api/notifications/test-email - Test gửi email thông báo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type = "booking_confirmation", 
      email = "test@example.com",
      data = {} 
    } = body;

    if (!isValidEmail(String(email))) {
      return NextResponse.json({ success: false, error: "Email nhận không hợp lệ" }, { status: 400 });
    }

    const tpl =
      (await prisma.emailTemplate.findFirst({ where: { key: String(type), isActive: true } })) ||
      (await prisma.emailTemplate.findFirst({ where: { key: "booking_confirmation", isActive: true } }));

    if (!tpl) {
      return NextResponse.json({ success: false, error: "Chưa có template email trong DB" }, { status: 500 });
    }

    const emailSubject = renderTemplate(tpl.subject, data);
    const emailBody = renderTemplate(tpl.body, data);

    // Gửi email thật qua SMTP
    let smtpResult: any = null;
    try {
      smtpResult = await sendEmailViaSmtp({
        to: String(email).trim(),
        subject: emailSubject,
        text: emailBody,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gửi email thất bại";
      // Make the error actionable for admins configuring SMTP
      return NextResponse.json(
        {
          success: false,
          error: msg,
          hint:
            "Kiểm tra Cài đặt Email SMTP: smtp_host, smtp_port, smtp_user, smtp_password, from_email (mật khẩu phải được nhập mới rồi bấm Lưu).",
        },
        { status: 500 }
      );
    }

    // Lưu vào database để test
    // NOTE: previously this hard-coded userId=1 which can crash (FK) on production DB.
    // We now try to attach to userId=1 if it exists; otherwise skip DB write.
    let notification: any = null;
    try {
      const u1 = await prisma.user.findUnique({ where: { id: 1 }, select: { id: true } });
      if (u1?.id) {
        notification = await prisma.notification.create({
          data: {
            userId: u1.id,
            type: "email",
            title: emailSubject,
            content: emailBody,
            isRead: false,
            data: {
              email,
              type,
              sentAt: new Date().toISOString(),
              status: "sent",
              smtp: smtpResult,
            },
          },
        });
      }
    } catch (e) {
      // best-effort only; do not fail email test if notification logging fails
      console.warn("Email test: failed to save notification log:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Email test đã được gửi",
      email: {
        to: email,
        subject: emailSubject,
        body: emailBody,
      },
      smtp: smtpResult,
      notification,
    });
  } catch (error) {
    console.error("Email test error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Gửi email thất bại"
    }, { status: 500 });
  }
}

// GET /api/notifications/test-email - Lấy danh sách email templates
export async function GET() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: [{ key: "asc" }] });
  return NextResponse.json({ success: true, templates });
}
