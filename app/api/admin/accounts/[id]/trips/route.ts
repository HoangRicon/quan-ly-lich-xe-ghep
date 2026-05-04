import { NextRequest, NextResponse } from "next/server";
import { prisma as rootPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Cast to any to allow accessing relation methods without typed client
const db = rootPrisma as any;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountIdParam = request.nextUrl.searchParams.get("accountId");
    if (!accountIdParam) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const accountId = parseInt(accountIdParam);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }

    const driverId = request.nextUrl.searchParams.get("driverId");
    const status = request.nextUrl.searchParams.get("status");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "500");

    const where: any = { accountId };

    if (driverId) {
      where.driverId = parseInt(driverId);
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (startDate) {
      const [y, m, d] = startDate.split("-").map(Number);
      where.departureTime = { ...where.departureTime, gte: new Date(y, m - 1, d, 0, 0, 0, 0) };
    }
    if (endDate) {
      const [y, m, d] = endDate.split("-").map(Number);
      where.departureTime = { ...where.departureTime, lte: new Date(y, m - 1, d, 23, 59, 59, 999) };
    }

    const trips = await db.trip.findMany({
      where,
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        customers: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
      orderBy: { departureTime: "desc" },
      take: limit,
    });

    const drivers = await db.driver.findMany({
      where: { accountId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });

    const data = trips.map((trip: any) => ({
      id: trip.id,
      departure: trip.departure,
      destination: trip.destination,
      departureTime: trip.departureTime,
      status: trip.status,
      price: trip.price,
      pointsEarned: trip.pointsEarned,
      profit: trip.profit,
      notes: trip.notes,
      driver: trip.driver,
      customers: trip.customers.map((tc: any) => ({
        customer: tc.customer,
        seats: tc.seats,
        status: tc.status,
      })),
    }));

    return NextResponse.json({
      success: true,
      data,
      drivers,
    });
  } catch (error) {
    console.error("Get account trips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
