-- Ensure pricing_formulas.points supports decimals (e.g. 0.5)
-- This migration is defensive: it assumes the table already exists in the target DB.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pricing_formulas'
  ) THEN
    -- Convert points to numeric(10,2). Works whether points was integer, numeric with scale 0, or text.
    ALTER TABLE "pricing_formulas"
      ALTER COLUMN "points" TYPE DECIMAL(10,2)
      USING ("points"::numeric(10,2));

    -- Keep schema consistent with Prisma model default.
    ALTER TABLE "pricing_formulas"
      ALTER COLUMN "points" SET DEFAULT 1;
  END IF;
END $$;

