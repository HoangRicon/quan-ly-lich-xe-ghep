import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";

// GET /api/notifications/test - Test endpoint (requires auth for tenant isolation)
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
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

// POST /api/notifications/test - Create test notification (requires auth)
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);
    const body = await request.json();
    const { type = "reminder", title, content } = body;

    const notification = await db.notification.create({
      data: {
        userId: user.id,
        type,
        title: title || "Test thông báo",
        content: content || "Nội dung test",
        isRead: false,
        data: { test: true },
      } as any,
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
