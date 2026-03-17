import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultEmailTemplates } from "@/lib/email-templates";

export const runtime = "nodejs";

// GET /api/email-templates - list templates (auto-seed defaults if empty)
export async function GET() {
  try {
    await ensureDefaultEmailTemplates();
    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ key: "asc" }],
    });
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error("GET /api/email-templates error:", error);
    return NextResponse.json({ success: false, error: "Không thể tải template email" }, { status: 500 });
  }
}

// POST /api/email-templates - create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, name, subject, body: tplBody, params, isActive } = body || {};

    if (!key?.trim() || !name?.trim() || !subject?.trim() || !tplBody?.trim()) {
      return NextResponse.json({ success: false, error: "Thiếu key/name/subject/body" }, { status: 400 });
    }

    const created = await prisma.emailTemplate.create({
      data: {
        key: String(key).trim(),
        name: String(name).trim(),
        subject: String(subject).trim(),
        body: String(tplBody),
        params: params ?? null,
        isActive: isActive === false ? false : true,
      },
    });
    return NextResponse.json({ success: true, template: created });
  } catch (error: any) {
    console.error("POST /api/email-templates error:", error);
    const msg =
      typeof error?.message === "string" && error.message.includes("Unique constraint")
        ? "Key template đã tồn tại"
        : "Không thể tạo template";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/email-templates - update (by id)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, key, name, subject, body: tplBody, params, isActive } = body || {};
    if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

    const updated = await prisma.emailTemplate.update({
      where: { id: Number(id) },
      data: {
        ...(key !== undefined ? { key: String(key).trim() } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(subject !== undefined ? { subject: String(subject).trim() } : {}),
        ...(tplBody !== undefined ? { body: String(tplBody) } : {}),
        ...(params !== undefined ? { params: params ?? null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return NextResponse.json({ success: true, template: updated });
  } catch (error) {
    console.error("PUT /api/email-templates error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật template" }, { status: 500 });
  }
}

// DELETE /api/email-templates?id=123
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

    await prisma.emailTemplate.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/email-templates error:", error);
    return NextResponse.json({ success: false, error: "Không thể xóa template" }, { status: 500 });
  }
}

