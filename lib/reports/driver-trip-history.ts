import type { ReportRangeFilter } from "@/lib/reports/date-range";
import {
  buildTripDateWhere,
  DEFAULT_REPORT_DATE_BASIS,
  eventTripIds,
  hasReportRange,
  REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
  REPORT_TRIP_COMPLETION_EVENT_TYPES,
  type ReportDateBasis,
} from "@/lib/reports/date-basis";
import { toMoneyNumber } from "@/lib/reports/trip-metrics";

type DriverTripHistoryDb = {
  trip: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  tripEvent: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

type HistoryTrip = {
  id: number;
  title?: string | null;
  departure: string;
  destination: string;
  createdAt: Date;
  departureTime: Date;
  status: string;
  price: unknown;
  profit?: unknown;
  profitRate?: unknown;
  pointsEarned?: unknown;
  matchedFormulaId?: number | null;
};

type AssignmentEvent = {
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

export type DriverTripHistoryInput = {
  accountId: number;
  driverId: number;
  current?: ReportRangeFilter;
  dateBasis?: ReportDateBasis;
  page?: number;
  limit?: number;
};

export type DriverTripHistoryRow = {
  tripId: number;
  title: string;
  departure: string;
  destination: string;
  route: string;
  createdAt: string;
  departureTime: string;
  lastAssignedAt: string | null;
  status: string;
  statusLabel: string;
  statusColor: string;
  price: number;
  pointsEarned: number;
  profit: number;
  profitRate: number | null;
  formulaId: number | null;
  formulaName: string | null;
};

export type DriverTripHistoryResult = {
  data: DriverTripHistoryRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const intValue = Math.floor(value as number);
  return intValue > 0 ? intValue : fallback;
}

function isNewerEvent(event: AssignmentEvent, current: AssignmentEvent): boolean {
  if (event.createdAt > current.createdAt) return true;
  if (event.createdAt < current.createdAt) return false;

  return (event.id ?? 0) > (current.id ?? 0);
}

function historyTripSelect() {
  return {
    id: true,
    title: true,
    departure: true,
    destination: true,
    createdAt: true,
    departureTime: true,
    status: true,
    price: true,
    profit: true,
    profitRate: true,
    pointsEarned: true,
    matchedFormulaId: true,
  };
}

function assignmentEventSelect() {
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

function legacyAssignmentEventFromTrip(
  trip: HistoryTrip,
  driverId: number,
): AssignmentEvent {
  return {
    tripId: trip.id,
    toDriverId: driverId,
    createdAt: trip.createdAt,
    pointsEarned: trip.pointsEarned,
    profit: trip.profit,
    profitRate: trip.profitRate,
    formulaId: trip.matchedFormulaId,
  };
}

async function fetchAssignmentEventsForTrips(
  db: DriverTripHistoryDb,
  input: DriverTripHistoryInput,
  trips: HistoryTrip[],
) {
  const tripIds = trips.map((trip) => trip.id);
  if (tripIds.length === 0) return [];

  return (await db.tripEvent.findMany({
    where: {
      accountId: input.accountId,
      tripId: { in: tripIds },
      toDriverId: input.driverId,
      type: {
        in: REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
      },
    },
    select: assignmentEventSelect(),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as AssignmentEvent[];
}

async function fetchTripsByDirectDateBasis(
  db: DriverTripHistoryDb,
  input: DriverTripHistoryInput,
  dateBasis: ReportDateBasis,
) {
  const dateWhere = buildTripDateWhere(dateBasis, input.current);
  const trips = (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      driverId: input.driverId,
      ...(dateWhere ?? {}),
    },
    select: historyTripSelect(),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as HistoryTrip[];

  return {
    trips,
    assignmentEvents: await fetchAssignmentEventsForTrips(db, input, trips),
  };
}

async function fetchTripsByAssignedAt(
  db: DriverTripHistoryDb,
  input: DriverTripHistoryInput,
  currentRange: ReportRangeFilter,
) {
  const eventsInPeriod = (await db.tripEvent.findMany({
    where: {
      accountId: input.accountId,
      toDriverId: input.driverId,
      type: {
        in: REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES,
      },
      createdAt: currentRange,
    },
    select: assignmentEventSelect(),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as AssignmentEvent[];

  const tripIds = eventTripIds(eventsInPeriod);
  const eventBackedTrips =
    tripIds.length > 0
      ? ((await db.trip.findMany({
          where: {
            accountId: input.accountId,
            id: { in: tripIds },
            driverId: input.driverId,
          },
          select: historyTripSelect(),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })) as HistoryTrip[])
      : [];

  const legacyTrips = (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      driverId: input.driverId,
      createdAt: currentRange,
      ...(tripIds.length > 0 ? { id: { notIn: tripIds } } : {}),
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
    select: historyTripSelect(),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as HistoryTrip[];

  const currentTripIds = new Set(
    [...eventBackedTrips, ...legacyTrips].map((trip) => trip.id),
  );

  return {
    trips: [...eventBackedTrips, ...legacyTrips],
    assignmentEvents: [
      ...eventsInPeriod.filter(
        (event) => event.tripId != null && currentTripIds.has(event.tripId),
      ),
      ...legacyTrips.map((trip) =>
        legacyAssignmentEventFromTrip(trip, input.driverId),
      ),
    ],
  };
}

async function fetchTripsByCompletedAt(
  db: DriverTripHistoryDb,
  input: DriverTripHistoryInput,
  currentRange: ReportRangeFilter,
) {
  const completionEvents = (await db.tripEvent.findMany({
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as AssignmentEvent[];

  const tripIds = eventTripIds(completionEvents);
  const eventBackedTrips =
    tripIds.length > 0
      ? ((await db.trip.findMany({
          where: {
            accountId: input.accountId,
            id: { in: tripIds },
            driverId: input.driverId,
            status: "completed",
          },
          select: historyTripSelect(),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })) as HistoryTrip[])
      : [];

  const legacyTrips = (await db.trip.findMany({
    where: {
      accountId: input.accountId,
      driverId: input.driverId,
      status: "completed",
      createdAt: currentRange,
      ...(tripIds.length > 0 ? { id: { notIn: tripIds } } : {}),
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
    select: historyTripSelect(),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })) as HistoryTrip[];

  const trips = [...eventBackedTrips, ...legacyTrips];
  return {
    trips,
    assignmentEvents: await fetchAssignmentEventsForTrips(db, input, trips),
  };
}

function latestAssignmentByTrip(events: AssignmentEvent[]) {
  const map = new Map<number, AssignmentEvent>();
  for (const event of events) {
    if (event.tripId == null) continue;
    const current = map.get(event.tripId);
    if (!current || isNewerEvent(event, current)) {
      map.set(event.tripId, event);
    }
  }
  return map;
}

export async function getDriverTripHistory(
  db: DriverTripHistoryDb,
  input: DriverTripHistoryInput
): Promise<DriverTripHistoryResult> {
  const page = normalizePositiveInt(input.page, 1);
  const limit = normalizePositiveInt(input.limit, 20);
  const dateBasis = input.dateBasis ?? DEFAULT_REPORT_DATE_BASIS;

  // Fetch all active trip statuses once
  const tripStatusModel = (db as unknown as { tripStatus?: { findMany: (opts: { where: { isActive: boolean }; select: { key: true; label: true; color: true } }) => Promise<Array<{ key: string; label: string; color: string }>> } }).tripStatus;
  const allStatuses = tripStatusModel ? await tripStatusModel.findMany({
    where: { isActive: true },
    select: { key: true, label: true, color: true },
  }) : undefined;
  const statusMap = new Map(allStatuses?.map((s) => [s.key, s]) ?? []);

  const dateRangeActive = hasReportRange(input.current);
  const fetched = dateRangeActive
    ? dateBasis === "assignedAt"
      ? await fetchTripsByAssignedAt(db, input, input.current as ReportRangeFilter)
      : dateBasis === "completedAt"
        ? await fetchTripsByCompletedAt(db, input, input.current as ReportRangeFilter)
        : await fetchTripsByDirectDateBasis(db, input, dateBasis)
    : await fetchTripsByDirectDateBasis(db, input, dateBasis);

  const { trips, assignmentEvents } = fetched;

  const latestByTrip = latestAssignmentByTrip(assignmentEvents);
  const rows = trips.map((trip) => {
    const assignment = latestByTrip.get(trip.id);
    const points =
      trip.pointsEarned != null
        ? toMoneyNumber(trip.pointsEarned)
        : assignment && assignment.pointsEarned != null
          ? toMoneyNumber(assignment.pointsEarned)
          : 0;
    const profit =
      trip.profit != null
        ? toMoneyNumber(trip.profit)
        : assignment && assignment.profit != null
          ? toMoneyNumber(assignment.profit)
          : 0;
    const profitRate =
      trip.profitRate != null
          ? toMoneyNumber(trip.profitRate)
          : assignment && assignment.profitRate != null
            ? toMoneyNumber(assignment.profitRate)
            : null;

    const tripStatus = statusMap.get(trip.status);

    return {
      tripId: trip.id,
      title: trip.title || `Cuoc #${trip.id}`,
      departure: trip.departure,
      destination: trip.destination,
      route: `${trip.departure} - ${trip.destination}`,
      createdAt: trip.createdAt.toISOString(),
      departureTime: trip.departureTime.toISOString(),
      lastAssignedAt: assignment ? assignment.createdAt.toISOString() : null,
      status: trip.status,
      statusLabel: tripStatus?.label ?? trip.status,
      statusColor: tripStatus?.color ?? "slate",
      price: toMoneyNumber(trip.price),
      pointsEarned: points,
      profit,
      profitRate,
      formulaId: trip.matchedFormulaId ?? assignment?.formulaId ?? null,
      formulaName: assignment?.formulaName ?? null,
    };
  }).sort((a, b) => {
    const assignedDiff =
      (b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0) -
      (a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0);
    if (assignedDiff !== 0) return assignedDiff;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = rows.length;

  return {
    data: rows.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
