import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getUserFromRequest } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";

// GET /api/notifications - Lấy danh sách thông báo
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const accountIdHeader = request.headers.get("x-account-id");

    let userId: number | undefined;
    let accountId: number;

    if (session) {
      userId = session.id;
      accountId = session.accountId;
    } else {
      const userFromReq = await getUserFromRequest(request);
      if (!userFromReq) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      userId = userFromReq.id;
      accountId = accountIdHeader ? parseInt(accountIdHeader) : userFromReq.accountId;
    }

    const db = createTenantPrisma(prisma, accountId);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unread") === "true";

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, isRead: false } }),
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
    const session = await getSession();
    const accountIdHeader = request.headers.get("x-account-id");

    let accountId: number;

    if (session) {
      accountId = session.accountId;
    } else {
      const userFromReq = await getUserFromRequest(request);
      if (!userFromReq) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      accountId = accountIdHeader ? parseInt(accountIdHeader) : userFromReq.accountId;
    }

    const body = await request.json();
    const { userId, type, title, content, data } = body;

    if (!userId || !title || !content) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const db = createTenantPrisma(prisma, accountId);

    const notification = await db.notification.create({
      data: {
        userId,
        type: type || "reminder",
        title,
        content,
        data: (data || {}) as any,
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
