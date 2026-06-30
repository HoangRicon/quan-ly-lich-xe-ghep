import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";
import { parseReportDateRange } from "@/lib/reports/date-range";
import {
  createTripForAccount,
  CreateTripError,
} from "@/lib/trips/create-trip";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const driverId = searchParams.get("driverId");
    const customerPhone = searchParams.get("customerPhone");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "500");

    const where: Prisma.TripWhereInput = {
      accountId: user.accountId,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (driverId) {
      where.driverId = parseInt(driverId);
    }

    if (customerPhone) {
      where.customers = {
        some: {
          customer: {
            phone: customerPhone,
          },
        },
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { departure: { contains: q, mode: "insensitive" } },
        { destination: { contains: q, mode: "insensitive" } },
        { pickupLocation: { contains: q, mode: "insensitive" } },
        { dropoffLocation: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { driver: { fullName: { contains: q, mode: "insensitive" } } },
        { customers: { some: { customer: { phone: { contains: q } } } } },
        { customers: { some: { customer: { name: { contains: q, mode: "insensitive" } } } } },
      ];
    }

    const tripDateRange = date
      ? parseReportDateRange(date, date).current
      : parseReportDateRange(startDate, endDate).current;
    if (Object.keys(tripDateRange).length > 0) {
      where.departureTime = tripDateRange;
    }

    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      db.trip.findMany({
        where,
        skip,
        take: limit,
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              formulaIds: true,
              profitRate: true,
            },
          },
          customers: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: customerPhone ? { departureTime: "desc" } : { departureTime: "asc" },
      }),
      db.trip.count({ where }),
    ]);

    // `User` does not have a `formulas` relation. It stores allowed formula ids in `formulaIds`.
    // Fetch active formulas once, then attach to each driver in the formatted response.
    const allFormulaIds = Array.from(
      new Set(
        trips
          .flatMap((t) => t.driver?.formulaIds ?? [])
          .filter((id): id is number => typeof id === "number")
      )
    );

    type FormulaLite = Prisma.PricingFormulaGetPayload<{
      select: {
        id: true;
        name: true;
        tripType: true;
        seats: true;
        minPrice: true;
        maxPrice: true;
        points: true;
        isActive: true;
      };
    }>;

    const formulasById = new Map<number, FormulaLite>();
    if (allFormulaIds.length > 0) {
      const formulas: FormulaLite[] = await db.pricingFormula.findMany({
        where: {
          id: { in: allFormulaIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          tripType: true,
          seats: true,
          minPrice: true,
          maxPrice: true,
          points: true,
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      for (const f of formulas) formulasById.set(f.id, f);
    }

    const formattedTrips = trips.map((trip) => {
      const driverFormulasRaw = trip.driver
        ? (trip.driver.formulaIds ?? [])
            .map((id) => formulasById.get(id))
            .filter((f): f is FormulaLite => Boolean(f))
        : [];

      return {
        id: trip.id,
        title: trip.title,
        departure: trip.departure,
        destination: trip.destination,
        pickupLocation: trip.pickupLocation,
        dropoffLocation: trip.dropoffLocation,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        price: trip.price,
        profit: trip.profit != null ? Number(trip.profit) : null,
        expense: trip.expense != null ? Number(trip.expense) : null,
        tripDirection: trip.tripDirection,
        tripType: trip.tripType || "ghep",
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
          profitRate: trip.driver.profitRate ? Number(trip.driver.profitRate) : 1000,
          formulas: driverFormulasRaw.map((f) => ({
            id: f.id,
            name: f.name,
            tripType: f.tripType,
            seats: f.seats,
            minPrice: f.minPrice ? Number(f.minPrice) : null,
            maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
            points: Number(f.points),
            isActive: f.isActive,
          })),
        } : null,
        customer: trip.customers[0]?.customer ? {
          id: trip.customers[0].customer.id,
          name: trip.customers[0].customer.name,
          phone: trip.customers[0].customer.phone,
          email: trip.customers[0].customer.email,
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
      };
    });

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

    // Avoid any intermediary/proxy/browser caching for frequently-updated dashboard data.
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("Get trips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.title || !body.departure || !body.destination || !body.departureTime || !body.price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const trip = await createTripForAccount(prisma, body, {
      accountId: user.accountId,
      actorId: user.id,
    });

    // Format response
    const mainCustomer = trip.customers[0]?.customer;
    const formattedTrip = {
      id: trip.id,
      title: trip.title,
      departure: trip.departure,
      destination: trip.destination,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      tripDirection: trip.tripDirection,
      tripType: trip.tripType || "ghep",
      pointsEarned: trip.pointsEarned != null ? Number(trip.pointsEarned) : null,
      profitRate: trip.profitRate ? Number(trip.profitRate) : null,
      profit: trip.profit ? Number(trip.profit) : null,
      expense: trip.expense != null ? Number(trip.expense) : null,
      matchedFormulaId: trip.matchedFormulaId,
      status: trip.status,
      totalSeats: trip.totalSeats,
      driver: trip.driver ? {
        id: trip.driver.id,
        fullName: trip.driver.fullName,
        phone: trip.driver.phone,
      } : null,
      customer: mainCustomer ? {
        id: mainCustomer.id,
        name: mainCustomer.name,
        phone: mainCustomer.phone,
        email: mainCustomer.email,
      } : null,
      createdAt: trip.createdAt,
    };

    return NextResponse.json({
      success: true,
      data: formattedTrip,
    });
  } catch (error) {
    if (error instanceof CreateTripError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Create trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
