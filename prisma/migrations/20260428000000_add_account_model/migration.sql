-- Migration: 20260428000000_add_account_model
-- Add multi-tenant support with Account model and accountId fields

-- ============================================================
-- STEP 1: Create accounts table and default account
-- ============================================================
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logo" VARCHAR(500),
    "settings" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_slug_key" ON "accounts"("slug");

-- Create default account (id=1)
INSERT INTO "accounts" ("id", "name", "slug", "created_at", "updated_at")
VALUES (1, 'Default Account', 'default', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 2: Add accountId to users table
-- ============================================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_users_account" ON "users"("account_id");

-- ============================================================
-- STEP 3: Add accountId to trips table
-- ============================================================
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "trips" ADD CONSTRAINT "trips_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_trips_account" ON "trips"("account_id");
CREATE INDEX IF NOT EXISTS "idx_trips_account_departure" ON "trips"("account_id", "departure_time");
CREATE INDEX IF NOT EXISTS "idx_trips_account_status" ON "trips"("account_id", "status");
CREATE INDEX IF NOT EXISTS "idx_trips_account_driver" ON "trips"("account_id", "driver_id");

-- ============================================================
-- STEP 4: Add accountId to bookings table
-- ============================================================
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_bookings_account" ON "bookings"("account_id");

-- ============================================================
-- STEP 5: Add accountId to customers table
-- ============================================================
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "customers" ADD CONSTRAINT "customers_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_customers_account" ON "customers"("account_id");
CREATE INDEX IF NOT EXISTS "idx_customers_account_phone" ON "customers"("account_id", "phone");

-- ============================================================
-- STEP 6: Add accountId to trip_customers table
-- ============================================================
ALTER TABLE "trip_customers" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "trip_customers" ADD CONSTRAINT "trip_customers_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_trip_customers_account" ON "trip_customers"("account_id");

-- ============================================================
-- STEP 7: Add accountId to push_subscriptions table
-- ============================================================
ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_account" ON "push_subscriptions"("account_id");

-- ============================================================
-- STEP 8: Add accountId to notifications table
-- ============================================================
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_notifications_account" ON "notifications"("account_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_account_user_read" ON "notifications"("account_id", "user_id", "is_read");

-- ============================================================
-- STEP 9: Add accountId to user_settings table
-- ============================================================
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_user_settings_account" ON "user_settings"("account_id");

-- ============================================================
-- STEP 10: Update system_settings (accountId is nullable)
-- ============================================================
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "account_id" INTEGER;
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_system_settings_account" ON "system_settings"("account_id");

-- ============================================================
-- STEP 11: Update trip_statuses (accountId is nullable)
-- ============================================================
ALTER TABLE "trip_statuses" ADD COLUMN IF NOT EXISTS "account_id" INTEGER;
ALTER TABLE "trip_statuses" ADD CONSTRAINT "trip_statuses_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_trip_statuses_account" ON "trip_statuses"("account_id");

-- ============================================================
-- STEP 12: Update email_templates (accountId is nullable)
-- ============================================================
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "account_id" INTEGER;
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_email_templates_account" ON "email_templates"("account_id");

-- ============================================================
-- STEP 13: Update pricing_formulas (accountId is nullable)
-- ============================================================
ALTER TABLE "pricing_formulas" ADD COLUMN IF NOT EXISTS "account_id" INTEGER;
ALTER TABLE "pricing_formulas" ADD CONSTRAINT "pricing_formulas_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id");

CREATE INDEX IF NOT EXISTS "idx_pricing_formulas_account" ON "pricing_formulas"("account_id");
