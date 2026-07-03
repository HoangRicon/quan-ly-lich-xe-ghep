import { describe, expect, it, vi } from "vitest";
import { createTripForAccountInTransaction } from "../lib/trips/create-trip";

vi.mock("../lib/prisma", () => ({
  getCurrentPrismaClient: () => ({}),
  prisma: {},
}));

describe("createTripForAccountInTransaction collection amount", () => {
  it("uu tien thu ho: profit bang thu ho, 0 diem va khong gan cong thuc", async () => {
    const createdAt = new Date("2026-07-03T04:00:00.000Z");
    const tripCreate = vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: 101,
      ...args.data,
      driverId: args.data.driverId ?? null,
      createdAt,
      updatedAt: createdAt,
      driver: { id: 7, fullName: "Tai xe thu ho" },
      customers: [],
    }));
    const eventCreate = vi.fn(async (args: { data: Record<string, unknown> }) => ({
      id: 1,
      ...args.data,
    }));

    const tx = {
      user: {
        findFirst: vi.fn(async () => ({
          id: 7,
          accountId: 3,
          profitRate: 100_000,
          formulaIds: [9],
        })),
      },
      pricingFormula: {
        findMany: vi.fn(async () => [
          {
            id: 9,
            name: "Cong thuc ghep",
            tripType: "ghep",
            seats: 4,
            minPrice: null,
            maxPrice: null,
            points: 2,
            isActive: true,
          },
        ]),
      },
      customer: {
        upsert: vi.fn(),
      },
      trip: {
        create: tripCreate,
      },
      tripEvent: {
        create: eventCreate,
      },
    };

    await createTripForAccountInTransaction(
      tx as never,
      {
        departure: "Ha Noi",
        destination: "Hai Phong",
        departureTime: createdAt,
        price: 450_000,
        totalSeats: 4,
        tripType: "ghep",
        driverId: 7,
        collectionAmount: "75.000",
      } as never,
      { accountId: 3, actorId: 5 }
    );

    expect(tripCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collectionAmount: 75_000,
          profit: 75_000,
          pointsEarned: 0,
          profitRate: null,
          matchedFormulaId: null,
        }),
      })
    );
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profit: 75_000,
          pointsEarned: 0,
          profitRate: null,
          formulaId: null,
          formulaName: null,
        }),
      })
    );
  });
});
