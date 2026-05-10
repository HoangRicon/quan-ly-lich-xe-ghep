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
    const driverId = searchParams.get("driverId");

    const dateRange = parseDateParams(startDate, endDate);

    // Build where clause
    const where: Prisma.TripWhereInput = {
      accountId: user.accountId,
    };
    if (Object.keys(dateRange).length > 0) {
      where.departureTime = dateRange;
    }
    if (driverId) {
      where.driverId = parseInt(driverId);
    }

    // Previous period range for comparison
    let prevWhere: Prisma.TripWhereInput = {
      accountId: user.accountId,
    };
    if (startDate && endDate) {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      const [ey, em, ed] = endDate.split("-").map(Number);
      const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      const duration = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - duration - 1);
      const prevEnd = new Date(end.getTime() - duration - 1);
      prevWhere.departureTime = {
        gte: prevStart,
        lte: prevEnd,
      };
    }

    // Fetch current period trips
    const trips = await db.trip.findMany({
      where,
      select: {
        id: true,
        status: true,
        price: true,
        profit: true,
        departureTime: true,
        driverId: true,
      },
    });

    // Fetch previous period trips for comparison
    const prevTrips = await db.trip.findMany({
      where: prevWhere,
      select: {
        price: true,
        profit: true,
      },
    });

    // KPIs
    const totalTrips = trips.length;
    const totalRevenue = trips.reduce((sum, t) => sum + Number(t.price), 0);
    const totalProfit = trips.reduce((sum, t) => sum + Number(t.profit ?? 0), 0);

    const assignedTrips = trips.filter(
      (t) => t.status === "scheduled" && t.driverId
    ).length;
    const unassignedTrips = trips.filter(
      (t) => t.status === "scheduled" && !t.driverId
    ).length;
    const completedTrips = trips.filter((t) => t.status === "completed").length;
    const inProgressTrips = trips.filter((t) => t.status === "in_progress").length;
    const cancelledTrips = trips.filter((t) => t.status === "cancelled").length;

    const avgTripValue = totalTrips > 0 ? totalRevenue / totalTrips : 0;
    const avgProfitPerTrip = totalTrips > 0 ? totalProfit / totalTrips : 0;

    const prevRevenue = prevTrips.reduce((sum, t) => sum + Number(t.price), 0);
    const prevProfit = prevTrips.reduce((sum, t) => sum + Number(t.profit ?? 0), 0);
    const prevTripsCount = prevTrips.length;

    const revenueChange =
      prevRevenue > 0
        ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
        : totalRevenue > 0
        ? 100
        : 0;
    const profitChange =
      prevProfit > 0
        ? ((totalProfit - prevProfit) / prevProfit) * 100
        : totalProfit > 0
        ? 100
        : 0;
    const tripsChange =
      prevTripsCount > 0
        ? ((totalTrips - prevTripsCount) / prevTripsCount) * 100
        : totalTrips > 0
        ? 100
        : 0;

    // Revenue by day (group by YYYY-MM-DD)
    const revenueByDayMap = new Map<
      string,
      { revenue: number; profit: number; trips: number }
    >();
    for (const trip of trips) {
      const dateStr = new Date(trip.departureTime)
        .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      const existing = revenueByDayMap.get(dateStr) || {
        revenue: 0,
        profit: 0,
        trips: 0,
      };
      revenueByDayMap.set(dateStr, {
        revenue: existing.revenue + Number(trip.price),
        profit: existing.profit + Number(trip.profit ?? 0),
        trips: existing.trips + 1,
      });
    }
    const revenueByDay = Array.from(revenueByDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue by month
    const revenueByMonthMap = new Map<
      string,
      { revenue: number; profit: number; trips: number }
    >();
    for (const trip of trips) {
      const monthStr = new Date(trip.departureTime)
        .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
        .slice(0, 7);
      const existing = revenueByMonthMap.get(monthStr) || {
        revenue: 0,
        profit: 0,
        trips: 0,
      };
      revenueByMonthMap.set(monthStr, {
        revenue: existing.revenue + Number(trip.price),
        profit: existing.profit + Number(trip.profit ?? 0),
        trips: existing.trips + 1,
      });
    }
    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Revenue by status
    const revenueByStatus: Record<string, number> = {};
    for (const trip of trips) {
      const status = trip.status || "unknown";
      revenueByStatus[status] =
        (revenueByStatus[status] || 0) + Number(trip.price);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalTrips,
        totalRevenue,
        totalProfit,
        completedTrips,
        assignedTrips,
        unassignedTrips,
        inProgressTrips,
        cancelledTrips,
        avgTripValue,
        avgProfitPerTrip,
        revenueByDay,
        revenueByMonth,
        revenueByStatus,
        revenueChangePercent: Math.round(revenueChange * 10) / 10,
        profitChangePercent: Math.round(profitChange * 10) / 10,
        tripsChangePercent: Math.round(tripsChange * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Reports stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
