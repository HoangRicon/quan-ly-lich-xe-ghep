import type { ReportRangeFilter } from "@/lib/reports/date-range";
import {
  buildTripDateWhere,
  DEFAULT_REPORT_DATE_BASIS,
  eventTripIds,
  hasReportRange,
  isAssignedProjectionTrip,
  isProjectedTrip,
  REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
  REPORT_TRIP_COMPLETION_EVENT_TYPES,
  type ReportDateBasis,
} from "@/lib/reports/date-basis";
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
  tripEvent?: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

export type OverviewReportInput = {
  accountId: number;
  current?: ReportRangeFilter;
  dateRange?: ReportRangeFilter;
  previousRange?: ReportRangeFilter;
  dateBasis?: ReportDateBasis;
  driverId?: number | null;
};

export type OverviewTrip = {
  id?: number;
  status: string;
  driverId?: number | null;
  price: unknown;
  profit?: unknown;
  pointsEarned?: unknown;
  createdAt: Date;
  departureTime?: Date;
  reportDate?: Date;
};

type OverviewTripEvent = {
  id?: number;
  tripId?: number | null;
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

function latestEventDateByTripId(events: OverviewTripEvent[]) {
  const map = new Map<number, { date: Date; id: number }>();
  for (const event of events) {
    if (event.tripId == null) continue;
    const current = map.get(event.tripId);
    const eventId = event.id ?? 0;
    if (
      !current ||
      event.createdAt > current.date ||
      (event.createdAt.getTime() === current.date.getTime() && eventId > current.id)
    ) {
      map.set(event.tripId, { date: event.createdAt, id: eventId });
    }
  }

  return new Map(Array.from(map.entries()).map(([tripId, value]) => [tripId, value.date]));
}

function reportDateForTrip(
  trip: OverviewTrip,
  dateBasis: ReportDateBasis,
  eventDateByTripId?: Map<number, Date>,
) {
  if (trip.id != null) {
    const eventDate = eventDateByTripId?.get(trip.id);
    if (eventDate) return eventDate;
  }
  if (dateBasis === "departureTime" && trip.departureTime) return trip.departureTime;
  return trip.createdAt;
}

function withReportDates(
  trips: OverviewTrip[],
  dateBasis: ReportDateBasis,
  eventDateByTripId?: Map<number, Date>,
) {
  return trips.map((trip) => ({
    ...trip,
    reportDate: reportDateForTrip(trip, dateBasis, eventDateByTripId),
  }));
}

function overviewTripSelect() {
  return {
    id: true,
    status: true,
    driverId: true,
    price: true,
    profit: true,
    createdAt: true,
    departureTime: true,
    pointsEarned: true,
  };
}

function buildDriverWhere(input: OverviewReportInput) {
  return input.driverId ? { driverId: input.driverId } : {};
}

async function fetchEventsForTripIds(
  db: TripFindManyDb,
  input: OverviewReportInput,
  dateBasis: ReportDateBasis,
  tripIds: number[],
) {
  if (!db.tripEvent || tripIds.length === 0) return [];
  if (dateBasis !== "assignedAt" && dateBasis !== "completedAt") return [];

  return (await db.tripEvent.findMany({
    where: {
      accountId: input.accountId,
      tripId: { in: tripIds },
      type: {
        in:
          dateBasis === "assignedAt"
            ? REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES
            : REPORT_TRIP_COMPLETION_EVENT_TYPES,
      },
      ...(dateBasis === "assignedAt" && input.driverId
        ? { toDriverId: input.driverId }
        : {}),
    },
    select: {
      id: true,
      tripId: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as OverviewTripEvent[];
}

async function fetchEventBackedTrips(
  db: TripFindManyDb,
  input: OverviewReportInput,
  range: ReportRangeFilter,
  dateBasis: ReportDateBasis,
) {
  if (!db.tripEvent) return { trips: [] as OverviewTrip[], eventDateByTripId: new Map<number, Date>() };

  const events = (await db.tripEvent.findMany({
    where: {
      accountId: input.accountId,
      createdAt: range,
      type: {
        in:
          dateBasis === "assignedAt"
            ? REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES
            : REPORT_TRIP_COMPLETION_EVENT_TYPES,
      },
      ...(dateBasis === "assignedAt" && input.driverId
        ? { toDriverId: input.driverId }
        : {}),
    },
    select: {
      id: true,
      tripId: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as OverviewTripEvent[];

  const tripIds = eventTripIds(events);
  const trips =
    tripIds.length > 0
      ? ((await db.trip.findMany({
          where: {
            accountId: input.accountId,
            id: { in: tripIds },
            ...buildDriverWhere(input),
            ...(dateBasis === "completedAt" ? { status: "completed" } : {}),
          },
          select: overviewTripSelect(),
        })) as OverviewTrip[])
      : [];

  return {
    trips,
    eventDateByTripId: latestEventDateByTripId(events),
  };
}

async function fetchTripsForRange(
  db: TripFindManyDb,
  input: OverviewReportInput,
  range: ReportRangeFilter | undefined,
  dateBasis: ReportDateBasis,
) {
  const dateWhere = buildTripDateWhere(dateBasis, range);
  const rangeActive = hasReportRange(range);

  if (!rangeActive || dateWhere) {
    const trips = (await db.trip.findMany({
      where: {
        accountId: input.accountId,
        ...(dateWhere ?? {}),
        ...buildDriverWhere(input),
      },
      select: overviewTripSelect(),
    })) as OverviewTrip[];

    const eventDateByTripId = latestEventDateByTripId(
      await fetchEventsForTripIds(
        db,
        input,
        dateBasis,
        trips
          .map((trip) => trip.id)
          .filter((tripId): tripId is number => tripId != null),
      ),
    );

    return withReportDates(trips, dateBasis, eventDateByTripId);
  }

  const { trips: eventBackedTrips, eventDateByTripId } =
    await fetchEventBackedTrips(db, input, range, dateBasis);
  const eventBackedTripIds = eventBackedTrips
    .map((trip) => trip.id)
    .filter((tripId): tripId is number => tripId != null);

  const legacyTrips = (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      createdAt: range,
      ...buildDriverWhere(input),
      ...(eventBackedTripIds.length > 0 ? { id: { notIn: eventBackedTripIds } } : {}),
      ...(dateBasis === "completedAt" ? { status: "completed" } : {}),
      ...(dateBasis === "assignedAt" && !input.driverId ? { driverId: { not: null } } : {}),
      NOT: {
        events: {
          some: {
            type: {
              in:
                dateBasis === "assignedAt"
                  ? REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES
                  : REPORT_TRIP_COMPLETION_EVENT_TYPES,
            },
          },
        },
      },
    },
    select: overviewTripSelect(),
  })) as OverviewTrip[];

  return withReportDates(
    [...eventBackedTrips, ...legacyTrips],
    dateBasis,
    eventDateByTripId,
  );
}

export function calculateOverviewReport(
  trips: OverviewTrip[],
  previousTrips: OverviewTrip[] = []
): OverviewReport {
  const totalTrips = trips.length;
  const completedOnly = trips.filter((trip) => trip.status === "completed");
  const assignedOnly = trips.filter(isAssignedProjectionTrip);
  const revenueEarning = trips.filter(isProjectedTrip);
  const totalRevenue = sumMoney(completedOnly, (trip) => trip.price);
  const totalProfit = sumMoney(completedOnly, (trip) => trip.profit);
  const assignedRevenue = sumMoney(assignedOnly, (trip) => trip.price);
  const assignedProfit = sumMoney(assignedOnly, (trip) => trip.profit);
  const projectedRevenue = sumMoney(revenueEarning, (trip) => trip.price);
  const projectedProfit = sumMoney(revenueEarning, (trip) => trip.profit);

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
  for (const trip of revenueEarning) {
    const reportDate = trip.reportDate ?? trip.createdAt;
    addRevenuePoint(revenueByDayMap, toDayKey(reportDate), trip);
    addRevenuePoint(revenueByMonthMap, toMonthKey(reportDate), trip);
    revenueByStatus[reportStatusBucket(trip)] += toMoneyNumber(trip.price);
  }

  const previousRevenueEarning = previousTrips.filter(isProjectedTrip);
  const previousRevenue = sumMoney(previousRevenueEarning, (trip) => trip.price);
  const previousProfit = sumMoney(previousRevenueEarning, (trip) => trip.profit);

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
    // Deprecated compatibility alias for the current chart: recognized revenue by bucket.
    // New UI should use statusDistribution/statusCounts for operational distribution.
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
  const dateBasis = input.dateBasis ?? DEFAULT_REPORT_DATE_BASIS;
  const trips = await fetchTripsForRange(db, input, currentRange, dateBasis);

  const previousTrips = input.previousRange
    ? await fetchTripsForRange(db, input, input.previousRange, dateBasis)
    : [];

  return calculateOverviewReport(trips, previousTrips);
}
