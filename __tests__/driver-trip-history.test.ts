import { describe, expect, it, vi } from "vitest";
import { getDriverTripHistory } from "../lib/reports/driver-trip-history";

describe("getDriverTripHistory", () => {
  it("tra departure va destination rieng de doi chieu dung voi trang cuoc xe", async () => {
    const trip = {
      id: 901,
      title: "Cuoc doi chieu tuyen",
      departure: "HN - Pho Co",
      destination: "HP → Cat Ba",
      createdAt: new Date("2026-06-19T01:00:00.000Z"),
      departureTime: new Date("2026-06-20T01:00:00.000Z"),
      status: "scheduled",
      price: 300_000,
      profit: 1000,
      profitRate: 1000,
      pointsEarned: 1,
      matchedFormulaId: 88,
    };

    const db = {
      trip: {
        findMany: vi.fn(async () => [trip]),
      },
      tripEvent: {
        findMany: vi.fn(async () => []),
      },
    };

    const result = await getDriverTripHistory(db, {
      accountId: 1,
      driverId: 7,
      page: 1,
      limit: 20,
    });

    expect(result.data[0]).toMatchObject({
      tripId: 901,
      departure: "HN - Pho Co",
      destination: "HP → Cat Ba",
      route: "HN - Pho Co - HP → Cat Ba",
    });
  });

  it("uu tien diem va loi nhuan hien tai cua cuoc thay vi snapshot cong thuc cu", async () => {
    const trip = {
      id: 902,
      title: "Cuoc da sua loi nhuan",
      departure: "BV dai hoc y hn",
      destination: "Hcc thuy nguyen",
      createdAt: new Date("2026-06-19T01:00:00.000Z"),
      departureTime: new Date("2026-06-20T01:00:00.000Z"),
      status: "completed",
      price: 400_000,
      profit: 400_000,
      profitRate: 300_000,
      pointsEarned: 1.3333333333,
      matchedFormulaId: 88,
    };

    const staleAssignment = {
      id: 10,
      tripId: 902,
      toDriverId: 7,
      createdAt: new Date("2026-06-19T02:00:00.000Z"),
      pointsEarned: 0.5,
      profit: 150_000,
      profitRate: 300_000,
      formulaId: 88,
      formulaName: "Ghep",
    };

    const db = {
      trip: {
        findMany: vi.fn(async () => [trip]),
      },
      tripEvent: {
        findMany: vi.fn(async () => [staleAssignment]),
      },
    };

    const result = await getDriverTripHistory(db, {
      accountId: 1,
      driverId: 7,
      page: 1,
      limit: 20,
    });

    expect(result.data[0]).toMatchObject({
      tripId: 902,
      pointsEarned: 1.3333333333,
      profit: 400_000,
      profitRate: 300_000,
      formulaId: 88,
      formulaName: "Ghep",
    });
  });
});
