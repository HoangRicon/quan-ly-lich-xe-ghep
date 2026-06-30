import assert from "node:assert/strict";

import { parseReportDateRange } from "@/lib/reports/date-range";
import { calculateOverviewReport } from "@/lib/reports/overview-report";
import {
  buildDriverReportRows,
  getDriverReport,
} from "@/lib/reports/driver-report";
import { getDriverTripHistory } from "@/lib/reports/driver-trip-history";
import {
  changePercent,
  percent,
  reportStatusBucket,
  toDayKey,
  toMonthKey,
} from "@/lib/reports/trip-metrics";

assert.equal(percent(3, 5), 60);
assert.equal(percent(0, 0), 0);
assert.equal(percent(1, 3), 33.3);

assert.equal(changePercent(120, 100), 20);
assert.equal(changePercent(80, 100), -20);
assert.equal(changePercent(50, 0), 100);
assert.equal(changePercent(0, 0), 0);

assert.equal(
  toDayKey(new Date("2026-06-18T17:30:00.000Z")),
  "2026-06-19"
);
assert.equal(
  toMonthKey(new Date("2026-06-18T17:30:00.000Z")),
  "2026-06"
);

assert.equal(reportStatusBucket({ status: "completed", driverId: null }), "completed");
assert.equal(reportStatusBucket({ status: "cancelled", driverId: 7 }), "cancelled");
assert.equal(reportStatusBucket({ status: "scheduled", driverId: null }), "unassigned");
assert.equal(reportStatusBucket({ status: "scheduled", driverId: 7 }), "assigned");
assert.equal(reportStatusBucket({ status: "running", driverId: 7 }), "assigned");

const range = parseReportDateRange("2026-06-19", "2026-06-20");
assert.equal(range.current.gte?.toISOString(), "2026-06-18T17:00:00.000Z");
assert.equal(range.current.lte?.toISOString(), "2026-06-20T16:59:59.999Z");
assert.equal(
  parseReportDateRange("2026-06-19", "2026-06-19").current.lte?.toISOString(),
  "2026-06-19T16:59:59.999Z"
);
assert.equal(range.previousRange?.gte?.toISOString(), "2026-06-16T17:00:00.000Z");
assert.equal(range.previousRange?.lte?.toISOString(), "2026-06-18T16:59:59.999Z");

const overview = calculateOverviewReport([
  {
    id: 1,
    status: "completed",
    driverId: 9,
    price: 500000,
    profit: 150000,
    expense: 25000,
    pointsEarned: 2,
    createdAt: new Date("2026-06-18T17:30:00.000Z"),
    departureTime: new Date("2026-06-20T02:00:00.000Z"),
  },
  {
    id: 2,
    status: "scheduled",
    driverId: 9,
    price: 999999,
    profit: 999999,
    createdAt: new Date("2026-06-19T04:00:00.000Z"),
    departureTime: new Date("2026-06-20T04:00:00.000Z"),
  },
] as Parameters<typeof calculateOverviewReport>[0]);

assert.equal(overview.totalTrips, 2);
assert.equal(overview.completedTrips, 1);
assert.equal(overview.totalRevenue, 500000);
assert.equal(overview.totalProfit, 150000);
assert.equal(overview.totalExpense, 25000);
assert.equal(overview.netProfit, 125000);
assert.equal(overview.assignedRevenue, 999999);
assert.equal(overview.assignedProfit, 999999);
assert.equal(overview.projectedRevenue, 1499999);
assert.equal(overview.projectedProfit, 1149999);
assert.deepEqual(overview.revenueByDay, [
  { date: "2026-06-20", revenue: 500000, profit: 150000, trips: 1 },
]);
assert.equal(overview.statusCounts.assigned, 1);
assert.equal(overview.revenueByStatus.completed, 500000);
assert.equal(overview.revenueByStatus.assigned, 0);

const driverRows = buildDriverReportRows({
  drivers: [
    { id: 1, fullName: "Anh A", phone: "1" },
    { id: 2, fullName: "Chi B", phone: "2" },
    { id: 3, fullName: "Dung C", phone: "3" },
    { id: 4, fullName: "Em D", phone: "4" },
  ],
  trips: [
    {
      id: 101,
      driverId: 1,
      status: "completed",
      price: 500,
      profit: 100,
      pointsEarned: 2,
      createdAt: new Date("2026-06-19T02:00:00.000Z"),
    },
    {
      id: 102,
      driverId: 2,
      status: "completed",
      price: 400,
      profit: 80,
      pointsEarned: 1,
      createdAt: new Date("2026-06-19T03:00:00.000Z"),
    },
    {
      id: 103,
      driverId: 3,
      status: "completed",
      price: 300,
      profit: 60,
      pointsEarned: 1,
      createdAt: new Date("2026-06-19T04:00:00.000Z"),
    },
    {
      id: 104,
      driverId: 4,
      status: "scheduled",
      price: 900,
      profit: 0,
      createdAt: new Date("2026-06-19T05:00:00.000Z"),
    },
  ],
  assignmentEvents: [
    {
      tripId: 101,
      toDriverId: 1,
      createdAt: new Date("2026-06-19T01:00:00.000Z"),
    },
  ],
  completionEvents: [
    {
      tripId: 101,
      createdAt: new Date("2026-06-19T08:00:00.000Z"),
    },
  ],
});

assert.equal(driverRows[0].badge, "top");
assert.equal(driverRows[0].lastAssignedAt, "2026-06-19T01:00:00.000Z");
assert.equal(driverRows[0].lastCompletedAt, "2026-06-19T08:00:00.000Z");
assert.equal(driverRows[3].badge, "normal");

const assignmentPointRows = buildDriverReportRows({
  drivers: [{ id: 10, fullName: "Zom Theo Gio", phone: "10" }],
  trips: [
    {
      id: 301,
      driverId: 10,
      status: "scheduled",
      price: 900,
      profit: 0,
      pointsEarned: 1,
      createdAt: new Date("2026-06-19T05:00:00.000Z"),
    },
  ],
  assignmentEvents: [
    {
      tripId: 301,
      toDriverId: 10,
      createdAt: new Date("2026-06-19T06:15:00.000Z"),
      pointsEarned: 2.5,
      profit: 2500,
      profitRate: 1000,
      formulaId: 99,
      formulaName: "Khung 13h-15h",
    },
  ],
});

assert.equal(assignmentPointRows[0].totalTrips, 1);
assert.equal(assignmentPointRows[0].totalPoints, 2.5);
assert.equal(assignmentPointRows[0].assignedPointProfit, 2500);
assert.equal(assignmentPointRows[0].projectedRevenue, 900);
assert.equal(assignmentPointRows[0].projectedProfit, 2500);
assert.equal(assignmentPointRows[0].lastAssignedAt, "2026-06-19T06:15:00.000Z");

const driverSpecificSnapshotRows = buildDriverReportRows({
  drivers: [
    { id: 19, fullName: "Zom Cu", phone: "19" },
    { id: 20, fullName: "Zom Moi", phone: "20" },
  ],
  trips: [
    {
      id: 302,
      driverId: 20,
      status: "scheduled",
      price: 900,
      profit: 1000,
      pointsEarned: 1,
      createdAt: new Date("2026-06-19T05:00:00.000Z"),
    },
  ],
  assignmentEvents: [
    {
      tripId: 302,
      toDriverId: 19,
      createdAt: new Date("2026-06-19T06:15:00.000Z"),
      pointsEarned: 9,
      profit: 9000,
    },
  ],
});

assert.equal(driverSpecificSnapshotRows[1].totalTrips, 1);
assert.equal(driverSpecificSnapshotRows[1].totalPoints, 1);
assert.equal(driverSpecificSnapshotRows[1].assignedPointProfit, 1000);

async function main() {
  const findManyCalls: Array<{ model: string; args: Record<string, unknown> }> = [];
  const driverReport = await getDriverReport(
    {
      user: {
        findMany: async (args: unknown) => {
          findManyCalls.push({ model: "user", args: args as Record<string, unknown> });
          return [
            { id: 1, fullName: "Anh A", phone: "1" },
            { id: 2, fullName: "Chi B", phone: "2" },
          ];
        },
      },
      trip: {
        findMany: async (args: unknown) => {
          findManyCalls.push({ model: "trip", args: args as Record<string, unknown> });
          return [
            {
              id: 201,
              driverId: 1,
              status: "completed",
              price: 100,
              profit: 10,
              pointsEarned: 1,
              createdAt: new Date("2026-06-19T01:00:00.000Z"),
            },
            {
              id: 202,
              driverId: 2,
              status: "completed",
              price: 200,
              profit: 20,
              pointsEarned: 1,
              createdAt: new Date("2026-06-19T02:00:00.000Z"),
            },
          ];
        },
      },
      tripEvent: {
        findMany: async (args: unknown) => {
          findManyCalls.push({ model: "tripEvent", args: args as Record<string, unknown> });
          return [];
        },
      },
    },
    {
      accountId: 1,
      driverId: 2,
      page: Number.NaN,
      limit: Number.POSITIVE_INFINITY,
    }
  );

  assert.equal(driverReport.data[0].id, 2);
  assert.equal(driverReport.pagination.page, 1);
  assert.equal(driverReport.pagination.limit, 20);
  assert.deepEqual(
    (
      findManyCalls.find((call) => call.model === "tripEvent")?.args
        .where as { tripId?: unknown } | undefined
    )?.tripId,
    { in: [201, 202] }
  );
  assert.deepEqual(findManyCalls[0].args.orderBy, [
    { fullName: "asc" },
    { id: "asc" },
  ]);
  const userWhere = findManyCalls[0].args.where as { role?: unknown; id?: unknown };
  assert.equal(userWhere.role, "driver");
  assert.equal(userWhere.id, 2);

  const assignedAxisReport = await getDriverReport(
    {
      user: {
        findMany: async () => [{ id: 2, fullName: "Chi B", phone: "2" }],
      },
      trip: {
        findMany: async (args: unknown) => {
          const where = (args as { where?: Record<string, unknown> }).where ?? {};
          if ("createdAt" in where) return [];
          return [
            {
              id: 601,
              driverId: 2,
              status: "scheduled",
              price: 300000,
              profit: 1000,
              pointsEarned: 1,
              createdAt: new Date("2026-06-01T01:00:00.000Z"),
            },
          ];
        },
      },
      tripEvent: {
        findMany: async () => [
          {
            tripId: 601,
            toDriverId: 2,
            createdAt: new Date("2026-06-19T06:15:00.000Z"),
            pointsEarned: 3,
            profit: 3000,
            profitRate: 1000,
            formulaId: 100,
            formulaName: "Khung gan trong ky",
          },
        ],
      },
    },
    {
      accountId: 1,
      driverId: 2,
      dateBasis: "assignedAt",
      current: parseReportDateRange("2026-06-19", "2026-06-19").current,
    }
  );

  assert.equal(assignedAxisReport.data[0].totalTrips, 1);
  assert.equal(assignedAxisReport.data[0].totalPoints, 3);
  assert.equal(assignedAxisReport.data[0].assignedPointProfit, 3000);
  assert.equal(
    assignedAxisReport.data[0].lastAssignedAt,
    "2026-06-19T06:15:00.000Z"
  );

  const historyCalls: Array<{ model: string; args: Record<string, unknown> }> = [];
  const history = await getDriverTripHistory(
    {
      trip: {
        findMany: async (args: unknown) => {
          historyCalls.push({ model: "trip", args: args as Record<string, unknown> });
          return [
            {
              id: 501,
              title: "Cuoc kiem tra",
              departure: "A",
              destination: "B",
              createdAt: new Date("2026-06-19T01:00:00.000Z"),
              departureTime: new Date("2026-06-20T01:00:00.000Z"),
              status: "scheduled",
              price: 300000,
              profit: 1000,
              profitRate: 1000,
              pointsEarned: 1,
              matchedFormulaId: 88,
            },
          ];
        },
      },
      tripEvent: {
        findMany: async (args: unknown) => {
          historyCalls.push({ model: "tripEvent", args: args as Record<string, unknown> });
          return [
            {
              tripId: 501,
              toDriverId: 2,
              createdAt: new Date("2026-06-19T06:15:00.000Z"),
              pointsEarned: 2.5,
              profit: 2500,
              profitRate: 1000,
              formulaId: 99,
              formulaName: "Khung 13h-15h",
            },
          ];
        },
      },
    },
    {
      accountId: 1,
      driverId: 2,
      current: parseReportDateRange("2026-06-19", "2026-06-19").current,
      page: 1,
      limit: 10,
    }
  );

  assert.equal(history.data[0].tripId, 501);
  assert.equal(history.data[0].departure, "A");
  assert.equal(history.data[0].destination, "B");
  assert.equal(history.data[0].lastAssignedAt, "2026-06-19T06:15:00.000Z");
  assert.equal(history.data[0].pointsEarned, 2.5);
  assert.equal(history.data[0].profit, 2500);
  assert.equal(history.data[0].formulaName, "Khung 13h-15h");
  assert.deepEqual(
    (historyCalls.find((call) => call.model === "tripEvent")?.args.where as { type?: unknown })
      .type,
    { in: ["driver_assigned", "driver_changed"] }
  );

  const assignedAxisHistory = await getDriverTripHistory(
    {
      trip: {
        findMany: async (args: unknown) => {
          const where = (args as { where?: Record<string, unknown> }).where ?? {};
          if ("createdAt" in where) return [];
          return [
            {
              id: 602,
              title: "Cuoc gan trong ky",
              departure: "C",
              destination: "D",
              createdAt: new Date("2026-06-01T01:00:00.000Z"),
              departureTime: new Date("2026-06-20T01:00:00.000Z"),
              status: "scheduled",
              price: 350000,
              profit: 1000,
              profitRate: 1000,
              pointsEarned: 1,
              matchedFormulaId: 77,
            },
          ];
        },
      },
      tripEvent: {
        findMany: async () => [
          {
            tripId: 602,
            toDriverId: 2,
            createdAt: new Date("2026-06-19T06:15:00.000Z"),
            pointsEarned: 3,
            profit: 3000,
            profitRate: 1000,
            formulaId: 100,
            formulaName: "Khung gan trong ky",
          },
        ],
      },
    },
    {
      accountId: 1,
      driverId: 2,
      dateBasis: "assignedAt",
      current: parseReportDateRange("2026-06-19", "2026-06-19").current,
    }
  );

  assert.equal(assignedAxisHistory.data[0].tripId, 602);
  assert.equal(assignedAxisHistory.data[0].departure, "C");
  assert.equal(assignedAxisHistory.data[0].destination, "D");
  assert.equal(
    assignedAxisHistory.data[0].lastAssignedAt,
    "2026-06-19T06:15:00.000Z"
  );
  assert.equal(assignedAxisHistory.data[0].pointsEarned, 3);

  console.log("verify-report-metrics: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
