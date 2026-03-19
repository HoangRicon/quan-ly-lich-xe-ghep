import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import {
  findMatchingFormula,
  applyFormula,
  TripMatchInput,
} from "@/lib/formula-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const driverId = searchParams.get("driverId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "500");

    const where: Prisma.TripWhereInput = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (driverId) {
      where.driverId = parseInt(driverId);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.departureTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.departureTime = {
        gte: start,
        lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.departureTime = {
        gte: start,
      };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.departureTime = {
        lte: end,
      };
    }

    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
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
            },
          },
          customers: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: { departureTime: "asc" },
      }),
      prisma.trip.count({ where }),
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
      const formulas: FormulaLite[] = await prisma.pricingFormula.findMany({
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
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        price: trip.price,
        profit: trip.profit,
        tripDirection: trip.tripDirection,
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
    const body = await request.json();
    const {
      title, description, departure, destination, departureTime, arrivalTime,
      price, totalSeats, tripType, notes,
      customerPhone, customerName, customerEmail, customerNotes,
      seats, driverId: requestedDriverId, tripDirection,
    } = body;

    const parsedTotalSeats = parseInt(totalSeats) || 4;
    const parsedPrice = parseFloat(price) || 0;
    const parsedDirection = tripDirection === "roundtrip" ? "roundtrip" : "oneway";

    if (!title || !departure || !destination || !departureTime || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Handle customer - create or get existing
    let customerId = null;
    if (customerPhone) {
      let customer = await prisma.customer.findUnique({
        where: { phone: customerPhone },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: customerPhone,
            name: customerName || "Khách vãng lai",
            email: customerEmail,
            notes: customerNotes,
          },
        });
      }

      customerId = customer.id;

      await prisma.customer.update({
        where: { id: customerId },
        data: { totalTrips: { increment: 1 } },
      });
    }

    // Determine driverId
    const finalDriverId = requestedDriverId || null;

    // Lấy profitRate của driver hoặc mặc định 1000
    let driverProfitRate = 1000;
    if (finalDriverId) {
      const driver = await prisma.user.findUnique({
        where: { id: finalDriverId },
        select: { profitRate: true },
      });
      if (driver) {
        driverProfitRate = Number(driver.profitRate);
      }
    }

    // === FORMULA ENGINE ===
    // Match theo công thức được gán cho Zom (formulaIds) nếu có; nếu không thì fallback: tất cả công thức active
    let driverFormulaIds: number[] = [];
    if (finalDriverId) {
      const driverFormula = await prisma.user.findUnique({
        where: { id: finalDriverId },
        select: { formulaIds: true },
      });
      driverFormulaIds = Array.isArray(driverFormula?.formulaIds) ? driverFormula!.formulaIds : [];
    }

    const allFormulas =
      driverFormulaIds.length > 0
        ? await prisma.pricingFormula.findMany({
            where: { id: { in: driverFormulaIds }, isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : await prisma.pricingFormula.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          });

    const tripInput: TripMatchInput = {
      price: parsedPrice,
      totalSeats: parsedTotalSeats,
      tripType: tripType === "bao" ? "bao" : "ghep",
      tripDirection: parsedDirection,
    };

    const matchedFormula = findMatchingFormula(allFormulas, tripInput);
    const formulaResult = applyFormula(tripInput, driverProfitRate, matchedFormula);

    const trip = await prisma.trip.create({
      data: {
        title,
        description,
        departure,
        destination,
        departureTime: new Date(departureTime),
        arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
        price: parsedPrice,
        tripDirection: parsedDirection,
        ...(finalDriverId ? { driverId: finalDriverId } : {}),
        ...(user ? { createdById: user.id } : {}),
        totalSeats: parsedTotalSeats,
        status: "scheduled",
        ...(notes ? { notes } : {}),
        // Formula fields
        pointsEarned: formulaResult.pointsEarned,
        profitRate: formulaResult.profitRate,
        profit: formulaResult.profit,
        matchedFormulaId: formulaResult.matchedFormulaId,
        ...(customerId ? {
          customers: {
            create: {
              customerId,
              seats: seats || 1,
              status: "confirmed",
              notes: customerNotes,
            },
          },
        } : {}),
      },
      include: {
        driver: true,
        customers: {
          include: {
            customer: true,
          },
        },
      },
    });

    // Format response
    const mainCustomer = trip.customers[0]?.customer;
    const formattedTrip = {
      id: trip.id,
      title: trip.title,
      departure: trip.departure,
      destination: trip.destination,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      tripDirection: trip.tripDirection,
      pointsEarned: trip.pointsEarned != null ? Number(trip.pointsEarned) : null,
      profitRate: trip.profitRate ? Number(trip.profitRate) : null,
      profit: trip.profit ? Number(trip.profit) : null,
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
    console.error("Create trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
