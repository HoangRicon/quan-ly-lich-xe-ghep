import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reminderOffset = 15 } = body;

    const now = new Date();
    const targetTime = new Date(now.getTime() + reminderOffset * 60 * 1000);

    const upcomingTrips = await prisma.trip.findMany({
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

    for (const trip of upcomingTrips) {
      const mainCustomer = trip.customers[0]?.customer;
      const createdById = (trip as any).createdById || 1;
      
      const alreadyNotified = await prisma.notification.findFirst({
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

        await prisma.notification.create({
          data: {
            userId: createdById,
            type: "reminder",
            title: `Sắp khởi hành - ${trip.departure} → ${trip.destination}`,
            content: `Chuyến xe sẽ khởi hành trong ${timeText}. Khách hàng: ${mainCustomer?.name || "N/A"} - ${mainCustomer?.phone || "N/A"}`,
            data: {
              tripId: trip.id,
              departureTime: trip.departureTime,
            },
          },
        });

        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo ${notificationsCreated} thông báo nhắc nhở`,
      notificationsCreated,
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
