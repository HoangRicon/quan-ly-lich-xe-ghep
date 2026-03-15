import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/notifications - Lấy danh sách thông báo
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unread") === "true";

    const where = {
      userId: parseInt(userId),
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: parseInt(userId), isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ success: false, error: "Failed to get notifications" }, { status: 500 });
  }
}

// POST /api/notifications - Tạo thông báo mới (dùng cho hệ thống/admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, content, data } = body;

    if (!userId || !title || !content) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type || "reminder",
        title,
        content,
        data: data || {},
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
