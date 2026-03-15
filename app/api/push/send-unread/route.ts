import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

// Cấu hình VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, tag } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Thiếu userId" },
        { status: 400 }
      );
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: parseInt(userId.toString()) },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Không có subscription nào",
        sent: 0,
      });
    }

    const notificationPayload = JSON.stringify({
      title: title || "Thông báo mới",
      body: message || "Bạn có thông báo mới",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: tag || "default",
      data: {
        url: "/notifications",
        timestamp: Date.now(),
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload
        );
        sentCount++;
      } catch (error: any) {
        console.error("Push notification error:", error);
        if (error.statusCode === 410 || error.statusCode === 400) {
          await prisma.pushSubscription.delete({
            where: { endpoint: sub.endpoint },
          });
        }
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Gửi thành công ${sentCount}/${subscriptions.length} thông báo`,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send push notification" },
      { status: 500 }
    );
  }
}

// GET - Gửi thông báo cho tất cả user có notification chưa đọc
export async function GET() {
  try {
    // Lấy tất cả user có notification chưa đọc
    const usersWithUnread = await prisma.notification.findMany({
      where: { isRead: false },
      select: { userId: true },
      distinct: ["userId"],
    });

    let totalSent = 0;

    for (const { userId } of usersWithUnread) {
      // Lấy notification chưa đọc mới nhất của user
      const latestNotification = await prisma.notification.findFirst({
        where: { userId, isRead: false },
        orderBy: { createdAt: "desc" },
      });

      if (!latestNotification) continue;

      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
      });

      if (subscriptions.length === 0) continue;

      const notificationPayload = JSON.stringify({
        title: latestNotification.title,
        body: latestNotification.content,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        tag: `notif-${latestNotification.id}`,
        data: {
          url: "/notifications",
          timestamp: Date.now(),
          notificationId: latestNotification.id,
        },
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
          totalSent++;
        } catch (error: any) {
          console.error("Push notification error:", error);
          if (error.statusCode === 410 || error.statusCode === 400) {
            await prisma.pushSubscription.delete({
              where: { endpoint: sub.endpoint },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi ${totalSent} push notifications`,
      sent: totalSent,
      usersNotified: usersWithUnread.length,
    });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send push notifications" },
      { status: 500 }
    );
  }
}
