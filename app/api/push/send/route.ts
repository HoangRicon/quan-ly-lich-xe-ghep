import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Cấu hình VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, tag, userId } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Thiếu title hoặc message" },
        { status: 400 }
      );
    }

    // Lấy subscriptions từ database
    const subscriptions = userId
      ? await prisma.pushSubscription.findMany({
          where: { userId: parseInt(userId) },
        })
      : await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Không có subscription nào",
        sent: 0,
      });
    }

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: tag || "default",
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

    return NextResponse.json({
      success: true,
      message: `Gửi thành công ${sentCount}/${subscriptions.length} thông báo`,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error("Push API Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khi gửi push notification" },
      { status: 500 }
    );
  }
}

// GET - Lấy public key để client đăng ký
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
  });
}
