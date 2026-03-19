-- Fix: allow fractional points (e.g. 0.5) for pricing_formulas.points
-- Safe to run multiple times.

ALTER TABLE IF EXISTS "pricing_formulas"
  ALTER COLUMN "points" TYPE DECIMAL(10,2)
  USING ("points"::numeric(10,2));

ALTER TABLE IF EXISTS "pricing_formulas"
  ALTER COLUMN "points" SET DEFAULT 1;

