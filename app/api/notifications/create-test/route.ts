import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/notifications/create-test - Tạo notification test cho user 1
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId = 1, 
      type = "reminder", 
      title = "Test thông báo", 
      content = "Đây là notification test từ hệ thống Xe Ghép!",
      data = {} 
    } = body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        isRead: false,
        data,
      },
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
  // Tạo 3 notification test
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        userId: 1,
        type: "reminder",
        title: "Nhắc lịch hẹn",
        content: "Bạn có lịch hẹn khởi hành trong 30 phút nữa",
        isRead: false,
        data: { tripId: 1, departureTime: new Date().toISOString() },
      },
    }),
    prisma.notification.create({
      data: {
        userId: 1,
        type: "system",
        title: "Chào mừng",
        content: "Chào mừng bạn đến với hệ thống Xe Ghép!",
        isRead: false,
        data: { welcome: true },
      },
    }),
    prisma.notification.create({
      data: {
        userId: 1,
        type: "booking",
        title: "Đặt xe thành công",
        content: "Bạn đã đặt xe thành công tuyến Hà Nội - Hải Phòng",
        isRead: false,
        data: { bookingId: 1, route: "Hà Nội - Hải Phòng" },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: `Đã tạo ${notifications.length} notification test`,
    notifications,
  });
}
