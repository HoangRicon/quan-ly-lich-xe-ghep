ALTER TABLE "trips"
  ADD CONSTRAINT "trips_id_account_id_key" UNIQUE ("id", "account_id");

CREATE TABLE "trip_events" (
  "id" SERIAL PRIMARY KEY,
  "trip_id" INTEGER NOT NULL,
  "account_id" INTEGER NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "from_status" VARCHAR(50),
  "to_status" VARCHAR(50),
  "from_driver_id" INTEGER,
  "to_driver_id" INTEGER,
  "actor_id" INTEGER,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "trip_events_trip_id_account_id_fkey"
    FOREIGN KEY ("trip_id", "account_id") REFERENCES "trips"("id", "account_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trip_events_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_trip_events_account_created"
  ON "trip_events"("account_id", "created_at");
CREATE INDEX "idx_trip_events_account_type_created"
  ON "trip_events"("account_id", "type", "created_at");
CREATE INDEX "idx_trip_events_account_to_driver_created"
  ON "trip_events"("account_id", "to_driver_id", "created_at");
CREATE INDEX "idx_trip_events_trip"
  ON "trip_events"("trip_id");
