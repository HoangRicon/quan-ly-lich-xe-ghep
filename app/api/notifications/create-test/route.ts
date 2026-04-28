import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTenantPrisma } from "@/lib/prisma-tenant";

// POST /api/notifications/create-test - Tạo notification test
// NOTE: This is a test-only endpoint without auth. We need to resolve accountId from the user.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId = 1,
      type = "reminder",
      title = "Test thông báo",
      content = "Đây là notification test từ hệ thống Xe Ghép!",
      data = {},
    } = body;

    // Resolve accountId from the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId as number },
      select: { accountId: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const db = createTenantPrisma(prisma, targetUser.accountId);

    const notification = await db.notification.create({
      data: {
        userId: userId as number,
        type: type as string,
        title: title as string,
        content: content as string,
        isRead: false,
        data: data as Record<string, unknown>,
      } as any,
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json({ success: false, error: "Failed to create notification" }, { status: 500 });
  }
}

// GET /api/notifications/create-test - Tạo notification test mẫu
export async function GET() {
  const targetUser = await prisma.user.findUnique({
    where: { id: 1 },
    select: { accountId: true },
  });

  if (!targetUser) {
    return NextResponse.json({ success: false, error: "User 1 not found" }, { status: 404 });
  }

  const db = createTenantPrisma(prisma, targetUser.accountId);

  const notifications = await Promise.all([
    db.notification.create({
      data: {
        userId: 1,
        type: "reminder",
        title: "Nhắc lịch hẹn",
        content: "Bạn có lịch hẹn khởi hành trong 30 phút nữa",
        isRead: false,
        data: { tripId: 1, departureTime: new Date().toISOString() },
      } as any,
    }),
    db.notification.create({
      data: {
        userId: 1,
        type: "system",
        title: "Chào mừng",
        content: "Chào mừng bạn đến với hệ thống Xe Ghép!",
        isRead: false,
        data: { welcome: true },
      } as any,
    }),
    db.notification.create({
      data: {
        userId: 1,
        type: "booking",
        title: "Đặt xe thành công",
        content: "Bạn đã đặt xe thành công tuyến Hà Nội - Hải Phòng",
        isRead: false,
        data: { bookingId: 1, route: "Hà Nội - Hải Phòng" },
      } as any,
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: `Đã tạo ${notifications.length} notification test`,
    notifications,
  });
}
