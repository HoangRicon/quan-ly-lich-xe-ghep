import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTenantPrisma } from "@/lib/prisma-tenant";

// PUT /api/notifications/test-mark-read - Test đánh dấu đã đọc (không cần auth)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAllRead, userId = 1 } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId as number },
      select: { id: true, accountId: true },
    });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    const db = createTenantPrisma(prisma, targetUser.accountId);

    if (markAllRead) {
      await db.notification.updateMany({
        where: { userId: targetUser.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Đánh dấu tất cả đã đọc" });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds as number[] },
          userId: targetUser.id,
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

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountId: true },
    });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    const db = createTenantPrisma(prisma, targetUser.accountId);

    if (!notificationId) {
      return NextResponse.json({ success: false, error: "Thiếu notification ID" }, { status: 400 });
    }

    await db.notification.delete({
      where: {
        id: parseInt(notificationId),
        userId: targetUser.id,
      },
    });

    return NextResponse.json({ success: true, message: "Xóa thông báo thành công" });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 });
  }
}
