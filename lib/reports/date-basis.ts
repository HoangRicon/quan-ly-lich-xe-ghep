import type { Prisma } from "@prisma/client";
import { TRIP_EVENT_TYPES } from "@/lib/trip-events";
import { reportStatusBucket } from "@/lib/reports/trip-metrics";
import type { ReportRangeFilter } from "@/lib/reports/date-range";

export const REPORT_DATE_BASIS_OPTIONS = [
  { key: "assignedAt", label: "Ngày gán tài xế" },
  { key: "createdAt", label: "Ngày tạo cuốc" },
  { key: "completedAt", label: "Ngày hoàn thành" },
  { key: "departureTime", label: "Ngày đi" },
] as const;

export type ReportDateBasis = (typeof REPORT_DATE_BASIS_OPTIONS)[number]["key"];

export const DEFAULT_REPORT_DATE_BASIS: ReportDateBasis = "departureTime";

export const REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES = [
  TRIP_EVENT_TYPES.DRIVER_ASSIGNED,
  TRIP_EVENT_TYPES.DRIVER_CHANGED,
] as const;

export const REPORT_TRIP_COMPLETION_EVENT_TYPES = [
  TRIP_EVENT_TYPES.TRIP_COMPLETED,
] as const;

export function parseReportDateBasis(
  value: string | null | undefined,
): ReportDateBasis {
  return REPORT_DATE_BASIS_OPTIONS.some((option) => option.key === value)
    ? (value as ReportDateBasis)
    : DEFAULT_REPORT_DATE_BASIS;
}

export function hasReportRange(
  range: ReportRangeFilter | undefined,
): range is ReportRangeFilter {
  return Boolean(range && Object.keys(range).length > 0);
}

export function isProjectedTrip(trip: {
  status: string;
  driverId?: number | null;
}) {
  const bucket = reportStatusBucket(trip);
  return bucket === "completed" || bucket === "assigned";
}

export function isAssignedProjectionTrip(trip: {
  status: string;
  driverId?: number | null;
}) {
  return reportStatusBucket(trip) === "assigned";
}

export function buildTripDateWhere(
  dateBasis: ReportDateBasis,
  range: ReportRangeFilter | undefined,
) : Prisma.TripWhereInput | undefined {
  if (!hasReportRange(range)) return undefined;
  if (dateBasis === "createdAt") return { createdAt: range } as Prisma.TripWhereInput;
  if (dateBasis === "departureTime") return { departureTime: range } as Prisma.TripWhereInput;
  return undefined;
}

export function buildTripDateBasisRelationWhere(
  dateBasis: ReportDateBasis,
  range: ReportRangeFilter | undefined,
) : Prisma.TripWhereInput {
  if (!hasReportRange(range)) return {};

  const directWhere = buildTripDateWhere(dateBasis, range);
  if (directWhere) return directWhere;

  if (dateBasis === "assignedAt") {
    return {
      OR: [
        {
          events: {
            some: {
              type: { in: [...REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES] },
              createdAt: range,
            },
          },
        },
        {
          createdAt: range,
          driverId: { not: null },
          NOT: {
            events: {
              some: {
                type: { in: [...REPORT_DRIVER_ASSIGNMENT_EVENT_TYPES] },
              },
            },
          },
        },
      ],
    };
  }

  return {
    OR: [
        {
          events: {
            some: {
              type: { in: [...REPORT_TRIP_COMPLETION_EVENT_TYPES] },
              createdAt: range,
            },
          },
        },
      {
        createdAt: range,
        status: "completed",
        NOT: {
            events: {
              some: {
                type: { in: [...REPORT_TRIP_COMPLETION_EVENT_TYPES] },
              },
            },
          },
        },
      ],
  } as Prisma.TripWhereInput;
}

export function eventTripIds(events: Array<{ tripId?: number | null }>) {
  return Array.from(
    new Set(
      events
        .map((event) => event.tripId)
        .filter((tripId): tripId is number => tripId != null),
    ),
  );
}
