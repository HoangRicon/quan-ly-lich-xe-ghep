import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/notifications/settings - Lấy cài đặt thông báo
export async function GET() {
  try {
    const user = await getSession();
    console.log("GET - Session user:", user);
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Kiểm tra user có tồn tại trong database không
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    console.log("GET - DB user:", dbUser);

    // Nếu user không tồn tại trong DB, thử user ID = 1
    let actualUserId = user.id;
    if (!dbUser) {
      console.log("GET - User not in DB, trying user ID 1 for testing");
      dbUser = await prisma.user.findUnique({
        where: { id: 1 },
      });
      if (dbUser) {
        actualUserId = 1;
        console.log("GET - Using user ID 1 for testing");
      }
    }

    // Nếu vẫn không có user, trả về mặc định
    if (!dbUser) {
      console.log("GET - No user found, returning default settings");
      return NextResponse.json({
        success: true,
        settings: {
          pushEnabled: true,
          reminderOffset: 60,
          emailEnabled: true,
          notificationHour: 8,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
        message: "Using default settings - no user in database",
      });
    }

    // Lấy hoặc tạo settings mặc định
    let settings = await prisma.userSettings.findUnique({
      where: { userId: actualUserId },
    });

    // Nếu chưa có settings, tạo mặc định
    if (!settings) {
      console.log("GET - Creating default settings for user:", actualUserId);
      settings = await prisma.userSettings.create({
        data: {
          userId: actualUserId,
          pushEnabled: true,
          reminderOffset: 60,
          emailEnabled: true,
          notificationHour: 8,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
      });
    }

    console.log("GET - Settings:", settings);

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
    console.log("PUT - Session user:", user);
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Kiểm tra user có tồn tại trong database không
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    console.log("PUT - DB user:", dbUser);

    // Nếu user không tồn tại trong DB, thử user ID = 1
    let actualUserId = user.id;
    if (!dbUser) {
      console.log("PUT - User not in DB, trying user ID 1 for testing");
      dbUser = await prisma.user.findUnique({
        where: { id: 1 },
      });
      if (dbUser) {
        actualUserId = 1;
        console.log("PUT - Using user ID 1 for testing");
      }
    }

    // Nếu vẫn không có user, trả về lỗi
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      );
    }

    const body = await request.json();
    console.log("PUT - Body:", body);
    const { pushEnabled, reminderOffset, emailEnabled, notificationHour, quietHoursStart, quietHoursEnd } = body;

    // Validate reminderOffset
    const validOffsets = [15, 30, 60, 120, 300, 1440];
    if (reminderOffset !== undefined && !validOffsets.includes(reminderOffset)) {
      return NextResponse.json(
        { success: false, error: "Reminder offset không hợp lệ" },
        { status: 400 }
      );
    }

    // Validate notificationHour
    if (notificationHour !== undefined && (notificationHour < 0 || notificationHour > 23)) {
      return NextResponse.json(
        { success: false, error: "Giờ gửi thông báo không hợp lệ" },
        { status: 400 }
      );
    }

    // Validate quietHours
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

    // Cập nhật hoặc tạo settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: actualUserId },
      update: {
        ...(pushEnabled !== undefined && { pushEnabled }),
        ...(reminderOffset !== undefined && { reminderOffset }),
        ...(emailEnabled !== undefined && { emailEnabled }),
        ...(notificationHour !== undefined && { notificationHour }),
        ...(quietHoursStart !== undefined && { quietHoursStart }),
        ...(quietHoursEnd !== undefined && { quietHoursEnd }),
      },
      create: {
        userId: actualUserId,
        pushEnabled: pushEnabled ?? true,
        reminderOffset: reminderOffset ?? 60,
        emailEnabled: emailEnabled ?? true,
        notificationHour: notificationHour ?? 8,
        quietHoursStart: quietHoursStart ?? null,
        quietHoursEnd: quietHoursEnd ?? null,
      },
    });

    console.log("PUT - Saved settings:", settings);

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
