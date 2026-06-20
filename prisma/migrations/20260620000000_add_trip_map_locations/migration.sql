ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "pickup_location" TEXT;
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "dropoff_location" TEXT;
