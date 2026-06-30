import type { ReportRangeFilter } from "@/lib/reports/date-range";
import {
  changePercent,
  percent,
  reportStatusBucket,
  sumMoney,
  toDayKey,
  toMoneyNumber,
  toMonthKey,
  type ReportStatusBucket,
} from "@/lib/reports/trip-metrics";

type TripFindManyDb = {
  trip: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

export type OverviewReportInput = {
  accountId: number;
  current?: ReportRangeFilter;
  dateRange?: ReportRangeFilter;
  previousRange?: ReportRangeFilter;
  driverId?: number | null;
};

export type OverviewTrip = {
  status: string;
  driverId?: number | null;
  price: unknown;
  profit?: unknown;
  createdAt: Date;
};

export type RevenuePeriodPoint = {
  revenue: number;
  profit: number;
  trips: number;
};

export type OverviewReport = {
  totalTrips: number;
  totalRevenue: number;
  totalProfit: number;
  assignedRevenue: number;
  assignedProfit: number;
  projectedRevenue: number;
  projectedProfit: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  cancelRate: number;
  avgTripValue: number;
  avgProfitPerTrip: number;
  revenueByDay: Array<{ date: string } & RevenuePeriodPoint>;
  revenueByMonth: Array<{ month: string } & RevenuePeriodPoint>;
  statusDistribution: Array<{
    bucket: ReportStatusBucket;
    label: string;
    count: number;
    percent: number;
  }>;
  statusCounts: Record<ReportStatusBucket, number>;
  revenueByStatus: Record<ReportStatusBucket, number>;
  revenueChangePercent: number;
  profitChangePercent: number;
  tripsChangePercent: number;
};

const STATUS_LABELS: Record<ReportStatusBucket, string> = {
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  assigned: "Đã gán",
  unassigned: "Chưa gán",
};

const BUCKETS: ReportStatusBucket[] = [
  "completed",
  "cancelled",
  "assigned",
  "unassigned",
];

function emptyStatusCounts(): Record<ReportStatusBucket, number> {
  return {
    completed: 0,
    cancelled: 0,
    assigned: 0,
    unassigned: 0,
  };
}

function emptyStatusMoney(): Record<ReportStatusBucket, number> {
  return {
    completed: 0,
    cancelled: 0,
    assigned: 0,
    unassigned: 0,
  };
}

function addRevenuePoint(
  map: Map<string, RevenuePeriodPoint>,
  key: string,
  trip: OverviewTrip
) {
  const existing = map.get(key) ?? { revenue: 0, profit: 0, trips: 0 };
  map.set(key, {
    revenue: existing.revenue + toMoneyNumber(trip.price),
    profit: existing.profit + toMoneyNumber(trip.profit),
    trips: existing.trips + 1,
  });
}

function overviewTripSelect() {
  return {
    status: true,
    driverId: true,
    price: true,
    profit: true,
    createdAt: true,
  };
}

function buildDriverWhere(input: OverviewReportInput) {
  return input.driverId ? { driverId: input.driverId } : {};
}

function buildCreatedAtWhere(range: ReportRangeFilter | undefined) {
  return range && Object.keys(range).length > 0 ? { createdAt: range } : {};
}

async function fetchTripsForRange(
  db: TripFindManyDb,
  input: OverviewReportInput,
  range: ReportRangeFilter | undefined,
) {
  return (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      ...buildCreatedAtWhere(range),
      ...buildDriverWhere(input),
    },
    select: overviewTripSelect(),
  })) as OverviewTrip[];
}

export function calculateOverviewReport(
  trips: OverviewTrip[],
  previousTrips: OverviewTrip[] = []
): OverviewReport {
  const totalTrips = trips.length;
  const completedOnly = trips.filter((trip) => trip.status === "completed");
  const assignedOnly = trips.filter((trip) => reportStatusBucket(trip) === "assigned");
  const projectedTrips = trips.filter((trip) => {
    const bucket = reportStatusBucket(trip);
    return bucket === "completed" || bucket === "assigned";
  });
  const totalRevenue = sumMoney(completedOnly, (trip) => trip.price);
  const totalProfit = sumMoney(completedOnly, (trip) => trip.profit);
  const assignedRevenue = sumMoney(assignedOnly, (trip) => trip.price);
  const assignedProfit = sumMoney(assignedOnly, (trip) => trip.profit);
  const projectedRevenue = sumMoney(projectedTrips, (trip) => trip.price);
  const projectedProfit = sumMoney(projectedTrips, (trip) => trip.profit);

  const statusCounts = emptyStatusCounts();
  for (const trip of trips) {
    statusCounts[reportStatusBucket(trip)] += 1;
  }

  const completedTrips = statusCounts.completed;
  const assignedTrips = statusCounts.assigned;
  const unassignedTrips = statusCounts.unassigned;
  const cancelledTrips = statusCounts.cancelled;

  const revenueByDayMap = new Map<string, RevenuePeriodPoint>();
  const revenueByMonthMap = new Map<string, RevenuePeriodPoint>();
  const revenueByStatus = emptyStatusMoney();
  for (const trip of completedOnly) {
    addRevenuePoint(revenueByDayMap, toDayKey(trip.createdAt), trip);
    addRevenuePoint(revenueByMonthMap, toMonthKey(trip.createdAt), trip);
    revenueByStatus[reportStatusBucket(trip)] += toMoneyNumber(trip.price);
  }

  const previousCompletedOnly = previousTrips.filter((trip) => trip.status === "completed");
  const previousRevenue = sumMoney(previousCompletedOnly, (trip) => trip.price);
  const previousProfit = sumMoney(previousCompletedOnly, (trip) => trip.profit);

  return {
    totalTrips,
    totalRevenue,
    totalProfit,
    assignedRevenue,
    assignedProfit,
    projectedRevenue,
    projectedProfit,
    completedTrips,
    assignedTrips,
    unassignedTrips,
    cancelledTrips,
    completionRate: percent(completedTrips, totalTrips),
    cancelRate: percent(cancelledTrips, totalTrips),
    avgTripValue: completedTrips > 0 ? totalRevenue / completedTrips : 0,
    avgProfitPerTrip: completedTrips > 0 ? totalProfit / completedTrips : 0,
    revenueByDay: Array.from(revenueByDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    revenueByMonth: Array.from(revenueByMonthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    statusDistribution: BUCKETS.map((bucket) => ({
      bucket,
      label: STATUS_LABELS[bucket],
      count: statusCounts[bucket],
      percent: percent(statusCounts[bucket], totalTrips),
    })),
    statusCounts,
    // Deprecated compatibility alias for recognized revenue by bucket.
    // New UI should prefer statusDistribution/statusCounts for operational distribution.
    revenueByStatus,
    revenueChangePercent: changePercent(totalRevenue, previousRevenue),
    profitChangePercent: changePercent(totalProfit, previousProfit),
    tripsChangePercent: changePercent(totalTrips, previousTrips.length),
  };
}

export async function getOverviewReport(
  db: TripFindManyDb,
  input: OverviewReportInput
): Promise<OverviewReport> {
  const currentRange = input.current ?? input.dateRange;
  const trips = await fetchTripsForRange(db, input, currentRange);

  const previousTrips = input.previousRange
    ? await fetchTripsForRange(db, input, input.previousRange)
    : [];

  return calculateOverviewReport(trips, previousTrips);
}
