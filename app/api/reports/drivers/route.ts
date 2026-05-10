import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";
import { tripStatusBucket } from "@/lib/trip-status-buckets";

function parseDateParams(startDate?: string | null, endDate?: string | null) {
  const range: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const [y, m, d] = startDate.split("-").map(Number);
    range.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  if (endDate) {
    const [y, m, d] = endDate.split("-").map(Number);
    range.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  return range;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "totalTrips";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const dateRange = parseDateParams(startDate, endDate);

    // Get all drivers (users with role = user in this account)
    const driverWhere: Prisma.UserWhereInput = {
      accountId: user.accountId,
    };
    if (search) {
      driverWhere.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // For sorting, we need to aggregate. Fetch all matching drivers first, then sort in JS
    const drivers = await db.user.findMany({
      where: driverWhere,
      select: {
        id: true,
        fullName: true,
        phone: true,
        totalRevenue: true,
      },
    });

    if (drivers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const driverIds = drivers.map((d) => d.id);

    // Fetch all trips for these drivers in the date range
    const tripWhere: Prisma.TripWhereInput = {
      accountId: user.accountId,
      driverId: { in: driverIds },
      ...(Object.keys(dateRange).length > 0 ? { departureTime: dateRange } : {}),
    };

    const trips = await db.trip.findMany({
      where: tripWhere,
      select: {
        driverId: true,
        status: true,
        price: true,
        profit: true,
      },
    });

    // Aggregate stats per driver
    const driverStatsMap = new Map<
      number,
      {
        totalTrips: number;
        completedTrips: number;
        unassignedTrips: number;
        assignedTrips: number;
        cancelledTrips: number;
        totalRevenue: number;
        totalProfit: number;
      }
    >();

    for (const driver of drivers) {
      driverStatsMap.set(driver.id, {
        totalTrips: 0,
        completedTrips: 0,
        unassignedTrips: 0,
        assignedTrips: 0,
        cancelledTrips: 0,
        totalRevenue: 0,
        totalProfit: 0,
      });
    }

    for (const trip of trips) {
      if (!trip.driverId) continue;
      const stats = driverStatsMap.get(trip.driverId);
      if (!stats) continue;
      stats.totalTrips++;
      if (trip.status === "completed") {
        stats.totalRevenue += Number(trip.price);
        stats.totalProfit += Number(trip.profit ?? 0);
      }
      const b = tripStatusBucket(trip);
      if (b === "completed") stats.completedTrips++;
      else if (b === "unassigned") stats.unassignedTrips++;
      else if (b === "cancelled") stats.cancelledTrips++;
      else if (b === "assigned") stats.assignedTrips++;
    }

    // Build driver stats array
    let driverStats = drivers.map((d) => {
      const stats = driverStatsMap.get(d.id)!;
      return {
        id: d.id,
        fullName: d.fullName || "N/A",
        phone: d.phone || "",
        totalTrips: stats.totalTrips,
        completedTrips: stats.completedTrips,
        unassignedTrips: stats.unassignedTrips,
        assignedTrips: stats.assignedTrips,
        cancelledTrips: stats.cancelledTrips,
        totalRevenue: stats.totalRevenue,
        totalProfit: stats.totalProfit,
        avgTripValue:
          stats.completedTrips > 0
            ? stats.totalRevenue / stats.completedTrips
            : 0,
      };
    });

    // Sort
    const sortFieldMap: Record<string, string> = {
      totalRevenue: "totalRevenue",
      totalTrips: "totalTrips",
      totalProfit: "totalProfit",
      completedTrips: "completedTrips",
      assignedTrips: "assignedTrips",
      name: "fullName",
    };
    const sortField = sortFieldMap[sortBy] || "totalTrips";
    driverStats.sort((a: any, b: any) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (typeof av === "string") {
        return sortOrder === "asc"
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      }
      return sortOrder === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });

    // Top 3 drivers for badges
    const sortedByRevenue = [...driverStats].sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );
    const topDriverIds = new Set(sortedByRevenue.slice(0, 3).map((d) => d.id));

    driverStats = driverStats.map((d) => ({
      ...d,
      badge: topDriverIds.has(d.id) && d.totalTrips > 0 ? "top" : d.totalTrips > 10 ? "active" : "normal",
    }));

    // Pagination
    const total = driverStats.length;
    const paginated = driverStats.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Reports drivers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
