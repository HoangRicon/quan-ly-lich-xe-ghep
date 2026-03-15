import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/notifications/test-mark-read - Test đánh dấu đã đọc (không cần auth)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAllRead, userId = 1 } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Đánh dấu tất cả đã đọc" });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Đánh dấu đã đọc" });
    }

    return NextResponse.json({ success: false, error: "Thiếu notificationIds" }, { status: 400 });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json({ success: false, error: "Failed to mark as read" }, { status: 500 });
  }
}

// DELETE /api/notifications/test-mark-read - Test xóa thông báo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    const userId = parseInt(searchParams.get("userId") || "1");

    if (!notificationId) {
      return NextResponse.json({ success: false, error: "Thiếu notification ID" }, { status: 400 });
    }

    await prisma.notification.delete({
      where: {
        id: parseInt(notificationId),
        userId,
      },
    });

    return NextResponse.json({ success: true, message: "Xóa thông báo thành công" });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 });
  }
}
