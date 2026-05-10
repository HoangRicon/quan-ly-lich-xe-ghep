import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";

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

    // Build trip where clause
    const tripWhere: Prisma.TripWhereInput = {
      accountId: user.accountId,
    };
    if (Object.keys(dateRange).length > 0) {
      tripWhere.departureTime = dateRange;
    }

    const trips = await db.trip.findMany({
      where: tripWhere,
      select: {
        departure: true,
        destination: true,
        status: true,
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
        inProgressTrips: number;
        unassignedTrips: number;
        cancelledTrips: number;
        totalRevenue: number;
        totalProfit: number;
        totalSeats: number;
      }
    >();

    for (const trip of trips) {
      const routeKey = `${trip.departure}|||${trip.destination}`;
      const routeName = `${trip.departure} - ${trip.destination}`;
      let stats = routeStatsMap.get(routeKey);
      if (!stats) {
        stats = {
          departure: trip.departure,
          destination: trip.destination,
          totalTrips: 0,
          completedTrips: 0,
          inProgressTrips: 0,
          unassignedTrips: 0,
          cancelledTrips: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalSeats: 0,
        };
        routeStatsMap.set(routeKey, stats);
      }
      stats.totalTrips++;
      stats.totalRevenue += Number(trip.price);
      stats.totalProfit += Number(trip.profit ?? 0);
      stats.totalSeats += trip.totalSeats || 0;

      if (trip.status === "completed") stats.completedTrips++;
      else if (trip.status === "scheduled") stats.unassignedTrips++;
      else if (trip.status === "in_progress") stats.inProgressTrips++;
      else if (trip.status === "cancelled") stats.cancelledTrips++;
    }

    let routeStats = Array.from(routeStatsMap.values()).map((s) => ({
      route: `${s.departure} - ${s.destination}`,
      departure: s.departure,
      destination: s.destination,
      totalTrips: s.totalTrips,
      completedTrips: s.completedTrips,
      inProgressTrips: s.inProgressTrips,
      unassignedTrips: s.unassignedTrips,
      cancelledTrips: s.cancelledTrips,
      totalRevenue: s.totalRevenue,
      totalProfit: s.totalProfit,
      avgTripValue: s.totalTrips > 0 ? s.totalRevenue / s.totalTrips : 0,
      avgProfit: s.totalTrips > 0 ? s.totalProfit / s.totalTrips : 0,
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
    const sortFieldMap: Record<string, string> = {
      totalRevenue: "totalRevenue",
      totalTrips: "totalTrips",
      totalProfit: "totalProfit",
      route: "route",
    };
    const sortField = sortFieldMap[sortBy] || "totalTrips";
    routeStats.sort((a: any, b: any) => {
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
