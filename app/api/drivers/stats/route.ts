import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: { departureTime?: { gte?: Date; lte?: Date } } = {};

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.departureTime = { gte: startOfDay, lte: endOfDay };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.departureTime = { gte: start, lte: end };
    }

    // Get all drivers
    const drivers = await prisma.user.findMany({
      where: { role: "driver" },
      select: {
        id: true,
        fullName: true,
        profitRate: true,
        formulaIds: true,
      },
      orderBy: { fullName: "asc" },
    });

    const driverIds = drivers.map((d) => d.id);

    // Fetch all formulas once
    const allFormulas = await prisma.pricingFormula.findMany({
      where: { isActive: true },
      select: { id: true, name: true, tripType: true, seats: true, minPrice: true, maxPrice: true, points: true },
    });
    const formulaMap = new Map(allFormulas.map((f) => [f.id, f]));

    // Fetch all trips within the date range
    const tripWhere = {
      ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
    };

    const trips = await prisma.trip.findMany({
      where: {
        ...tripWhere,
        driverId: { in: driverIds },
      },
      select: {
        id: true,
        price: true,
        profit: true,
        status: true,
        driverId: true,
        departureTime: true,
        matchedFormulaId: true,
      },
      orderBy: { departureTime: "asc" },
    });

    // Compute stats per driver
    const driverStats = drivers.map((driver) => {
      const driverTrips = trips.filter((t) => t.driverId === driver.id);
      const completedTrips = driverTrips.filter((t) => t.status === "completed");
      const assignedTrips = driverTrips.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled"
      );

      const actualRevenue = completedTrips.reduce((sum, t) => {
        const p = Number(t.price) || 0;
        return sum + (p > 0 && p < 100000000 ? p : 0);
      }, 0);

      const expectedRevenue = assignedTrips.reduce((sum, t) => {
        const p = Number(t.price) || 0;
        return sum + (p > 0 && p < 100000000 ? p : 0);
      }, 0);

      const actualProfit = completedTrips.reduce((sum, t) => {
        const p = Number(t.profit ?? 0);
        return sum + (p > 0 && p < 100000000 ? p : 0);
      }, 0);

      const expectedProfit = assignedTrips.reduce((sum, t) => {
        const p = Number(t.profit ?? 0);
        return sum + (p > 0 && p < 100000000 ? p : 0);
      }, 0);

      const formulas = (driver.formulaIds || [])
        .map((id: number) => formulaMap.get(id))
        .filter(Boolean);

      return {
        id: driver.id,
        fullName: driver.fullName,
        profitRate: Number(driver.profitRate),
        completedCount: completedTrips.length,
        assignedCount: assignedTrips.length,
        totalCount: driverTrips.length,
        actualRevenue,
        expectedRevenue,
        actualProfit,
        expectedProfit,
        formulas,
      };
    });

    const res = NextResponse.json({ success: true, data: driverStats });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("Zom stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
