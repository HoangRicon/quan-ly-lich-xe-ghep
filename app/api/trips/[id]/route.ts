import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";
import {
  findMatchingFormula,
  applyFormula,
  calculatePointsFromProfit,
  TripMatchInput,
} from "@/lib/formula-engine";
import {
  validateStatusTransition,
  resolveStatusAfterDriverChange,
} from "@/lib/trip-status-transitions";
import {
  recordDriverAssignmentEvent,
  recordStatusEvents,
} from "@/lib/trip-events";

class TripMutationError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "TripMutationError";
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    const { id } = await params;
    const tripId = parseInt(id);

    const trip = await db.trip.findFirst({
      where: { id: tripId, accountId: user.accountId },
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
      const formulas = await db.pricingFormula.findMany({
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
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      profit: trip.profit != null ? Number(trip.profit) : null,
      collectionAmount: trip.collectionAmount != null ? Number(trip.collectionAmount) : null,
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
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    const { id } = await params;
    const tripId = parseInt(id);

    const body = await request.json();
    const {
      status, driverId, departure, destination, pickupLocation, dropoffLocation, price, profit, collectionAmount, expense,
      title, departureTime, totalSeats, notes,
      customerPhone,
      customerName,
      customerEmail,
      customerNotes,
      tripDirection, tripType, recalculate,
    } = body || {};

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
    const normalizeOptionalText = (value: unknown) => {
      if (value === null || value === "") return null;
      return String(value).trim() || null;
    };

    const trip = await db.$parent.$transaction(async (tx: Prisma.TransactionClient) => {
      const txDb = createTenantPrisma(tx, user.accountId);
      const db = txDb;

    const updateData: Prisma.TripUpdateInput = {};
    let effectiveProfitRate: number | null = null;
    let assignmentFormulaName: string | null = null;
    const rememberProfitRate = (value: unknown) => {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) {
        effectiveProfitRate = n;
      }
    };
    const hasManualProfitInput = profit !== undefined;
    const hasCollectionAmountInput = collectionAmount !== undefined;
    const applyManualProfitInput = () => {
      if (profit === null || profit === "") {
        updateData.profit = null;
        updateData.pointsEarned = null;
      } else {
        const n = parseVndNumber(profit);
        const manualProfit = Number.isFinite(n) ? sanitizeOptionalDecimal10_2(n) : null;
        updateData.profit = manualProfit;

        if (manualProfit != null && effectiveProfitRate != null) {
          updateData.pointsEarned = sanitizeOptionalDecimal10_2(
            calculatePointsFromProfit(manualProfit, effectiveProfitRate)
          );
          updateData.profitRate = sanitizeOptionalDecimal15_2(effectiveProfitRate);
        }
      }
    };
    const applyCollectionAmountInput = () => {
      if (collectionAmount === null || collectionAmount === "") {
        updateData.collectionAmount = null;
        return;
      }

      const n = parseVndNumber(collectionAmount);
      if (!Number.isFinite(n)) {
        throw new TripMutationError(400, "Thu hộ không hợp lệ");
      }

      const safeCollectionAmount = sanitizeOptionalDecimal10_2(n);
      if (safeCollectionAmount == null) {
        throw new TripMutationError(400, "Thu hộ không hợp lệ");
      }
      updateData.collectionAmount = safeCollectionAmount;
      updateData.profit = safeCollectionAmount;
      updateData.pointsEarned = 0;
      updateData.profitRate = null;
      updateData.matchedFormulaId = null;
      assignmentFormulaName = null;
    };

    // Lock current trip row before deriving event "from" values.
    const [currentTripForValidation] = await tx.$queryRaw<
      Array<{
        id: number;
        accountId: number;
        status: string;
        driverId: number | null;
        profitRate: unknown;
      }>
    >`
      SELECT
        "id",
        "account_id" AS "accountId",
        "status",
        "driver_id" AS "driverId",
        "profit_rate" AS "profitRate"
      FROM "trips"
      WHERE "id" = ${tripId}
        AND "account_id" = ${user.accountId}
      FOR UPDATE
    `;
    if (!currentTripForValidation) {
      throw new TripMutationError(404, "Trip not found");
    }
    const currentStatus = currentTripForValidation.status;
    const oldDriverId = currentTripForValidation.driverId;
    rememberProfitRate(currentTripForValidation.profitRate);

    // DriverId thực tế sẽ được áp dụng sau khi merge input với DB state.
    const requestedDriverId =
      driverId === undefined ? undefined : driverId === null ? null : Number(driverId);

    if (driverId !== undefined && requestedDriverId !== null) {
      if (!Number.isInteger(requestedDriverId)) {
        throw new TripMutationError(400, "Driver not found in your account");
      }

      const driver = await db.user.findFirst({
        where: { id: requestedDriverId, accountId: user.accountId },
        select: { id: true, profitRate: true },
      });

      if (!driver) {
        throw new TripMutationError(400, "Driver not found in your account");
      }
      rememberProfitRate(driver.profitRate);
    }

    const finalDriverId: number | null =
      requestedDriverId !== undefined ? requestedDriverId : oldDriverId;

    // Auto-cascade status khi driverId thay đổi (chỉ khi user không gửi status riêng).
    let cascadedStatus: string | undefined;
    if (driverId !== undefined && status === undefined) {
      cascadedStatus = resolveStatusAfterDriverChange(
        currentStatus,
        oldDriverId,
        finalDriverId
      );
    }

    // Status cuối cùng sẽ ghi vào DB (user gửi → ưu tiên, không gửi → dùng cascade nếu có)
    const finalStatus = status !== undefined ? status : cascadedStatus;

    if (currentStatus === "completed") {
      const requestedKeys = Object.keys(body || {}).filter(
        (key) => (body as Record<string, unknown>)[key] !== undefined
      );
      const hasNonStatusUpdate = requestedKeys.some((key) => key !== "status");

      if (hasNonStatusUpdate) {
        throw new TripMutationError(
          400,
          "Cuốc đã hoàn thành chỉ được đổi trạng thái về Đã gán hoặc Đã hủy trước khi sửa thông tin."
        );
      }
    }

    // Validate transition trước khi ghi (chỉ khi status thực sự thay đổi)
    if (finalStatus !== undefined && finalStatus !== currentStatus) {
      const check = validateStatusTransition(
        currentStatus,
        finalStatus,
        finalDriverId
      );
      if (!check.ok) {
        throw new TripMutationError(400, check.message);
      }
    }

    if (finalStatus !== undefined) {
      updateData.status = finalStatus;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (driverId !== undefined) {
      // Prisma schema dùng field quan hệ `driver`, không dùng scalar `driverId` trực tiếp trong update
      updateData.driver =
        driverId === null
          ? { disconnect: true }
          : { connect: { id: requestedDriverId as number } };
    }

    if (departure !== undefined) {
      updateData.departure = departure;
    }

    if (destination !== undefined) {
      updateData.destination = destination;
    }

    if (pickupLocation !== undefined) {
      updateData.pickupLocation = normalizeOptionalText(pickupLocation);
    }

    if (dropoffLocation !== undefined) {
      updateData.dropoffLocation = normalizeOptionalText(dropoffLocation);
    }

    if (price !== undefined) {
      const n = parseVndNumber(price);
      if (Number.isFinite(n)) updateData.price = clampDecimal10_2(n);
    }

    if (expense !== undefined) {
      if (expense === null || expense === "") {
        updateData.expense = null;
      } else {
        const n = parseVndNumber(expense);
        if (Number.isFinite(n)) {
          updateData.expense = sanitizeOptionalDecimal10_2(n);
        }
      }
    }

    // Recalculate cập nhật điểm/công thức; profit nhập tay sẽ được áp dụng lại sau cùng.
    if (recalculate === true || driverId !== undefined) {
      // Lấy thông tin trip hiện tại để tính toán
      const currentTrip = await db.trip.findFirst({
        where: { id: tripId, accountId: user.accountId },
        include: { customers: true },
      });
      if (!currentTrip) {
        throw new TripMutationError(404, "Trip not found");
      }
      rememberProfitRate(currentTrip.profitRate);

      const finalPriceRaw = price !== undefined ? parseVndNumber(price) : Number(currentTrip.price);
      const finalPrice = Number.isFinite(finalPriceRaw) ? clampDecimal10_2(finalPriceRaw) : clampDecimal10_2(Number(currentTrip.price));

      const finalTotalSeatsParsed = totalSeats !== undefined ? parseInt(String(totalSeats), 10) : currentTrip.totalSeats;
      const finalTotalSeats = Number.isFinite(finalTotalSeatsParsed) && finalTotalSeatsParsed > 0 ? finalTotalSeatsParsed : currentTrip.totalSeats;
      const finalDirection = tripDirection || currentTrip.tripDirection || "oneway";

      // Normalize tripType đầu vào về 2 loại "ghep" | "bao" (formula engine sẽ tự map theo tripDirection).
      // Lưu ý: frontend có thể gửi tripType dạng "*_roundtrip", nên không được suy sai bằng passengerCount.
      const normalizeBaseTripType = (t: unknown): "ghep" | "bao" | null => {
        if (t === "ghep" || t === "ghep_roundtrip") return "ghep";
        if (t === "bao" || t === "bao_roundtrip") return "bao";
        return null;
      };

      const parsedTripTypeFromReq = normalizeBaseTripType(tripType);
      const parsedTripTypeFromCurrent = normalizeBaseTripType(currentTrip.tripType);

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
        effectiveProfitRate = null;
        updateData.pointsEarned = null;
        updateData.profitRate = null;
        updateData.profit = null;
        updateData.matchedFormulaId = null;
      } else {
        // Lấy profitRate + công thức được phép của driver (cùng account)
        const driver = await db.user.findFirst({
          where: { id: finalDriverId, accountId: user.accountId },
          select: { profitRate: true, formulaIds: true },
        });

        let driverProfitRate = 1000;
        const driverFormulaIds = Array.isArray(driver?.formulaIds) ? driver!.formulaIds : [];
        if (driver) {
          const parsedDriverProfitRate = Number(driver.profitRate);
          driverProfitRate =
            Number.isFinite(parsedDriverProfitRate) && parsedDriverProfitRate > 0
              ? parsedDriverProfitRate
              : 1000;
        }
        rememberProfitRate(driverProfitRate);

        const allFormulas =
          driverFormulaIds.length > 0
            ? await db.pricingFormula.findMany({
                where: { id: { in: driverFormulaIds }, isActive: true },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              })
            : await db.pricingFormula.findMany({
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
        assignmentFormulaName = matched?.formulaName ?? null;
        const formulaResult = applyFormula(tripInput, driverProfitRate, matched);

        updateData.pointsEarned = sanitizeOptionalDecimal10_2(formulaResult.pointsEarned);
        updateData.profitRate = sanitizeOptionalDecimal15_2(formulaResult.profitRate);
        updateData.profit = sanitizeOptionalDecimal10_2(formulaResult.profit);
        updateData.matchedFormulaId = formulaResult.matchedFormulaId;
      }
      if (tripDirection !== undefined) updateData.tripDirection = tripDirection;
      if (tripType !== undefined) updateData.tripType = tripType;
    } else {
      if (tripDirection !== undefined) updateData.tripDirection = tripDirection;
      if (tripType !== undefined) updateData.tripType = tripType;
    }

    if (hasManualProfitInput && finalDriverId && effectiveProfitRate == null) {
      const driver = await db.user.findFirst({
        where: { id: finalDriverId, accountId: user.accountId },
        select: { profitRate: true },
      });
      rememberProfitRate(driver?.profitRate);
    }

    if (hasManualProfitInput) {
      applyManualProfitInput();
    }

    if (hasCollectionAmountInput) {
      applyCollectionAmountInput();
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

    // ============================================================
    // Xử lý cập nhật thông tin khách hàng
    // ============================================================
    // Lấy TripCustomer hiện tại của chuyến (cùng account)
    const existingTripCustomers = await db.tripCustomer.findMany({
      where: { trip: { id: tripId, accountId: user.accountId } },
      include: { customer: true },
    });
    const existingTripCustomer = existingTripCustomers[0];
    const existingCustomer = existingTripCustomer?.customer;

    if (customerPhone !== undefined) {
      if (customerPhone === null || customerPhone === "") {
        // Xóa hết khách hàng khỏi chuyến
        if (existingTripCustomers.length > 0) {
          await db.tripCustomer.deleteMany({
            where: { trip: { id: tripId, accountId: user.accountId } },
          });
        }
      } else {
        // Tìm hoặc tạo customer theo số điện thoại (cùng account)
        let targetCustomer = await db.customer.findFirst({
          where: { phone: customerPhone, accountId: user.accountId },
        });

        if (!targetCustomer) {
          targetCustomer = await db.customer.create({
            data: {
              phone: customerPhone,
              name: customerName || "Khách vãng lai",
              email: customerEmail,
              notes: customerNotes,
            },
          });
        }

        const newCustomerId = targetCustomer.id;
        const isSameCustomer =
          existingCustomer && existingCustomer.id === newCustomerId;

        if (isSameCustomer) {
          // Cùng khách — chỉ cập nhật name/email/notes của Customer
          await db.customer.update({
            where: { id: newCustomerId, accountId: user.accountId },
            data: {
              ...(customerName !== undefined ? { name: customerName || "Khách vãng lai" } : {}),
              ...(customerEmail !== undefined ? { email: customerEmail || null } : {}),
              ...(customerNotes !== undefined ? { notes: customerNotes || null } : {}),
            },
          });
        } else {
          // Khách khác — xóa TripCustomer cũ, cập nhật Customer, tạo TripCustomer mới
          if (existingTripCustomers.length > 0) {
            await db.tripCustomer.deleteMany({
              where: { trip: { id: tripId, accountId: user.accountId } },
            });
          }
          // Cập nhật thông tin Customer (nếu có name mới)
          await db.customer.update({
            where: { id: newCustomerId, accountId: user.accountId },
            data: {
              name: customerName || targetCustomer.name,
              email: customerEmail !== undefined ? (customerEmail || null) : targetCustomer.email,
              notes: customerNotes !== undefined ? (customerNotes || null) : targetCustomer.notes,
            },
          });
          // Tạo TripCustomer mới
          await db.tripCustomer.create({
            data: {
              tripId,
              customerId: newCustomerId,
              seats: 1,
              status: "confirmed",
            },
          });
        }
      }
    } else if (customerName !== undefined && existingCustomer) {
      // Không đổi sđt nhưng đổi tên
      await db.customer.update({
        where: { id: existingCustomer.id, accountId: user.accountId },
        data: {
          name: customerName || "Khách vãng lai",
          email: customerEmail !== undefined ? (customerEmail || null) : existingCustomer.email,
          notes: customerNotes !== undefined ? (customerNotes || null) : existingCustomer.notes,
        },
      });
    }

      const updatedTrip = await db.trip.update({
        where: { id: tripId, accountId: user.accountId },
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

      await recordDriverAssignmentEvent(db, {
        tripId: updatedTrip.id,
        accountId: currentTripForValidation.accountId,
        fromDriverId: oldDriverId,
        toDriverId: updatedTrip.driverId,
        actorId: user.id,
        pointsEarned:
          updatedTrip.pointsEarned != null ? Number(updatedTrip.pointsEarned) : null,
        profit: updatedTrip.profit != null ? Number(updatedTrip.profit) : null,
        profitRate:
          updatedTrip.profitRate != null ? Number(updatedTrip.profitRate) : null,
        formulaId: updatedTrip.matchedFormulaId,
        formulaName: assignmentFormulaName,
      });

      await recordStatusEvents(db, {
        tripId: updatedTrip.id,
        accountId: currentTripForValidation.accountId,
        fromStatus: currentStatus,
        toStatus: updatedTrip.status,
        actorId: user.id,
      });

      return updatedTrip;
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
      const formulas = await db.pricingFormula.findMany({
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
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      profit: trip.profit != null ? Number(trip.profit) : null,
      collectionAmount: trip.collectionAmount != null ? Number(trip.collectionAmount) : null,
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
    if (error instanceof TripMutationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Update trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);

    const { id } = await params;
    const tripId = parseInt(id);

    // Verify trip belongs to this account first
    const trip = await db.trip.findFirst({
      where: { id: tripId, accountId: user.accountId },
      select: { id: true },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Delete trip customers first
    await db.tripCustomer.deleteMany({
      where: { trip: { id: tripId, accountId: user.accountId } },
    });

    // Delete trip
    await db.trip.delete({
      where: { id: tripId, accountId: user.accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
