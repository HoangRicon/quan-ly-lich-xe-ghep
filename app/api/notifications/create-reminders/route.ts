import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import webpush from "web-push";

// Cấu hình VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

// Hàm gửi push notification
async function sendPushNotification(userId: number, accountId: number, title: string, message: string, tag?: string) {
  const db = createTenantPrisma(prisma, accountId);
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    console.log(`No push subscriptions for user ${userId}`);
    return 0;
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
        await db.pushSubscription.delete({
          where: { endpoint: sub.endpoint },
        });
      }
    }
  }

  return sentCount;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    const body = await request.json();
    const { reminderOffset = 15, sendPush = true } = body;

    const now = new Date();
    const targetTime = new Date(now.getTime() + reminderOffset * 60 * 1000);

    // Scope trips query to this account
    const upcomingTrips = await db.trip.findMany({
      where: {
        status: "scheduled",
        departureTime: {
          gte: targetTime,
          lt: new Date(targetTime.getTime() + 60 * 1000),
        },
      },
      include: {
        customers: {
          include: {
            customer: true,
          },
        },
      },
    });

    let notificationsCreated = 0;
    let pushNotificationsSent = 0;
    const userNotifications: { userId: number; title: string; message: string; tag: string }[] = [];

    for (const trip of upcomingTrips) {
      const mainCustomer = trip.customers[0]?.customer;
      const createdById = (trip as any).createdById || user.id;

      const alreadyNotified = await db.notification.findFirst({
        where: {
          userId: createdById,
          type: "reminder",
          data: {
            path: ["tripId"],
            equals: trip.id,
          },
        },
      });

      if (!alreadyNotified && createdById) {
        const minutesBefore = reminderOffset;
        let timeText = "";
        if (minutesBefore >= 60) {
          timeText = `${minutesBefore / 60} giờ`;
        } else {
          timeText = `${minutesBefore} phút`;
        }

        const title = `Sắp khởi hành - ${trip.departure} → ${trip.destination}`;
        const content = `Chuyến xe sẽ khởi hành trong ${timeText}. Khách hàng: ${mainCustomer?.name || "N/A"} - ${mainCustomer?.phone || "N/A"}`;

        // Tạo notification trong DB (tenant-scoped via db)
        await db.notification.create({
          data: {
            userId: createdById,
            type: "reminder",
            title,
            content,
            data: {
              tripId: trip.id,
              departureTime: trip.departureTime,
            },
          } as any,
        });

        notificationsCreated++;

        // Lưu thông tin để gửi push notification
        if (sendPush) {
          userNotifications.push({
            userId: createdById,
            title,
            message: content,
            tag: `trip-${trip.id}`,
          });
        }
      }
    }

    // Gửi push notifications cho từng user
    if (sendPush && userNotifications.length > 0) {
      // Nhóm theo user để gửi
      const userMap = new Map<number, { title: string; message: string; tag: string }[]>();
      for (const notif of userNotifications) {
        const existing = userMap.get(notif.userId) || [];
        existing.push(notif);
        userMap.set(notif.userId, existing);
      }

      for (const [userId, notifications] of userMap) {
        const latestNotif = notifications[notifications.length - 1];
        const sent = await sendPushNotification(userId, user.accountId, latestNotif.title, latestNotif.message, latestNotif.tag);
        pushNotificationsSent += sent;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo ${notificationsCreated} thông báo nhắc nhở, gửi ${pushNotificationsSent} push notification`,
      notificationsCreated,
      pushNotificationsSent,
      tripsChecked: upcomingTrips.length,
    });
  } catch (error) {
    console.error("Create reminders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create reminders" },
      { status: 500 }
    );
  }
}
