import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PUT /api/notifications/mark-as-read - Đánh dấu đã đọc
export async function PUT(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      // Đánh dấu tất cả là đã đọc
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Đánh dấu tất cả đã đọc" });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // Đánh dấu các thông báo cụ thể
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
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

// DELETE /api/notifications - Xóa thông báo
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json({ success: false, error: "Thiếu notification ID" }, { status: 400 });
    }

    await prisma.notification.delete({
      where: {
        id: parseInt(notificationId),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Xóa thông báo thành công" });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 });
  }
}
