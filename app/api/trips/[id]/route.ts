import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  findMatchingFormula,
  applyFormula,
  TripMatchInput,
} from "@/lib/formula-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            formulaIds: true,
            formula: {
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
            },
          },
        },
        customers: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const mainCustomer = trip.customers[0]?.customer;

    const formattedTrip = {
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
        formulas: trip.driver.formula?.isActive
          ? [
              {
                id: trip.driver.formula.id,
                name: trip.driver.formula.name,
                tripType: trip.driver.formula.tripType,
                seats: trip.driver.formula.seats,
                minPrice: trip.driver.formula.minPrice ? Number(trip.driver.formula.minPrice) : null,
                maxPrice: trip.driver.formula.maxPrice ? Number(trip.driver.formula.maxPrice) : null,
                points: Number(trip.driver.formula.points),
                isActive: trip.driver.formula.isActive,
              },
            ]
          : [],
      } : null,
      customer: mainCustomer ? {
        id: mainCustomer.id,
        name: mainCustomer.name,
        phone: mainCustomer.phone,
      } : null,
    };

    return NextResponse.json({ success: true, data: formattedTrip });
  } catch (error) {
    console.error("Get trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    const {
      status, driverId, departure, destination, price, profit,
      title, departureTime, totalSeats, notes,
      // customer fields are handled in other endpoints; keep payload compatibility
      customerPhone,
      customerName,
      customerEmail,
      customerNotes,
      tripDirection, recalculate,
    } = await request.json();

    void customerPhone;
    void customerName;
    void customerEmail;
    void customerNotes;

    const updateData: Prisma.TripUncheckedUpdateInput = {};

    // Allow updating status even if the caller sends a falsy value (defensive).
    if (status !== undefined) {
      updateData.status = status;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (driverId !== undefined) {
      updateData.driverId = driverId;
    }

    if (departure !== undefined) {
      updateData.departure = departure;
    }

    if (destination !== undefined) {
      updateData.destination = destination;
    }

    if (price !== undefined) {
      updateData.price = parseFloat(price);
    }

    // Nếu có recalculate=true thì bỏ qua profit thủ công, dùng formula engine
    if (recalculate === true) {
      // Lấy thông tin trip hiện tại để tính toán
      const currentTrip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { customers: true },
      });
      if (!currentTrip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }

      const finalPrice = price !== undefined ? parseFloat(price) : Number(currentTrip.price);
      const finalTotalSeats = totalSeats !== undefined ? parseInt(totalSeats) : currentTrip.totalSeats;
      const finalDirection = tripDirection || currentTrip.tripDirection || "oneway";
      const finalDriverId = driverId !== undefined ? driverId : currentTrip.driverId;

      // Xác định tripType: nếu số ghế đã đặt >= totalSeats thì coi là "bao", ngược lại "ghep"
      const passengerCount = (currentTrip.customers ?? []).reduce((sum, c) => sum + (c.seats || 0), 0);
      const parsedTripType = passengerCount >= finalTotalSeats ? "bao" : "ghep";

      // Lấy profitRate của driver
      let driverProfitRate = 1000;
      let driverFormulaIds: number[] = [];
      if (finalDriverId) {
        const driver = await prisma.user.findUnique({
          where: { id: finalDriverId },
          select: { profitRate: true, formulaIds: true },
        });
        if (driver) {
          driverProfitRate = Number(driver.profitRate);
          driverFormulaIds = Array.isArray(driver.formulaIds) ? driver.formulaIds : [];
        }
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
        price: finalPrice,
        totalSeats: finalTotalSeats,
        tripType: parsedTripType as "ghep" | "bao",
        tripDirection: finalDirection as "oneway" | "roundtrip",
      };

      const normalizedFormulas = allFormulas.map((f) => ({
        id: f.id,
        name: f.name,
        tripType: f.tripType,
        seats: f.seats ?? null,
        minPrice: f.minPrice ? Number(f.minPrice) : null,
        maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
        points: Number(f.points),
      }));

      const matched = findMatchingFormula(normalizedFormulas, tripInput);
      const formulaResult = applyFormula(tripInput, driverProfitRate, matched);

      updateData.pointsEarned = formulaResult.pointsEarned;
      updateData.profitRate = formulaResult.profitRate;
      updateData.profit = formulaResult.profit;
      updateData.matchedFormulaId = formulaResult.matchedFormulaId;
      if (tripDirection !== undefined) updateData.tripDirection = tripDirection;
    } else {
      // Chế độ bình thường: cho phép ghi đè profit thủ công
      if (profit !== undefined) {
        updateData.profit = profit ? parseFloat(profit) : null;
      }
      if (tripDirection !== undefined) updateData.tripDirection = tripDirection;
    }

    if (departureTime !== undefined && departureTime) {
      const parsedDate = new Date(departureTime);
      if (!isNaN(parsedDate.getTime())) {
        updateData.departureTime = parsedDate;
      }
    }

    if (totalSeats !== undefined) {
      updateData.totalSeats = parseInt(totalSeats);
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        driver: { include: { formula: true } },
        customers: {
          include: {
            customer: true,
          },
        },
      },
    });

    const mainCustomer = trip.customers[0]?.customer;
    const formattedTrip = {
      id: trip.id,
      title: trip.title,
      departure: trip.departure,
      destination: trip.destination,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      profit: trip.profit,
      tripDirection: trip.tripDirection,
      pointsEarned: trip.pointsEarned,
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
        formulas: trip.driver.formula?.isActive
          ? [
              {
                id: trip.driver.formula.id,
                name: trip.driver.formula.name,
                tripType: trip.driver.formula.tripType,
                seats: trip.driver.formula.seats,
                minPrice: trip.driver.formula.minPrice ? Number(trip.driver.formula.minPrice) : null,
                maxPrice: trip.driver.formula.maxPrice ? Number(trip.driver.formula.maxPrice) : null,
                points: Number(trip.driver.formula.points),
                isActive: trip.driver.formula.isActive,
              },
            ]
          : [],
      } : null,
      customer: mainCustomer ? {
        id: mainCustomer.id,
        name: mainCustomer.name,
        phone: mainCustomer.phone,
        email: mainCustomer.email,
      } : null,
    };

    const res = NextResponse.json({ success: true, data: formattedTrip });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("Update trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    // Delete trip customers first
    await prisma.tripCustomer.deleteMany({
      where: { tripId },
    });

    // Delete trip
    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
