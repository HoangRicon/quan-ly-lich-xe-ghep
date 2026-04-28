import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";

// GET /api/notifications/settings - Lấy cài đặt thông báo
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    let settings = await db.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      settings = await db.userSettings.create({
        data: {
          userId: user.id,
          pushEnabled: true,
          reminderOffset: 60,
          emailEnabled: true,
          notificationHour: 8,
          quietHoursStart: null,
          quietHoursEnd: null,
        } as any,
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        pushEnabled: settings.pushEnabled,
        reminderOffset: settings.reminderOffset,
        emailEnabled: settings.emailEnabled,
        notificationHour: settings.notificationHour,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
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

    const db = createTenantPrisma(prisma, user.accountId);

    const body = await request.json();
    const { pushEnabled, reminderOffset, emailEnabled, notificationHour, quietHoursStart, quietHoursEnd } = body;

    if (reminderOffset !== undefined) {
      const validOffsets = [15, 30, 60, 120, 300, 1440];
      if (!validOffsets.includes(reminderOffset)) {
        return NextResponse.json(
          { success: false, error: "Reminder offset không hợp lệ" },
          { status: 400 }
        );
      }
    }

    if (notificationHour !== undefined && (notificationHour < 0 || notificationHour > 23)) {
      return NextResponse.json(
        { success: false, error: "Giờ gửi thông báo không hợp lệ" },
        { status: 400 }
      );
    }

    if (quietHoursStart !== null && (quietHoursStart < 0 || quietHoursStart > 23)) {
      return NextResponse.json(
        { success: false, error: "Giờ bắt đầu yên lặng không hợp lệ" },
        { status: 400 }
      );
    }
    if (quietHoursEnd !== null && (quietHoursEnd < 0 || quietHoursEnd > 23)) {
      return NextResponse.json(
        { success: false, error: "Giờ kết thúc yên lặng không hợp lệ" },
        { status: 400 }
      );
    }

    const settings = await db.userSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(pushEnabled !== undefined && { pushEnabled }),
        ...(reminderOffset !== undefined && { reminderOffset }),
        ...(emailEnabled !== undefined && { emailEnabled }),
        ...(notificationHour !== undefined && { notificationHour }),
        ...(quietHoursStart !== undefined && { quietHoursStart }),
        ...(quietHoursEnd !== undefined && { quietHoursEnd }),
      },
      create: {
        userId: user.id,
        pushEnabled: pushEnabled ?? true,
        reminderOffset: reminderOffset ?? 60,
        emailEnabled: emailEnabled ?? true,
        notificationHour: notificationHour ?? 8,
        quietHoursStart: quietHoursStart ?? null,
        quietHoursEnd: quietHoursEnd ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        pushEnabled: settings.pushEnabled,
        reminderOffset: settings.reminderOffset,
        emailEnabled: settings.emailEnabled,
        notificationHour: settings.notificationHour,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}
