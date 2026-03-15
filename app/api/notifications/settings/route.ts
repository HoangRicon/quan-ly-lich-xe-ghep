import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/notifications/settings - Lấy cài đặt thông báo
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Lấy hoặc tạo settings mặc định
    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    // Nếu chưa có settings, tạo mặc định
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          pushEnabled: true,
          reminderOffset: 60,
          emailEnabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        pushEnabled: settings.pushEnabled,
        reminderOffset: settings.reminderOffset,
        emailEnabled: settings.emailEnabled,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to get settings" }, { status: 500 });
  }
}

// PUT /api/notifications/settings - Cập nhật cài đặt thông báo
export async function PUT(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pushEnabled, reminderOffset, emailEnabled } = body;

    // Validate reminderOffset
    const validOffsets = [15, 30, 60, 120, 300, 1440]; // phút
    if (reminderOffset !== undefined && !validOffsets.includes(reminderOffset)) {
      return NextResponse.json(
        { success: false, error: "Reminder offset không hợp lệ" },
        { status: 400 }
      );
    }

    // Cập nhật hoặc tạo settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(pushEnabled !== undefined && { pushEnabled }),
        ...(reminderOffset !== undefined && { reminderOffset }),
        ...(emailEnabled !== undefined && { emailEnabled }),
      },
      create: {
        userId: user.id,
        pushEnabled: pushEnabled ?? true,
        reminderOffset: reminderOffset ?? 60,
        emailEnabled: emailEnabled ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        pushEnabled: settings.pushEnabled,
        reminderOffset: settings.reminderOffset,
        emailEnabled: settings.emailEnabled,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}
