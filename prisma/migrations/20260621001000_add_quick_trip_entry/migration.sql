ALTER TABLE "users" ADD CONSTRAINT "users_id_account_id_key" UNIQUE ("id", "account_id");

CREATE TABLE "quick_trip_entry_sessions" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(120) NOT NULL,
  "source_type" VARCHAR(50) NOT NULL DEFAULT 'conversation',
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "last_input_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "account_id" INTEGER NOT NULL,
  "created_by_id" INTEGER,
  CONSTRAINT "quick_trip_entry_sessions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quick_trip_entry_sessions_created_by_id_account_id_fkey"
    FOREIGN KEY ("created_by_id", "account_id") REFERENCES "users"("id", "account_id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "quick_trip_entry_sessions_id_account_id_key"
    UNIQUE ("id", "account_id")
);

CREATE TABLE "quick_trip_entry_items" (
  "id" SERIAL PRIMARY KEY,
  "session_id" INTEGER NOT NULL,
  "account_id" INTEGER NOT NULL,
  "raw_text" TEXT NOT NULL,
  "source" VARCHAR(20) NOT NULL DEFAULT 'text',
  "parse_status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "parsed_data" JSONB,
  "missing_fields" JSONB,
  "warnings" JSONB,
  "confidence" DECIMAL(4, 2),
  "created_trip_id" INTEGER,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "quick_trip_entry_items_session_id_fkey"
    FOREIGN KEY ("session_id", "account_id") REFERENCES "quick_trip_entry_sessions"("id", "account_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "quick_trip_entry_items_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quick_trip_entry_items_created_trip_id_fkey"
    FOREIGN KEY ("created_trip_id", "account_id") REFERENCES "trips"("id", "account_id") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX "idx_qte_sessions_account_updated"
  ON "quick_trip_entry_sessions"("account_id", "updated_at");
CREATE INDEX "idx_qte_sessions_account_status_updated"
  ON "quick_trip_entry_sessions"("account_id", "status", "updated_at");
CREATE INDEX "idx_qte_items_account_session_created"
  ON "quick_trip_entry_items"("account_id", "session_id", "created_at");
CREATE INDEX "idx_qte_items_account_status"
  ON "quick_trip_entry_items"("account_id", "parse_status");
CREATE INDEX "idx_qte_items_created_trip"
  ON "quick_trip_entry_items"("created_trip_id");
