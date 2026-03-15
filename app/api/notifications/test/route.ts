import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/notifications/test - Test endpoint without auth
export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: 1,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

// POST /api/notifications/test - Create test notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = "reminder", title, content } = body;

    const notification = await prisma.notification.create({
      data: {
        userId: 1,
        type,
        title: title || "Test thông báo",
        content: content || "Nội dung test",
        isRead: false,
        data: { test: true },
      },
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
