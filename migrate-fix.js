const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'xeghep',
    user: 'postgres',
    password: '123456'
  });

  const statements = [
    // Step 1: Create accounts table and default account
    `CREATE TABLE IF NOT EXISTS "accounts" (
      "id" SERIAL PRIMARY KEY,
      "name" VARCHAR(255) NOT NULL,
      "slug" VARCHAR(100) NOT NULL,
      "logo" VARCHAR(500),
      "settings" JSONB,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "accounts_slug_key" ON "accounts"("slug")`,
    `INSERT INTO "accounts" ("id", "name", "slug", "created_at", "updated_at") VALUES (1, 'Default Account', 'default', NOW(), NOW()) ON CONFLICT DO NOTHING`,

    // Step 2: users
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_users_account" ON "users"("account_id")`,

    // Step 3: trips
    `ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "trips" ADD CONSTRAINT "trips_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_trips_account" ON "trips"("account_id")`,

    // Step 4: bookings
    `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "bookings" ADD CONSTRAINT "bookings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_bookings_account" ON "bookings"("account_id")`,

    // Step 5: customers
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "customers" ADD CONSTRAINT "customers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_customers_account" ON "customers"("account_id")`,

    // Step 6: trip_customers
    `ALTER TABLE "trip_customers" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "trip_customers" ADD CONSTRAINT "trip_customers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_trip_customers_account" ON "trip_customers"("account_id")`,

    // Step 7: push_subscriptions
    `ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_account" ON "push_subscriptions"("account_id")`,

    // Step 8: notifications
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_notifications_account" ON "notifications"("account_id")`,

    // Step 9: user_settings
    `ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "account_id" INTEGER NOT NULL DEFAULT 1`,
    `DO $$ BEGIN ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_user_settings_account" ON "user_settings"("account_id")`,

    // Step 10: system_settings
    `ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "account_id" INTEGER`,
    `DO $$ BEGIN ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_system_settings_account" ON "system_settings"("account_id")`,

    // Step 11: trip_statuses
    `ALTER TABLE "trip_statuses" ADD COLUMN IF NOT EXISTS "account_id" INTEGER`,
    `DO $$ BEGIN ALTER TABLE "trip_statuses" ADD CONSTRAINT "trip_statuses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_trip_statuses_account" ON "trip_statuses"("account_id")`,

    // Step 12: email_templates
    `ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "account_id" INTEGER`,
    `DO $$ BEGIN ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_email_templates_account" ON "email_templates"("account_id")`,

    // Step 13: pricing_formulas
    `ALTER TABLE "pricing_formulas" ADD COLUMN IF NOT EXISTS "account_id" INTEGER`,
    `DO $$ BEGIN ALTER TABLE "pricing_formulas" ADD CONSTRAINT "pricing_formulas_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id"); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `CREATE INDEX IF NOT EXISTS "idx_pricing_formulas_account" ON "pricing_formulas"("account_id")`,
  ];

  try {
    await client.connect();
    console.log('Connected to database\n');

    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i];
      try {
        await client.query(sql);
        const label = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
        console.log(`[${i + 1}/${statements.length}] OK: ${label}...`);
      } catch (e) {
        // IF NOT EXISTS / DO $$ silently handles already-exists, so log as warning only
        if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
          console.error(`  [ERROR] ${sql.substring(0, 80)}...`);
          console.error(`  -> ${e.message}`);
        } else {
          const label = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
          console.log(`[${i + 1}/${statements.length}] SKIP: ${label}...`);
        }
      }
    }

    console.log('\n✅ Migration completed!');
  } catch (e) {
    console.error('\n❌ Fatal error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
