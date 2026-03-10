import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "totalTrips";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.customer.count({ where }),
    ]);

    // Get trip stats for each customer
    const customerIds = customers.map((c) => c.id);
    const tripCustomers = await prisma.tripCustomer.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds } },
      _count: { id: true },
      _sum: { seats: true },
    });

    const tripStatsMap = new Map();
    tripCustomers.forEach((tc) => {
      tripStatsMap.set(tc.customerId, {
        tripCount: tc._count.id,
        totalSeats: tc._sum.seats || 0,
      });
    });

    // Get favorite route for each customer
    const tripCustomerRoutes = await prisma.tripCustomer.findMany({
      where: { customerId: { in: customerIds } },
      include: {
        trip: {
          select: {
            departure: true,
            destination: true,
          },
        },
      },
    });

    const routeMap = new Map<number, Record<string, number>>();
    tripCustomerRoutes.forEach((tc) => {
      const route = `${tc.trip.departure} - ${tc.trip.destination}`;
      const current = routeMap.get(tc.customerId) || {};
      current[route] = (current[route] || 0) + 1;
      routeMap.set(tc.customerId, current);
    });

    const customersWithStats = customers.map((customer) => {
      const stats = tripStatsMap.get(customer.id) || { tripCount: 0, totalSeats: 0 };
      const routes = routeMap.get(customer.id) || {};
      const entries = Object.entries(routes) as [string, number][];
      const favoriteRoute = entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0]?.[0] || null : null;

      let badge = "new";
      if (customer.totalTrips > 20) badge = "vip";
      else if (customer.totalTrips > 5) badge = "regular";

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        totalTrips: stats.tripCount || customer.totalTrips,
        totalSpending: stats.totalSeats * 150000, // Estimate: 150k per seat
        favoriteRoute,
        badge,
        createdAt: customer.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: customersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
