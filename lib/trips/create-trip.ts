import type { Prisma, PrismaClient } from "@prisma/client";
import {
  applyFormula,
  findMatchingFormula,
  type TripMatchInput,
} from "@/lib/formula-engine";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import { recordDriverAssignmentEvent } from "@/lib/trip-events";

export interface CreateTripInput {
  title?: string;
  description?: string | null;
  departure: string;
  destination: string;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  departureTime: string | Date;
  arrivalTime?: string | Date | null;
  price: number | string;
  totalSeats?: number | string | null;
  tripType?: string | null;
  tripDirection?: string | null;
  notes?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerNotes?: string | null;
  seats?: number | string | null;
  driverId?: number | null;
}

export interface CreateTripContext {
  accountId: number;
  actorId: number | null;
}

export type ParentDb = Pick<PrismaClient, "$transaction"> & PrismaClient;

export class CreateTripError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "CreateTripError";
  }
}

const DECIMAL_10_2_MAX = 99999999.99;
const DECIMAL_15_2_MAX = 9999999999999.99;

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function clampDecimal10_2(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(DECIMAL_10_2_MAX, round2(x)));
}

function sanitizeOptionalDecimal10_2(x: number | null | undefined) {
  if (x == null) return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const r = round2(n);
  if (Math.abs(r) > DECIMAL_10_2_MAX) return null;
  return r;
}

function sanitizeOptionalDecimal15_2(x: number | null | undefined) {
  if (x == null) return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const r = round2(n);
  if (Math.abs(r) > DECIMAL_15_2_MAX) return null;
  return r;
}

function normalizeOptionalText(value: unknown) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function parseVndPrice(value: number | string) {
  const parsedPriceRaw = parseFloat(String(value).replace(/[.,]/g, ""));
  return Number.isFinite(parsedPriceRaw) ? parsedPriceRaw : 0;
}

function parsePositiveIntOrDefault(value: unknown, fallback: number) {
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function createTripForAccount(
  parentDb: ParentDb,
  input: CreateTripInput,
  context: CreateTripContext
) {
  return parentDb.$transaction((tx) =>
    createTripForAccountInTransaction(tx, input, context)
  );
}

export async function createTripForAccountInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateTripInput,
  context: CreateTripContext
) {
  const {
    title,
    description,
    departure,
    destination,
    pickupLocation,
    dropoffLocation,
    departureTime,
    arrivalTime,
    price,
    totalSeats,
    tripType,
    notes,
    customerPhone,
    customerName,
    customerEmail,
    customerNotes,
    seats,
    driverId: requestedDriverId,
    tripDirection,
  } = input;

  if (!departure || !destination || !departureTime || !price) {
    throw new CreateTripError(400, "Missing required fields");
  }

  const txDb = createTenantPrisma(tx, context.accountId);
  const finalTitle = title || `${departure} - ${destination}`;
  const parsedTotalSeats = parsePositiveIntOrDefault(totalSeats, 1);
  const parsedCustomerSeats = parsePositiveIntOrDefault(seats, 1);
  const parsedPrice = parseVndPrice(price);
  const safePrice = clampDecimal10_2(parsedPrice);
  const parsedDirection = tripDirection === "roundtrip" ? "roundtrip" : "oneway";
  const parsedTripType = tripType === "bao" ? "bao" : "ghep";
  const finalDriverId = requestedDriverId || null;

  let formulaResult: ReturnType<typeof applyFormula> = {
    pointsEarned: null,
    profitRate: null,
    profit: null,
    matchedFormulaId: null,
  };
  let matchedFormulaName: string | null = null;

  if (finalDriverId) {
    let driverProfitRate = 1000;
    const driver = await txDb.user.findFirst({
      where: { id: finalDriverId, role: "driver" },
      select: { profitRate: true, formulaIds: true, accountId: true },
    });

    if (driver && driver.accountId === context.accountId) {
      driverProfitRate = Number(driver.profitRate);
    } else {
      throw new CreateTripError(400, "Driver not found in your account");
    }

    const driverFormulaIds = Array.isArray(driver?.formulaIds)
      ? driver.formulaIds
      : [];
    const allFormulas =
      driverFormulaIds.length > 0
        ? await txDb.pricingFormula.findMany({
            where: { id: { in: driverFormulaIds }, isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          })
        : await txDb.pricingFormula.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          });

    const tripInput: TripMatchInput = {
      price: safePrice,
      totalSeats: parsedTotalSeats,
      tripType: parsedTripType,
      tripDirection: parsedDirection,
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

    const matchedFormula = findMatchingFormula(normalizedFormulas, tripInput);
    matchedFormulaName = matchedFormula?.formulaName ?? null;
    formulaResult = applyFormula(tripInput, driverProfitRate, matchedFormula);
  }

  const safePointsEarned = sanitizeOptionalDecimal10_2(
    formulaResult.pointsEarned
  );
  const safeProfit = sanitizeOptionalDecimal10_2(formulaResult.profit);
  const safeProfitRate = sanitizeOptionalDecimal15_2(formulaResult.profitRate);

  let customerId: number | null = null;
  if (customerPhone) {
    const customer = await txDb.customer.upsert({
      where: {
        idx_customers_account_phone: {
          phone: customerPhone,
          accountId: context.accountId,
        },
      },
      create: {
        phone: customerPhone,
        name: customerName || "Khách vãng lai",
        email: customerEmail,
        notes: customerNotes,
      },
      update: {
        totalTrips: { increment: 1 },
      },
    });
    customerId = customer.id;
  }

  const createdTrip = await txDb.trip.create({
    data: {
      title: finalTitle,
      description,
      departure,
      destination,
      pickupLocation: normalizeOptionalText(pickupLocation),
      dropoffLocation: normalizeOptionalText(dropoffLocation),
      departureTime: new Date(departureTime),
      arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
      price: safePrice,
      tripDirection: parsedDirection,
      tripType: parsedTripType,
      ...(finalDriverId ? { driverId: finalDriverId } : {}),
      ...(context.actorId ? { createdById: context.actorId } : {}),
      totalSeats: parsedTotalSeats,
      status: "scheduled",
      ...(notes ? { notes } : {}),
      pointsEarned: safePointsEarned,
      profitRate: safeProfitRate,
      profit: safeProfit,
      matchedFormulaId: formulaResult.matchedFormulaId,
      ...(customerId
        ? {
            customers: {
              create: {
                customerId,
                seats: parsedCustomerSeats,
                status: "confirmed",
                notes: customerNotes,
                accountId: context.accountId,
              },
            },
          }
        : {}),
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

  if (createdTrip.driverId) {
    await recordDriverAssignmentEvent(txDb, {
      tripId: createdTrip.id,
      accountId: context.accountId,
      fromDriverId: null,
      toDriverId: createdTrip.driverId,
      actorId: context.actorId,
      createdAt: createdTrip.createdAt,
      pointsEarned: safePointsEarned,
      profit: safeProfit,
      profitRate: safeProfitRate,
      formulaId: formulaResult.matchedFormulaId,
      formulaName: matchedFormulaName,
    });
  }

  return createdTrip;
}
