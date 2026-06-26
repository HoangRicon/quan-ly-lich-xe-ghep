import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";
import { tripStatusBucket } from "@/lib/trip-status-buckets";
import { parseReportDateRange } from "@/lib/reports/date-range";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

type RouteStatsRow = {
  route: string;
  departure: string;
  destination: string;
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  totalProfit: number;
  avgTripValue: number;
  avgProfit: number;
  avgSeats: number;
};

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
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "totalTrips";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20);

    const { current: dateRange } = parseReportDateRange(startDate, endDate, startTime, endTime);

    // Build trip where clause
    const tripWhere: Prisma.TripWhereInput = {
      accountId: user.accountId,
    };
    if (Object.keys(dateRange).length > 0) {
      tripWhere.createdAt = dateRange;
    }

    const trips = await db.trip.findMany({
      where: tripWhere,
      select: {
        departure: true,
        destination: true,
        status: true,
        driverId: true,
        price: true,
        profit: true,
        totalSeats: true,
      },
    });

    // Aggregate per route (departure - destination)
    const routeStatsMap = new Map<
      string,
      {
        departure: string;
        destination: string;
        totalTrips: number;
        completedTrips: number;
        assignedTrips: number;
        unassignedTrips: number;
        cancelledTrips: number;
        totalRevenue: number;
        totalProfit: number;
        totalSeats: number;
      }
    >();

    for (const trip of trips) {
      const routeKey = `${trip.departure}|||${trip.destination}`;
      let stats = routeStatsMap.get(routeKey);
      if (!stats) {
        stats = {
          departure: trip.departure,
          destination: trip.destination,
          totalTrips: 0,
          completedTrips: 0,
          assignedTrips: 0,
          unassignedTrips: 0,
          cancelledTrips: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalSeats: 0,
        };
        routeStatsMap.set(routeKey, stats);
      }
      stats.totalTrips++;
      stats.totalSeats += trip.totalSeats || 0;
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

    let routeStats: RouteStatsRow[] = Array.from(routeStatsMap.values()).map((s) => ({
      route: `${s.departure} - ${s.destination}`,
      departure: s.departure,
      destination: s.destination,
      totalTrips: s.totalTrips,
      completedTrips: s.completedTrips,
      assignedTrips: s.assignedTrips,
      unassignedTrips: s.unassignedTrips,
      cancelledTrips: s.cancelledTrips,
      totalRevenue: s.totalRevenue,
      totalProfit: s.totalProfit,
      avgTripValue: s.completedTrips > 0 ? s.totalRevenue / s.completedTrips : 0,
      avgProfit: s.completedTrips > 0 ? s.totalProfit / s.completedTrips : 0,
      avgSeats: s.totalTrips > 0 ? Math.round((s.totalSeats / s.totalTrips) * 10) / 10 : 0,
    }));

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      routeStats = routeStats.filter(
        (r) =>
          r.route.toLowerCase().includes(q) ||
          r.departure.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q)
      );
    }

    // Sort
    const sortFieldMap: Record<
      string,
      keyof Pick<
        RouteStatsRow,
        | "totalRevenue"
        | "totalTrips"
        | "totalProfit"
        | "completedTrips"
        | "assignedTrips"
        | "route"
      >
    > = {
      totalRevenue: "totalRevenue",
      totalTrips: "totalTrips",
      totalProfit: "totalProfit",
      completedTrips: "completedTrips",
      assignedTrips: "assignedTrips",
      route: "route",
    };
    const sortField = sortFieldMap[sortBy] || "totalTrips";
    routeStats.sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (typeof av === "string") {
        return sortOrder === "asc"
          ? av.localeCompare(String(bv))
          : String(bv).localeCompare(av);
      }
      return sortOrder === "asc"
        ? av - Number(bv)
        : Number(bv) - av;
    });

    const total = routeStats.length;
    const paginated = routeStats.slice((page - 1) * limit, page * limit);

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
    console.error("Reports routes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
