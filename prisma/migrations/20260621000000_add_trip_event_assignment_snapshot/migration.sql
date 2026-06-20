ALTER TABLE "trip_events"
  ADD COLUMN "points_earned" DECIMAL(10, 2),
  ADD COLUMN "profit" DECIMAL(10, 2),
  ADD COLUMN "profit_rate" DECIMAL(15, 2),
  ADD COLUMN "formula_id" INTEGER,
  ADD COLUMN "formula_name" VARCHAR(255);
