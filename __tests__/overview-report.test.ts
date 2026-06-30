import { describe, expect, it, vi } from "vitest";
import {
  calculateOverviewReport,
  getOverviewReport,
} from "../lib/reports/overview-report";

describe("calculateOverviewReport", () => {
  it("chi cong doanh thu va loi nhuan ghi nhan tu cuoc completed", () => {
    const currentTrips = [
      {
        status: "completed",
        price: 100_000,
        profit: 25_000,
        expense: 5_000,
        createdAt: new Date("2026-06-10T03:00:00.000Z"),
        departureTime: new Date("2026-06-11T03:00:00.000Z"),
      },
      {
        status: "assigned",
        driverId: 11,
        price: 300_000,
        profit: 90_000,
        expense: 30_000,
        createdAt: new Date("2026-06-11T03:00:00.000Z"),
        departureTime: new Date("2026-06-12T03:00:00.000Z"),
      },
    ];

    const previousTrips = [
      {
        status: "completed",
        price: 80_000,
        profit: 20_000,
        createdAt: new Date("2026-06-01T03:00:00.000Z"),
        departureTime: new Date("2026-06-02T03:00:00.000Z"),
      },
      {
        status: "assigned",
        driverId: 11,
        price: 50_000,
        profit: 15_000,
        createdAt: new Date("2026-06-02T03:00:00.000Z"),
        departureTime: new Date("2026-06-03T03:00:00.000Z"),
      },
    ];

    const report = calculateOverviewReport(currentTrips as never[], previousTrips as never[]);

    expect(report.totalTrips).toBe(2);
    expect(report.completedTrips).toBe(1);
    expect(report.assignedTrips).toBe(1);
    expect(report.totalRevenue).toBe(100_000);
    expect(report.totalProfit).toBe(25_000);
    expect(report.totalExpense).toBe(5_000);
    expect(report.netProfit).toBe(20_000);
    expect(report.revenueByDay).toEqual([
      {
        date: "2026-06-11",
        revenue: 100_000,
        profit: 25_000,
        trips: 1,
      },
    ]);
    expect(report.revenueByMonth).toEqual([
      {
        month: "2026-06",
        revenue: 100_000,
        profit: 25_000,
        trips: 1,
      },
    ]);
    expect(report.revenueChangePercent).toBe(25);
    expect(report.profitChangePercent).toBe(25);
  });
});

describe("getOverviewReport", () => {
  it("neo bao cao tong quan vao ngay di de khop trang cuoc xe", async () => {
    const current = {
      gte: new Date("2026-06-10T00:00:00.000Z"),
      lte: new Date("2026-06-10T23:59:59.999Z"),
    };
    const trip = {
      id: 201,
      status: "completed",
      driverId: 7,
      price: 100_000,
      profit: 25_000,
      createdAt: new Date("2026-06-09T03:00:00.000Z"),
      departureTime: new Date("2026-06-10T03:00:00.000Z"),
    };
    const findMany = vi.fn(async (args: unknown) => {
      const where = (args as { where?: Record<string, unknown> }).where ?? {};
      return "departureTime" in where ? [trip] : [];
    });

    const db = {
      trip: {
        findMany,
      },
    };

    const report = await getOverviewReport(db, {
      accountId: 1,
      current,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 1,
          departureTime: current,
        }),
      }),
    );
    expect(report.totalTrips).toBe(1);
    expect(report.totalRevenue).toBe(100_000);
    expect(report.totalProfit).toBe(25_000);
    expect(report.revenueByDay).toEqual([
      {
        date: "2026-06-10",
        revenue: 100_000,
        profit: 25_000,
        trips: 1,
      },
    ]);
  });

  it("doi truc loc tong quan theo dateBasis duoc chon", async () => {
    const current = {
      gte: new Date("2026-06-10T00:00:00.000Z"),
      lte: new Date("2026-06-10T23:59:59.999Z"),
    };
    const trip = {
      id: 202,
      status: "completed",
      driverId: 7,
      price: 120_000,
      profit: 30_000,
      createdAt: new Date("2026-06-10T03:00:00.000Z"),
      departureTime: new Date("2026-06-29T03:00:00.000Z"),
    };
    const findMany = vi.fn(async (args: unknown) => {
      const where = (args as { where?: Record<string, unknown> }).where ?? {};
      return "createdAt" in where ? [trip] : [];
    });

    const report = await getOverviewReport(
      {
        trip: {
          findMany,
        },
      },
      {
        accountId: 1,
        current,
        dateBasis: "createdAt",
      },
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 1,
          createdAt: current,
        }),
      }),
    );
    expect(report.totalTrips).toBe(1);
    expect(report.totalRevenue).toBe(120_000);
  });
});
