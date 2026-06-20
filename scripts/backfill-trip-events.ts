import { prisma } from "../lib/prisma";
import { TRIP_EVENT_TYPES } from "../lib/trip-events";

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('backfill_trip_events_driver_assignments'))`;

    const [resultRow] = await tx.$queryRaw<Array<{ checked: bigint; inserted: bigint }>>`
      WITH locked_trips AS (
        SELECT
          "id",
          "account_id",
          "driver_id",
          "created_at"
        FROM "trips"
        WHERE "driver_id" IS NOT NULL
        FOR UPDATE
      ),
      checked AS (
        SELECT COUNT(*)::bigint AS "checked"
        FROM locked_trips
      ),
      inserted AS (
        INSERT INTO "trip_events" (
          "trip_id",
          "account_id",
          "type",
          "from_driver_id",
          "to_driver_id",
          "actor_id",
          "note",
          "created_at"
        )
        SELECT
          locked_trips."id",
          locked_trips."account_id",
          ${TRIP_EVENT_TYPES.DRIVER_ASSIGNED},
          NULL,
          locked_trips."driver_id",
          NULL,
          'Backfilled from existing trip.driverId',
          locked_trips."created_at"
        FROM locked_trips
        WHERE NOT EXISTS (
          SELECT 1
          FROM "trip_events"
          WHERE "trip_events"."trip_id" = locked_trips."id"
            AND "trip_events"."account_id" = locked_trips."account_id"
            AND "trip_events"."type" IN (
              ${TRIP_EVENT_TYPES.DRIVER_ASSIGNED},
              ${TRIP_EVENT_TYPES.DRIVER_CHANGED}
            )
        )
        RETURNING "id"
      )
      SELECT
        checked."checked",
        (SELECT COUNT(*)::bigint FROM inserted) AS "inserted"
      FROM checked
    `;

    return {
      checked: resultRow ? Number(resultRow.checked) : 0,
      inserted: resultRow ? Number(resultRow.inserted) : 0,
    };
  });

  console.log(`Backfill complete. checked=${result.checked} inserted=${result.inserted}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
