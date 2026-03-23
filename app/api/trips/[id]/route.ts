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
            profitRate: true,
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

    // Fetch all formulas that this driver has access to
    let driverFormulas: Array<{
      id: number;
      name: string;
      tripType: string;
      seats: number | null;
      minPrice: number | null;
      maxPrice: number | null;
      points: number;
      isActive: boolean;
    }> = [];
    if (trip.driver && trip.driver.formulaIds && trip.driver.formulaIds.length > 0) {
      const formulas = await prisma.pricingFormula.findMany({
        where: { id: { in: trip.driver.formulaIds } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      driverFormulas = formulas.map(f => ({
        id: f.id,
        name: f.name,
        tripType: f.tripType,
        seats: f.seats ?? null,
        minPrice: f.minPrice ? Number(f.minPrice) : null,
        maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
        points: Number(f.points),
        isActive: f.isActive,
      }));
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
      profit: trip.profit != null ? Number(trip.profit) : null,
      tripDirection: trip.tripDirection,
      tripType: (trip as any).tripType || "ghep",
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
        formulas: driverFormulas,
      } : null,
      customer: mainCustomer ? {
        id: mainCustomer.id,
        name: mainCustomer.name,
        phone: mainCustomer.phone,
      } : null,
      customers: trip.customers,
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
      tripDirection, tripType, recalculate,
    } = await request.json();

    void customerPhone;
    void customerName;
    void customerEmail;
    void customerNotes;

    const DECIMAL_10_2_MAX = 99999999.99;
    const DECIMAL_15_2_MAX = 9999999999999.99;
    const round2 = (x: number) => Math.round(x * 100) / 100;
    const clampDecimal10_2 = (x: number) => {
      if (!Number.isFinite(x)) return 0;
      return Math.max(0, Math.min(DECIMAL_10_2_MAX, round2(x)));
    };
    const sanitizeOptionalDecimal10_2 = (x: number | null | undefined) => {
      if (x == null) return null;
      const n = Number(x);
      if (!Number.isFinite(n)) return null;
      const r = round2(n);
      if (Math.abs(r) > DECIMAL_10_2_MAX) return null;
      return r;
    };
    const sanitizeOptionalDecimal15_2 = (x: number | null | undefined) => {
      if (x == null) return null;
      const n = Number(x);
      if (!Number.isFinite(n)) return null;
      const r = round2(n);
      if (Math.abs(r) > DECIMAL_15_2_MAX) return null;
      return r;
    };
    const parseVndNumber = (v: unknown) => {
      const n = parseFloat(String(v ?? "").replace(/[.,]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    };

    const updateData: Prisma.TripUpdateInput = {};

    // Allow updating status even if the caller sends a falsy value (defensive).
    if (status !== undefined) {
      updateData.status = status;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (driverId !== undefined) {
      // Prisma schema dùng field quan hệ `driver`, không dùng scalar `driverId` trực tiếp trong update
      updateData.driver =
        driverId === null
          ? { disconnect: true }
          : { connect: { id: driverId as number } };
    }

    if (departure !== undefined) {
      updateData.departure = departure;
    }

    if (destination !== undefined) {
      updateData.destination = destination;
    }

    if (price !== undefined) {
      const n = parseVndNumber(price);
      if (Number.isFinite(n)) updateData.price = clampDecimal10_2(n);
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

      const finalPriceRaw = price !== undefined ? parseVndNumber(price) : Number(currentTrip.price);
      const finalPrice = Number.isFinite(finalPriceRaw) ? clampDecimal10_2(finalPriceRaw) : clampDecimal10_2(Number(currentTrip.price));

      const finalTotalSeatsParsed = totalSeats !== undefined ? parseInt(String(totalSeats), 10) : currentTrip.totalSeats;
      const finalTotalSeats = Number.isFinite(finalTotalSeatsParsed) && finalTotalSeatsParsed > 0 ? finalTotalSeatsParsed : currentTrip.totalSeats;
      const finalDirection = tripDirection || currentTrip.tripDirection || "oneway";
      const finalDriverId = driverId !== undefined ? driverId : currentTrip.driverId;

      // Normalize tripType đầu vào về 2 loại "ghep" | "bao" (formula engine sẽ tự map theo tripDirection).
      // Lưu ý: frontend có thể gửi tripType dạng "*_roundtrip", nên không được suy sai bằng passengerCount.
      const normalizeBaseTripType = (t: unknown): "ghep" | "bao" | null => {
        if (t === "ghep" || t === "ghep_roundtrip") return "ghep";
        if (t === "bao" || t === "bao_roundtrip") return "bao";
        return null;
      };

      const parsedTripTypeFromReq = normalizeBaseTripType(tripType);
      const parsedTripTypeFromCurrent = normalizeBaseTripType((currentTrip as any).tripType);

      // Ưu tiên tripType đã lưu trong DB. Chỉ fallback sang suy luận passengerCount khi không có thông tin hợp lệ.
      let parsedTripType: "ghep" | "bao";
      if (parsedTripTypeFromReq) {
        parsedTripType = parsedTripTypeFromReq;
      } else if (parsedTripTypeFromCurrent) {
        parsedTripType = parsedTripTypeFromCurrent;
      } else {
        const passengerCount = (currentTrip.customers ?? []).reduce(
          (sum, c) => sum + (c.seats || 0),
          0
        );
        parsedTripType = passengerCount >= finalTotalSeats && passengerCount > 0 ? "bao" : "ghep";
      }

      // Chỉ tính profit/points khi đã có driverId (tức là đã chọn Zom)
      if (!finalDriverId) {
        updateData.pointsEarned = null;
        updateData.profitRate = null;
        updateData.profit = null;
        updateData.matchedFormulaId = null;
      } else {
        // Lấy profitRate + công thức được phép của driver
        const driver = await prisma.user.findUnique({
          where: { id: finalDriverId },
          select: { profitRate: true, formulaIds: true },
        });

        let driverProfitRate = 1000;
        const driverFormulaIds = Array.isArray(driver?.formulaIds) ? driver!.formulaIds : [];
        if (driver) driverProfitRate = Number(driver.profitRate);

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

        updateData.pointsEarned = sanitizeOptionalDecimal10_2(formulaResult.pointsEarned);
        updateData.profitRate = sanitizeOptionalDecimal15_2(formulaResult.profitRate);
        updateData.profit = sanitizeOptionalDecimal10_2(formulaResult.profit);
        updateData.matchedFormulaId = formulaResult.matchedFormulaId;
      }
      if (tripDirection !== undefined) updateData.tripDirection = tripDirection;
      if (tripType !== undefined) updateData.tripType = tripType;
    } else {
      // Chế độ bình thường: cho phép ghi đè profit thủ công
      if (profit !== undefined) {
        if (profit === null || profit === "") {
          updateData.profit = null;
        } else {
          const n = parseVndNumber(profit);
          updateData.profit = Number.isFinite(n) ? sanitizeOptionalDecimal10_2(n) : null;
        }
      }
      if (tripDirection !== undefined) updateData.tripDirection = tripDirection;
      if (tripType !== undefined) updateData.tripType = tripType;
    }

    if (departureTime !== undefined && departureTime) {
      const parsedDate = new Date(departureTime);
      if (!isNaN(parsedDate.getTime())) {
        updateData.departureTime = parsedDate;
      }
    }

    if (totalSeats !== undefined) {
      const n = parseInt(String(totalSeats), 10);
      if (Number.isFinite(n) && n > 0) updateData.totalSeats = n;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            formulaIds: true,
            profitRate: true,
            formula: { select: { isActive: true } },
          },
        },
        customers: {
          include: {
            customer: true,
          },
        },
      },
    });

    // Fetch all formulas for the driver
    let putDriverFormulas: Array<{
      id: number;
      name: string;
      tripType: string;
      seats: number | null;
      minPrice: number | null;
      maxPrice: number | null;
      points: number;
      isActive: boolean;
    }> = [];
    if (trip.driver && trip.driver.formulaIds && trip.driver.formulaIds.length > 0) {
      const formulas = await prisma.pricingFormula.findMany({
        where: { id: { in: trip.driver.formulaIds } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      putDriverFormulas = formulas.map(f => ({
        id: f.id,
        name: f.name,
        tripType: f.tripType,
        seats: f.seats ?? null,
        minPrice: f.minPrice ? Number(f.minPrice) : null,
        maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
        points: Number(f.points),
        isActive: f.isActive,
      }));
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
      profit: trip.profit != null ? Number(trip.profit) : null,
      tripDirection: trip.tripDirection,
      tripType: (trip as any).tripType || "ghep",
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
        formulas: putDriverFormulas,
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
