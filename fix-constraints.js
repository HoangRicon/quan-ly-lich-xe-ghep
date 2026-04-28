const { Client } = require('pg');

async function fixConstraints() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'xeghep',
    user: 'postgres',
    password: '123456'
  });

  // Các constraint cần tạo: index_name -> (columns, constraint_name)
  const constraints = [
    // customers: composite unique (account_id, phone)
    {
      sql: `DO $$ BEGIN
        ALTER TABLE "customers" ADD CONSTRAINT "idx_customers_account_phone" UNIQUE ("account_id", "phone");
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`
    },
    // user_settings: composite unique (account_id, user_id)
    {
      sql: `DO $$ BEGIN
        ALTER TABLE "user_settings" ADD CONSTRAINT "idx_user_settings_account_user" UNIQUE ("account_id", "user_id");
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`
    },
    // push_subscriptions: composite unique (account_id, endpoint)
    {
      sql: `DO $$ BEGIN
        ALTER TABLE "push_subscriptions" ADD CONSTRAINT "idx_push_subscriptions_account_endpoint" UNIQUE ("account_id", "endpoint");
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`
    },
  ];

  // Các index cần drop (vì sẽ thay bằng constraint)
  const dropIndexes = [
    // customers: drop bare index on phone if exists
    `DROP INDEX IF EXISTS "customers_phone_key"`,
    // user_settings: drop bare unique index on user_id if exists
    `DROP INDEX IF EXISTS "user_settings_user_id_key"`,
  ];

  try {
    await client.connect();
    console.log('Connected to database\n');

    // B1: Drop các bare indexes trước
    console.log('--- Dropping bare indexes ---');
    for (const sql of dropIndexes) {
      try {
        await client.query(sql);
        console.log(`DROP: ${sql.substring(0, 60)}...`);
      } catch (e) {
        if (!e.message.includes('does not exist')) {
          console.error(`  ERROR: ${e.message}`);
        }
      }
    }

    // B2: Tạo composite unique constraints
    console.log('\n--- Creating composite unique constraints ---');
    for (const { sql } of constraints) {
      try {
        await client.query(sql);
        const label = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
        console.log(`OK: ${label}...`);
      } catch (e) {
        if (e.message.includes('duplicate')) {
          const label = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
          console.log(`SKIP (exists): ${label}...`);
        } else {
          console.error(`ERROR: ${e.message}`);
        }
      }
    }

    // B3: Verify
    console.log('\n--- Verifying constraints ---');
    const result = await client.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conname IN (
        'idx_customers_account_phone',
        'idx_user_settings_account_user',
        'idx_push_subscriptions_account_endpoint'
      )
    `);
    
    if (result.rows.length > 0) {
      console.log('\nConstraints created:');
      for (const row of result.rows) {
        console.log(`  ✓ ${row.conname}: ${row.pg_get_constraintdef}`);
      }
    } else {
      console.log('\n⚠ No constraints found!');
    }

    console.log('\n✅ Done!');
  } catch (e) {
    console.error('\n❌ Fatal error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixConstraints();
