import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Cấu hình VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
  process.env.VAPID_PRIVATE_KEY || "UUxI4O8-FbRouAf7-7OTt9GH4o-5DnP0lBa9Rp6L0T4"
);

// POST /api/push/test - Test gửi push notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, tag, userId } = body;

    const pushTitle = title || "Test Thông báo đẩy";
    const pushMessage = message || "Đây là tin nhắn test từ hệ thống Xe Ghép!";

    // Lấy subscriptions từ database
    const subscriptions = userId
      ? await prisma.pushSubscription.findMany({
          where: { userId: parseInt(userId) },
        })
      : await prisma.pushSubscription.findMany();

    // Nếu không có subscription, tạo notification trong DB để test
    if (subscriptions.length === 0) {
      // Tạo notification test trong database
      const notification = await prisma.notification.create({
        data: {
          userId: 1, // Test user
          type: "push",
          title: pushTitle,
          content: pushMessage,
          isRead: false,
          data: { 
            test: true,
            sentAt: new Date().toISOString(),
            status: "simulated"
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Không có subscription, đã tạo notification trong database",
        subscriptions: 0,
        notification: {
          id: notification.id,
          title: notification.title,
          content: notification.content,
        },
      });
    }

    const notificationPayload = JSON.stringify({
      title: pushTitle,
      body: pushMessage,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: tag || "test",
      data: {
        url: "/dashboard",
        timestamp: Date.now(),
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    // Gửi notification cho tất cả subscriptions
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
        
        // Nếu subscription hết hạn (410) hoặc không hợp lệ (400), xóa khỏi DB
        if (error.statusCode === 410 || error.statusCode === 400) {
          await prisma.pushSubscription.delete({
            where: { endpoint: sub.endpoint },
          });
        }
        failedCount++;
      }
    }

    // Lưu notification vào database
    const notification = await prisma.notification.create({
      data: {
        userId: userId ? parseInt(userId) : 1,
        type: "push",
        title: pushTitle,
        content: pushMessage,
        isRead: false,
        data: { 
          sentCount,
          failedCount,
          sentAt: new Date().toISOString()
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Gửi thành công ${sentCount}/${subscriptions.length} thông báo`,
      subscriptions: subscriptions.length,
      sent: sentCount,
      failed: failedCount,
      notification: {
        id: notification.id,
        title: notification.title,
      },
    });
  } catch (error) {
    console.error("Push test error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khi gửi push notification" },
      { status: 500 }
    );
  }
}

// GET /api/push/test - Lấy thông tin cấu hình push
export async function GET() {
  const subscriptions = await prisma.pushSubscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    success: true,
    hasVapidKeys: !!process.env.VAPID_PUBLIC_KEY,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ? process.env.VAPID_PUBLIC_KEY.substring(0, 20) + "..." : null,
    subscriptionCount: subscriptions.length,
    subscriptions: subscriptions.map(s => ({
      id: s.id,
      userId: s.userId,
      endpoint: s.endpoint.substring(0, 50) + "...",
      createdAt: s.createdAt,
    })),
    note: "Sử dụng POST với {title, message, tag, userId} để gửi test notification"
  });
}
