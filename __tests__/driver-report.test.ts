import { describe, expect, it, vi } from "vitest";
import {
  buildDriverReportRows,
  getDriverReport,
} from "../lib/reports/driver-report";

describe("getDriverReport", () => {
  it("mac dinh loc theo ngay di de khop trang cuoc xe", async () => {
    const current = {
      gte: new Date("2026-06-28T17:00:00.000Z"),
      lte: new Date("2026-06-29T16:59:59.999Z"),
    };
    const trip = {
      id: 101,
      driverId: 42,
      status: "completed",
      price: 100_000,
      profit: 20_000,
      pointsEarned: 3,
      createdAt: new Date("2026-06-10T03:00:00.000Z"),
      departureTime: new Date("2026-06-29T03:00:00.000Z"),
    };
    const tripFindMany = vi.fn(async (args: unknown) => {
      const where = (args as { where?: Record<string, unknown> }).where ?? {};
      return "departureTime" in where ? [trip] : [];
    });

    const db = {
      user: {
        findMany: vi.fn(async () => [
          { id: 42, fullName: "Tai xe ngay di", phone: "0900000000" },
        ]),
      },
      trip: {
        findMany: tripFindMany,
      },
      tripEvent: {
        findMany: vi.fn(async () => []),
      },
    };

    const result = await getDriverReport(db, {
      accountId: 1,
      current,
      driverId: 42,
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 42,
      totalTrips: 1,
      completedTrips: 1,
      totalRevenue: 100_000,
      totalProfit: 20_000,
      totalPoints: 3,
      assignedPointProfit: 20_000,
      lastAssignedAt: null,
    });
    expect(tripFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          departureTime: current,
        }),
      }),
    );
  });

  it("van ho tro loc legacy theo ngay gan khi chon assignedAt", async () => {
    const createdAt = new Date("2026-06-10T03:00:00.000Z");
    const current = {
      gte: new Date("2026-06-01T00:00:00.000Z"),
      lte: new Date("2026-06-30T23:59:59.999Z"),
    };
    const legacyTrip = {
      id: 101,
      driverId: 42,
      status: "completed",
      price: 100_000,
      profit: 20_000,
      pointsEarned: 3,
      createdAt,
      departureTime: new Date("2026-06-29T03:00:00.000Z"),
    };
    const tripFindMany = vi.fn(async (args: unknown) => {
      const where = (args as { where?: Record<string, unknown> }).where ?? {};
      return "createdAt" in where ? [legacyTrip] : [];
    });

    const db = {
      user: {
        findMany: vi.fn(async () => [
          { id: 42, fullName: "Tai xe legacy", phone: "0900000000" },
        ]),
      },
      trip: {
        findMany: tripFindMany,
      },
      tripEvent: {
        findMany: vi.fn(async () => []),
      },
    };

    const result = await getDriverReport(db, {
      accountId: 1,
      current,
      dateBasis: "assignedAt",
      driverId: 42,
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 42,
      totalTrips: 1,
      completedTrips: 1,
      totalRevenue: 100_000,
      totalProfit: 20_000,
      totalPoints: 3,
      assignedPointProfit: 20_000,
      lastAssignedAt: createdAt.toISOString(),
    });
    expect(tripFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: current,
          NOT: expect.objectContaining({
            events: expect.objectContaining({
              some: expect.objectContaining({
                type: expect.objectContaining({
                  in: ["driver_assigned", "driver_changed"],
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });
});

describe("buildDriverReportRows", () => {
  it("khong cong diem va cong cua cuoc da huy", () => {
    const rows = buildDriverReportRows({
      drivers: [{ id: 42, fullName: "Tai xe A", phone: "0900000000" }],
      trips: [
        {
          id: 201,
          driverId: 42,
          status: "completed",
          price: 100_000,
          profit: 20_000,
          pointsEarned: 3,
          createdAt: new Date("2026-06-10T03:00:00.000Z"),
          departureTime: new Date("2026-06-29T03:00:00.000Z"),
        },
        {
          id: 202,
          driverId: 42,
          status: "cancelled",
          price: 200_000,
          profit: 50_000,
          pointsEarned: 9,
          createdAt: new Date("2026-06-11T03:00:00.000Z"),
          departureTime: new Date("2026-06-30T03:00:00.000Z"),
        },
      ],
      assignmentEvents: [
        {
          id: 1,
          tripId: 201,
          toDriverId: 42,
          createdAt: new Date("2026-06-10T04:00:00.000Z"),
          pointsEarned: 3,
          profit: 20_000,
        },
        {
          id: 2,
          tripId: 202,
          toDriverId: 42,
          createdAt: new Date("2026-06-11T04:00:00.000Z"),
          pointsEarned: 9,
          profit: 50_000,
        },
      ],
    });

    expect(rows[0]).toMatchObject({
      totalTrips: 2,
      completedTrips: 1,
      cancelledTrips: 1,
      totalPoints: 3,
      assignedPointProfit: 20_000,
      totalRevenue: 100_000,
      totalProfit: 20_000,
    });
  });
});
