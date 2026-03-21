import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = (searchParams.get("search") || "").trim();
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      driverId: parseInt(driverId),
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.departureTime = { gte: startOfDay, lte: endOfDay };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.departureTime = { gte: start, lte: end };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.departureTime = { gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.departureTime = { lte: end };
    }

    if (search) {
      where.OR = [
        { departure: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        include: {
          driver: {
            select: { id: true, fullName: true, phone: true, profitRate: true },
          },
          customers: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: { departureTime: "desc" },
      }),
      prisma.trip.count({ where }),
    ]);

    const formattedTrips = trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      departure: trip.departure,
      destination: trip.destination,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      profit: trip.profit,
      tripDirection: trip.tripDirection,
      tripType: (trip as unknown as Record<string, unknown>).tripType || "ghep",
      pointsEarned: trip.pointsEarned != null ? Number(trip.pointsEarned) : null,
      profitRate: trip.profitRate ? Number(trip.profitRate) : null,
      matchedFormulaId: trip.matchedFormulaId,
      status: trip.status,
      totalSeats: trip.totalSeats,
      notes: trip.notes,
      createdAt: trip.createdAt,
      driver: trip.driver ? {
        id: trip.driver.id,
        fullName: trip.driver.fullName,
        phone: trip.driver.phone,
      } : null,
      customer: trip.customers[0]?.customer ? {
        id: trip.customers[0].customer.id,
        name: trip.customers[0].customer.name,
        phone: trip.customers[0].customer.phone,
      } : null,
      customers: trip.customers.map(c => ({
        customer: c.customer ? {
          id: c.customer.id,
          name: c.customer.name,
          phone: c.customer.phone,
        } : null,
        seats: c.seats,
        status: c.status,
      })),
      passengerCount: trip.customers.reduce((sum, c) => sum + c.seats, 0),
    }));

    const res = NextResponse.json({
      success: true,
      data: formattedTrips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("Zom trips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
