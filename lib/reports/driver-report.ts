import type { ReportRangeFilter } from "@/lib/reports/date-range";
import {
  buildTripDateWhere,
  DEFAULT_REPORT_DATE_BASIS,
  eventTripIds,
  hasReportRange,
  isProjectedTrip,
  REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
  REPORT_TRIP_COMPLETION_EVENT_TYPES,
  type ReportDateBasis,
} from "@/lib/reports/date-basis";
import {
  percent,
  reportStatusBucket,
  toMoneyNumber,
  type ReportStatusBucket,
} from "@/lib/reports/trip-metrics";

type DriverReportDb = {
  user: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  trip: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  tripEvent: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

type DriverUser = {
  id: number;
  fullName?: string | null;
  phone?: string | null;
};

type DriverTrip = {
  id: number;
  driverId?: number | null;
  status: string;
  price: unknown;
  profit?: unknown;
  pointsEarned?: unknown;
  createdAt: Date;
  departureTime?: Date;
};

type DriverTripEvent = {
  id?: number;
  tripId?: number | null;
  toDriverId?: number | null;
  createdAt: Date;
  pointsEarned?: unknown;
  profit?: unknown;
  profitRate?: unknown;
  formulaId?: number | null;
  formulaName?: string | null;
};

export type DriverBadge = "top" | "active" | "normal";

export type DriverReportSortKey =
  | "totalRevenue"
  | "totalTrips"
  | "totalProfit"
  | "projectedRevenue"
  | "completedTrips"
  | "completionRate"
  | "cancelRate"
  | "lastAssignedAt"
  | "name";

export type DriverReportInput = {
  accountId: number;
  current?: ReportRangeFilter;
  dateRange?: ReportRangeFilter;
  dateBasis?: ReportDateBasis;
  driverId?: number | null;
  search?: string | null;
  sortBy?: DriverReportSortKey;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type DriverReportRow = {
  id: number;
  name: string;
  fullName: string;
  phone: string;
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  cancelRate: number;
  totalRevenue: number;
  totalProfit: number;
  projectedRevenue: number;
  projectedProfit: number;
  totalPoints: number;
  assignedPointProfit: number;
  avgTripValue: number;
  avgProfitPerCompletedTrip: number;
  lastAssignedAt: string | null;
  lastCompletedAt: string | null;
  badge: DriverBadge;
};

export type DriverReportResult = {
  data: DriverReportRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type DriverReportFetchedTrips = {
  trips: DriverTrip[];
  assignmentEvents: DriverTripEvent[];
  completionEvents?: DriverTripEvent[];
};

type DriverAccumulator = {
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  totalProfit: number;
  projectedRevenue: number;
  projectedProfit: number;
  totalPoints: number;
  assignedPointProfit: number;
};

const SORT_KEYS: DriverReportSortKey[] = [
  "totalRevenue",
  "totalTrips",
  "totalProfit",
  "projectedRevenue",
  "completedTrips",
  "completionRate",
  "cancelRate",
  "lastAssignedAt",
  "name",
];

function newAccumulator(): DriverAccumulator {
  return {
    totalTrips: 0,
    completedTrips: 0,
    assignedTrips: 0,
    unassignedTrips: 0,
    cancelledTrips: 0,
    totalRevenue: 0,
    totalProfit: 0,
    projectedRevenue: 0,
    projectedProfit: 0,
    totalPoints: 0,
    assignedPointProfit: 0,
  };
}

function incrementBucket(stats: DriverAccumulator, bucket: ReportStatusBucket) {
  if (bucket === "completed") stats.completedTrips += 1;
  if (bucket === "assigned") stats.assignedTrips += 1;
  if (bucket === "unassigned") stats.unassignedTrips += 1;
  if (bucket === "cancelled") stats.cancelledTrips += 1;
}

function setMaxDate(map: Map<number, Date>, id: number, date: Date) {
  const current = map.get(id);
  if (!current || date > current) {
    map.set(id, date);
  }
}

function assignmentSnapshotKey(tripId: number, driverId: number): string {
  return `${tripId}:${driverId}`;
}

function isNewerEvent(event: DriverTripEvent, current: DriverTripEvent): boolean {
  if (event.createdAt > current.createdAt) return true;
  if (event.createdAt < current.createdAt) return false;

  return (event.id ?? 0) > (current.id ?? 0);
}

function compareIsoDate(a: string | null, b: string | null): number {
  return (a ? new Date(a).getTime() : 0) - (b ? new Date(b).getTime() : 0);
}

function sortRows(
  rows: DriverReportRow[],
  sortBy: DriverReportSortKey = "totalRevenue",
  sortOrder: "asc" | "desc" = "desc"
): DriverReportRow[] {
  const key = SORT_KEYS.includes(sortBy) ? sortBy : "totalRevenue";
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    let comparison = 0;

    if (key === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (key === "lastAssignedAt") {
      comparison = compareIsoDate(a.lastAssignedAt, b.lastAssignedAt);
    } else {
      comparison = a[key] - b[key];
    }

    if (comparison !== 0) return comparison * direction;

    const nameComparison = a.name.localeCompare(b.name);
    if (nameComparison !== 0) return nameComparison;

    return a.id - b.id;
  });
}

function toIsoStringOrNull(value: Date | undefined): string | null {
  return value ? value.toISOString() : null;
}

function legacyAssignmentEventFromTrip(trip: DriverTrip): DriverTripEvent | null {
  if (trip.driverId == null) return null;

  return {
    tripId: trip.id,
    toDriverId: trip.driverId,
    createdAt: trip.createdAt,
    pointsEarned: trip.pointsEarned,
    profit: trip.profit,
  };
}

function driverTripSelect() {
  return {
    id: true,
    driverId: true,
    status: true,
    price: true,
    profit: true,
    pointsEarned: true,
    createdAt: true,
    departureTime: true,
  };
}

function driverEventSelect() {
  return {
    id: true,
    tripId: true,
    toDriverId: true,
    createdAt: true,
    pointsEarned: true,
    profit: true,
    profitRate: true,
    formulaId: true,
    formulaName: true,
  };
}

async function fetchAssignmentEventsForTrips(
  db: DriverReportDb,
  input: DriverReportInput,
  driverIds: number[],
  trips: DriverTrip[],
) {
  const tripIds = trips.map((trip) => trip.id);
  if (tripIds.length === 0) return [];

  return (await db.tripEvent.findMany({
    where: {
      accountId: input.accountId,
      type: {
        in: REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
      },
      toDriverId: { in: driverIds },
      tripId: { in: tripIds },
    },
    select: driverEventSelect(),
  })) as DriverTripEvent[];
}

async function fetchTripsByDirectDateBasis(
  db: DriverReportDb,
  input: DriverReportInput,
  driverIds: number[],
  dateBasis: ReportDateBasis,
  currentRange: ReportRangeFilter | undefined,
) {
  const dateWhere = buildTripDateWhere(dateBasis, currentRange);
  const trips = (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      driverId: { in: driverIds },
      ...(dateWhere ?? {}),
    },
    select: driverTripSelect(),
  })) as DriverTrip[];

  return {
    trips,
    assignmentEvents: await fetchAssignmentEventsForTrips(
      db,
      input,
      driverIds,
      trips,
    ),
  } satisfies DriverReportFetchedTrips;
}

async function fetchTripsByAssignedAt(
  db: DriverReportDb,
  input: DriverReportInput,
  driverIds: number[],
  currentRange: ReportRangeFilter,
) {
  const eventsInPeriod = (await db.tripEvent.findMany({
    where: {
      accountId: input.accountId,
      type: {
        in: REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
      },
      toDriverId: { in: driverIds },
      createdAt: currentRange,
    },
    select: driverEventSelect(),
  })) as DriverTripEvent[];

  const candidateTripIds = eventTripIds(eventsInPeriod);

  const eventBackedTrips =
    candidateTripIds.length > 0
      ? ((await db.trip.findMany({
          where: {
            accountId: input.accountId,
            id: { in: candidateTripIds },
            driverId: { in: driverIds },
          },
          select: driverTripSelect(),
        })) as DriverTrip[])
      : [];

  const legacyTrips = (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      driverId: { in: driverIds },
      createdAt: currentRange,
      ...(candidateTripIds.length > 0 ? { id: { notIn: candidateTripIds } } : {}),
      NOT: {
        events: {
          some: {
            type: {
              in: REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
            },
          },
        },
      },
    },
    select: driverTripSelect(),
  })) as DriverTrip[];

  const trips = [...eventBackedTrips, ...legacyTrips];
  const currentDriverByTripId = new Map(
    trips
      .filter((trip) => trip.driverId != null)
      .map((trip) => [trip.id, trip.driverId as number]),
  );

  return {
    trips,
    assignmentEvents: [
      ...eventsInPeriod.filter(
        (event) =>
          event.tripId != null &&
          event.toDriverId != null &&
          currentDriverByTripId.get(event.tripId) === event.toDriverId,
      ),
      ...legacyTrips.flatMap((trip) => {
        const event = legacyAssignmentEventFromTrip(trip);
        return event ? [event] : [];
      }),
    ],
  } satisfies DriverReportFetchedTrips;
}

async function fetchTripsByCompletedAt(
  db: DriverReportDb,
  input: DriverReportInput,
  driverIds: number[],
  currentRange: ReportRangeFilter,
) {
  const completionEventsInPeriod = (await db.tripEvent.findMany({
    where: {
      accountId: input.accountId,
      type: {
        in: REPORT_TRIP_COMPLETION_EVENT_TYPES,
      },
      createdAt: currentRange,
    },
    select: {
      id: true,
      tripId: true,
      createdAt: true,
    },
  })) as DriverTripEvent[];

  const candidateTripIds = eventTripIds(completionEventsInPeriod);
  const eventBackedTrips =
    candidateTripIds.length > 0
      ? ((await db.trip.findMany({
          where: {
            accountId: input.accountId,
            id: { in: candidateTripIds },
            driverId: { in: driverIds },
            status: "completed",
          },
          select: driverTripSelect(),
        })) as DriverTrip[])
      : [];

  const legacyTrips = (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      driverId: { in: driverIds },
      status: "completed",
      createdAt: currentRange,
      ...(candidateTripIds.length > 0 ? { id: { notIn: candidateTripIds } } : {}),
      NOT: {
        events: {
          some: {
            type: {
              in: REPORT_TRIP_COMPLETION_EVENT_TYPES,
            },
          },
        },
      },
    },
    select: driverTripSelect(),
  })) as DriverTrip[];

  const trips = [...eventBackedTrips, ...legacyTrips];

  return {
    trips,
    assignmentEvents: await fetchAssignmentEventsForTrips(
      db,
      input,
      driverIds,
      trips,
    ),
    completionEvents: [
      ...completionEventsInPeriod,
      ...legacyTrips.map((trip) => ({
        tripId: trip.id,
        createdAt: trip.createdAt,
      })),
    ],
  } satisfies DriverReportFetchedTrips;
}

function addBadges(rows: DriverReportRow[]): DriverReportRow[] {
  const topDriverIds = new Set(
    [...rows]
      .sort((a, b) => {
        const revenueComparison = b.totalRevenue - a.totalRevenue;
        if (revenueComparison !== 0) return revenueComparison;

        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison !== 0) return nameComparison;

        return a.id - b.id;
      })
      .filter((row) => row.totalTrips > 0)
      .slice(0, 3)
      .map((row) => row.id)
  );

  return rows.map((row) => ({
    ...row,
    badge: topDriverIds.has(row.id)
      ? "top"
      : row.totalTrips > 10
        ? "active"
        : "normal",
  }));
}

export function buildDriverReportRows(input: {
  drivers: DriverUser[];
  trips: DriverTrip[];
  assignmentEvents?: DriverTripEvent[];
  completionEvents?: DriverTripEvent[];
}): DriverReportRow[] {
  const statsByDriverId = new Map<number, DriverAccumulator>();
  const lastAssignedByDriverId = new Map<number, Date>();
  const lastAssignmentByTripAndDriver = new Map<string, DriverTripEvent>();
  const completedEventByTripId = new Map<number, Date>();
  const lastCompletedByDriverId = new Map<number, Date>();

  for (const driver of input.drivers) {
    statsByDriverId.set(driver.id, newAccumulator());
  }

  for (const event of input.assignmentEvents ?? []) {
    if (event.toDriverId == null) continue;
    setMaxDate(lastAssignedByDriverId, event.toDriverId, event.createdAt);
    if (event.tripId != null) {
      const key = assignmentSnapshotKey(event.tripId, event.toDriverId);
      const current = lastAssignmentByTripAndDriver.get(key);
      if (!current || isNewerEvent(event, current)) {
        lastAssignmentByTripAndDriver.set(key, event);
      }
    }
  }

  for (const event of input.completionEvents ?? []) {
    if (event.tripId == null) continue;
    setMaxDate(completedEventByTripId, event.tripId, event.createdAt);
  }

  for (const trip of input.trips) {
    if (trip.driverId == null) continue;
    const stats = statsByDriverId.get(trip.driverId);
    if (!stats) continue;

    stats.totalTrips += 1;
    const bucket = reportStatusBucket(trip);
    incrementBucket(stats, bucket);

    const assignment = lastAssignmentByTripAndDriver.get(
      assignmentSnapshotKey(trip.id, trip.driverId)
    );
    const assignedPoints =
      trip.pointsEarned != null
        ? toMoneyNumber(trip.pointsEarned)
        : assignment && assignment.pointsEarned != null
          ? toMoneyNumber(assignment.pointsEarned)
          : 0;
    const assignedProfit =
      trip.profit != null
        ? toMoneyNumber(trip.profit)
        : assignment && assignment.profit != null
          ? toMoneyNumber(assignment.profit)
          : 0;
    if (bucket !== "cancelled") {
      stats.totalPoints += assignedPoints;
      stats.assignedPointProfit += assignedProfit;
    }

    if (isProjectedTrip(trip)) {
      stats.projectedRevenue += toMoneyNumber(trip.price);
      stats.projectedProfit += assignedProfit;
    }

    if (trip.status === "completed") {
      stats.totalRevenue += toMoneyNumber(trip.price);
      stats.totalProfit += toMoneyNumber(trip.profit);

      // Legacy trips created before trip_events may not have completion events.
      setMaxDate(
        lastCompletedByDriverId,
        trip.driverId,
        completedEventByTripId.get(trip.id) ?? trip.createdAt
      );
    }
  }

  const rows: DriverReportRow[] = input.drivers.map((driver) => {
    const stats = statsByDriverId.get(driver.id) ?? newAccumulator();
    const name = driver.fullName || "N/A";

    return {
      id: driver.id,
      name,
      fullName: name,
      phone: driver.phone || "",
      totalTrips: stats.totalTrips,
      completedTrips: stats.completedTrips,
      assignedTrips: stats.assignedTrips,
      unassignedTrips: stats.unassignedTrips,
      cancelledTrips: stats.cancelledTrips,
      completionRate: percent(stats.completedTrips, stats.totalTrips),
      cancelRate: percent(stats.cancelledTrips, stats.totalTrips),
      totalRevenue: stats.totalRevenue,
      totalProfit: stats.totalProfit,
      projectedRevenue: stats.projectedRevenue,
      projectedProfit: stats.projectedProfit,
      totalPoints: stats.totalPoints,
      assignedPointProfit: stats.assignedPointProfit,
      avgTripValue:
        stats.completedTrips > 0 ? stats.totalRevenue / stats.completedTrips : 0,
      avgProfitPerCompletedTrip:
        stats.completedTrips > 0 ? stats.totalProfit / stats.completedTrips : 0,
      lastAssignedAt: toIsoStringOrNull(lastAssignedByDriverId.get(driver.id)),
      lastCompletedAt: toIsoStringOrNull(lastCompletedByDriverId.get(driver.id)),
      badge: "normal",
    };
  });

  return addBadges(rows);
}

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;

  const intValue = Math.floor(value as number);
  return intValue > 0 ? intValue : fallback;
}

function paginateRows(
  rows: DriverReportRow[],
  pageInput?: number,
  limitInput?: number
): DriverReportResult {
  const page = normalizePositiveInt(pageInput, 1);
  const limit = normalizePositiveInt(limitInput, 20);
  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data: rows.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getDriverReport(
  db: DriverReportDb,
  input: DriverReportInput
): Promise<DriverReportResult> {
  const currentRange = input.current ?? input.dateRange;
  const dateBasis = input.dateBasis ?? DEFAULT_REPORT_DATE_BASIS;
  const drivers = (await db.user.findMany({
    where: {
      accountId: input.accountId,
      role: "driver",
      ...(input.driverId ? { id: input.driverId } : {}),
      ...(input.search
        ? {
            OR: [
              { fullName: { contains: input.search, mode: "insensitive" } },
              { phone: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
    },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
  })) as DriverUser[];

  if (drivers.length === 0) {
    return paginateRows([], input.page, input.limit);
  }

  const driverIds = drivers.map((driver) => driver.id);
  const dateRangeActive = hasReportRange(currentRange);
  const fetched: DriverReportFetchedTrips = dateRangeActive
    ? dateBasis === "assignedAt"
      ? await fetchTripsByAssignedAt(db, input, driverIds, currentRange)
      : dateBasis === "completedAt"
        ? await fetchTripsByCompletedAt(db, input, driverIds, currentRange)
        : await fetchTripsByDirectDateBasis(
            db,
            input,
            driverIds,
            dateBasis,
            currentRange,
          )
    : await fetchTripsByDirectDateBasis(
        db,
        input,
        driverIds,
        dateBasis,
        currentRange,
      );

  const trips = fetched.trips;
  const assignmentEvents = fetched.assignmentEvents;

  const completedTripIds = trips
    .filter((trip) => trip.status === "completed")
    .map((trip) => trip.id);
  const completionEvents =
    fetched.completionEvents ??
    (completedTripIds.length > 0
      ? ((await db.tripEvent.findMany({
          where: {
            accountId: input.accountId,
            type: {
              in: REPORT_TRIP_COMPLETION_EVENT_TYPES,
            },
            tripId: { in: completedTripIds },
          },
          select: {
            id: true,
            tripId: true,
            createdAt: true,
          },
        })) as DriverTripEvent[])
      : []);

  const rows = buildDriverReportRows({
    drivers,
    trips,
    assignmentEvents,
    completionEvents,
  });
  const sortedRows = sortRows(rows, input.sortBy, input.sortOrder);

  return paginateRows(sortedRows, input.page, input.limit);
}
