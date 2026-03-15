import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/system-settings - Lấy tất cả cấu hình
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    
    const where = category ? { category } : {};
    
    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    // Mask secret values
    const maskedSettings = settings.map((s) => ({
      ...s,
      value: s.isSecret ? (s.value ? "••••••••" : null) : s.value,
    }));

    return NextResponse.json({
      success: true,
      settings: maskedSettings,
    });
  } catch (error) {
    console.error("Get system settings error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khi lấy cấu hình" },
      { status: 500 }
    );
  }
}

// PUT /api/system-settings - Cập nhật cấu hình
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description, category, isSecret } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Thiếu key cấu hình" },
        { status: 400 }
      );
    }

    // Upsert - update if exists, create if not
    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value,
        description,
        category,
        isSecret,
      },
      create: {
        key,
        value,
        description,
        category: category || "general",
        isSecret: isSecret || false,
      },
    });

    return NextResponse.json({
      success: true,
      setting: {
        ...setting,
        value: setting.isSecret ? "••••••••" : setting.value,
      },
    });
  } catch (error) {
    console.error("Update system settings error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khi cập nhật cấu hình" },
      { status: 500 }
    );
  }
}

// POST /api/system-settings - Tạo mới cấu hình
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description, category, isSecret } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: "Thiếu key hoặc value" },
        { status: 400 }
      );
    }

    // Check if exists
    const existing = await prisma.systemSettings.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Key đã tồn tại" },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSettings.create({
      data: {
        key,
        value,
        description,
        category: category || "general",
        isSecret: isSecret || false,
      },
    });

    return NextResponse.json({
      success: true,
      setting: {
        ...setting,
        value: setting.isSecret ? "••••••••" : setting.value,
      },
    });
  } catch (error) {
    console.error("Create system settings error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khi tạo cấu hình" },
      { status: 500 }
    );
  }
}

// DELETE /api/system-settings - Xóa cấu hình
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Thiếu key cấu hình" },
        { status: 400 }
      );
    }

    await prisma.systemSettings.delete({
      where: { key },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa cấu hình",
    });
  } catch (error) {
    console.error("Delete system settings error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khi xóa cấu hình" },
      { status: 500 }
    );
  }
}
