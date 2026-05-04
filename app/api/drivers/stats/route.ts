import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: { departureTime?: { gte?: Date; lte?: Date } } = {};

    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
      const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
      dateFilter.departureTime = { gte: startOfDay, lte: endOfDay };
    } else if (startDate && endDate) {
      const [sY, sM, sD] = startDate.split("-").map(Number);
      const [eY, eM, eD] = endDate.split("-").map(Number);
      const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
      const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
      dateFilter.departureTime = { gte: start, lte: end };
    } else if (startDate) {
      const [sY, sM, sD] = startDate.split("-").map(Number);
      const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
      dateFilter.departureTime = { gte: start };
    } else if (endDate) {
      const [eY, eM, eD] = endDate.split("-").map(Number);
      const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
      dateFilter.departureTime = { lte: end };
    }

    // Get all drivers in this account
    const drivers = await db.user.findMany({
      where: { role: "driver", accountId: user.accountId },
      select: {
        id: true,
        fullName: true,
        profitRate: true,
        formulaIds: true,
      },
      orderBy: { fullName: "asc" },
    });

    const driverIds = drivers.map((d: { id: number }) => d.id);

    // Fetch all formulas once
    const allFormulas = await db.pricingFormula.findMany({
      where: { isActive: true },
      select: { id: true, name: true, tripType: true, seats: true, minPrice: true, maxPrice: true, points: true },
    });
    const formulaMap = new Map(allFormulas.map((f: { id: number; name: string; tripType: string; seats: number; minPrice: unknown; maxPrice: unknown; points: unknown }) => [f.id, f]));

    // Fetch all trips within the date range (account-scoped)
    const tripWhere = {
      ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
      accountId: user.accountId,
    };

    const trips = await db.trip.findMany({
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
    const driverStats = drivers.map((driver: { id: number; fullName: string; profitRate: unknown; formulaIds: number[] }) => {
      const driverTrips = trips.filter((t: { driverId: number; status: string }) => t.driverId === driver.id);
      const completedTrips = driverTrips.filter((t: { status: string }) => t.status === "completed");
      const assignedTrips = driverTrips.filter(
        (t: { status: string }) => t.status !== "completed" && t.status !== "cancelled"
      );

      const actualRevenue = completedTrips.reduce((sum: number, t: { price: unknown }) => {
        const p = Number(t.price) || 0;
        return sum + (p > 0 && p < 100000000 ? p : 0);
      }, 0);

      const expectedRevenue = assignedTrips.reduce((sum: number, t: { price: unknown }) => {
        const p = Number(t.price) || 0;
        return sum + (p > 0 && p < 100000000 ? p : 0);
      }, 0);

      const actualProfit = completedTrips.reduce((sum: number, t: { profit: unknown | null }) => {
        const p = Number(t.profit ?? 0);
        return sum + (p > 0 && p < 100000000 ? p : 0);
      }, 0);

      const expectedProfit = assignedTrips.reduce((sum: number, t: { profit: unknown | null }) => {
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
