import type { Prisma, PrismaClient } from "@prisma/client";

export const TRIP_EVENT_TYPES = {
  DRIVER_ASSIGNED: "driver_assigned",
  DRIVER_CHANGED: "driver_changed",
  DRIVER_UNASSIGNED: "driver_unassigned",
  STATUS_CHANGED: "status_changed",
  TRIP_COMPLETED: "trip_completed",
  TRIP_CANCELLED: "trip_cancelled",
} as const;

type TripEventType = (typeof TRIP_EVENT_TYPES)[keyof typeof TRIP_EVENT_TYPES];

type TripEventWriter = {
  tripEvent: Pick<PrismaClient["tripEvent"], "create" | "createMany">;
};

export async function recordDriverAssignmentEvent(
  db: TripEventWriter,
  input: {
    tripId: number;
    accountId: number;
    fromDriverId: number | null;
    toDriverId: number | null;
    actorId: number | null;
    createdAt?: Date;
    pointsEarned?: number | null;
    profit?: number | null;
    profitRate?: number | null;
    formulaId?: number | null;
    formulaName?: string | null;
  }
) {
  if (input.fromDriverId === input.toDriverId) return null;

  const type: TripEventType =
    input.fromDriverId == null && input.toDriverId != null
      ? TRIP_EVENT_TYPES.DRIVER_ASSIGNED
      : input.fromDriverId != null && input.toDriverId == null
        ? TRIP_EVENT_TYPES.DRIVER_UNASSIGNED
        : TRIP_EVENT_TYPES.DRIVER_CHANGED;

  const data = {
    tripId: input.tripId,
    accountId: input.accountId,
    type,
    fromDriverId: input.fromDriverId,
    toDriverId: input.toDriverId,
    actorId: input.actorId,
    pointsEarned: input.pointsEarned ?? null,
    profit: input.profit ?? null,
    profitRate: input.profitRate ?? null,
    formulaId: input.formulaId ?? null,
    formulaName: input.formulaName ?? null,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  } satisfies Prisma.TripEventUncheckedCreateInput;

  return db.tripEvent.create({ data });
}

export async function recordStatusEvents(
  db: TripEventWriter,
  input: {
    tripId: number;
    accountId: number;
    fromStatus: string;
    toStatus: string;
    actorId: number | null;
    createdAt?: Date;
  }
) {
  if (input.fromStatus === input.toStatus) return { count: 0 };

  const baseEvent = {
    tripId: input.tripId,
    accountId: input.accountId,
    type: TRIP_EVENT_TYPES.STATUS_CHANGED,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    actorId: input.actorId,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  } satisfies Prisma.TripEventCreateManyInput;

  const events: Prisma.TripEventCreateManyInput[] = [baseEvent];

  if (input.toStatus === "completed") {
    events.push({
      ...baseEvent,
      type: TRIP_EVENT_TYPES.TRIP_COMPLETED,
    });
  }

  if (input.toStatus === "cancelled") {
    events.push({
      ...baseEvent,
      type: TRIP_EVENT_TYPES.TRIP_CANCELLED,
    });
  }

  return db.tripEvent.createMany({ data: events });
}
