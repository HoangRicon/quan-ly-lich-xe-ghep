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

    // Get all customers (account-scoped)
    const customerWhere: Prisma.CustomerWhereInput = {
      accountId: user.accountId,
    };
    if (search) {
      customerWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await db.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (customers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const customerIds = customers.map((c) => c.id);

    // Get trip customers for these customers in the date range
    const tripCustomerWhere: Prisma.TripCustomerWhereInput = {
      accountId: user.accountId,
      customerId: { in: customerIds },
    };

    if (Object.keys(dateRange).length > 0) {
      tripCustomerWhere.trip = {
        departureTime: dateRange,
      };
    }

    const tripCustomers = await db.tripCustomer.findMany({
      where: tripCustomerWhere,
      include: {
        trip: {
          select: {
            price: true,
            departure: true,
            destination: true,
            departureTime: true,
            status: true,
          },
        },
      },
    });

    // Aggregate per customer
    const customerStatsMap = new Map<
      number,
      {
        totalTrips: number;
        totalSpending: number;
        routes: Record<string, number>;
        lastTripDate: string;
      }
    >();

    for (const c of customers) {
      customerStatsMap.set(c.id, {
        totalTrips: 0,
        totalSpending: 0,
        routes: {},
        lastTripDate: "",
      });
    }

    for (const tc of tripCustomers) {
      const stats = customerStatsMap.get(tc.customerId);
      if (!stats || !tc.trip) continue;
      stats.totalTrips++;
      const price = Number(tc.trip.price);
      const seats = tc.seats || 1;
      stats.totalSpending += price * seats;

      const route = `${tc.trip.departure} - ${tc.trip.destination}`;
      stats.routes[route] = (stats.routes[route] || 0) + 1;

      const tripDate = new Date(tc.trip.departureTime).toLocaleDateString(
        "en-CA",
        { timeZone: "Asia/Ho_Chi_Minh" }
      );
      if (!stats.lastTripDate || tripDate > stats.lastTripDate) {
        stats.lastTripDate = tripDate;
      }
    }

    let customerStats = customers.map((c) => {
      const stats = customerStatsMap.get(c.id)!;
      const entries = Object.entries(stats.routes) as [string, number][];
      const favoriteRoute =
        entries.length > 0
          ? entries.sort((a, b) => b[1] - a[1])[0]?.[0] || null
          : null;
      let badge = "new";
      if (stats.totalTrips > 20) badge = "vip";
      else if (stats.totalTrips > 5) badge = "regular";

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalTrips: stats.totalTrips,
        totalSpending: stats.totalSpending,
        favoriteRoute,
        badge,
        lastTripDate: stats.lastTripDate,
      };
    });

    // Sort
    const sortFieldMap: Record<string, string> = {
      totalSpending: "totalSpending",
      totalTrips: "totalTrips",
      name: "name",
    };
    const sortField = sortFieldMap[sortBy] || "totalTrips";
    customerStats.sort((a: any, b: any) => {
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

    const total = customerStats.length;
    const paginated = customerStats.slice((page - 1) * limit, page * limit);

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
    console.error("Reports customers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
