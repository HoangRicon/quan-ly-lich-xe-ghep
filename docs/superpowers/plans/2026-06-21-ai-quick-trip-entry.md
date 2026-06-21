# AI Quick Trip Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first quick-entry workflow that creates normal trips from text, paste, and browser voice while preserving server-side sessions and safe AI/parser review gates.

**Architecture:** Add quick-entry session/item persistence first, then extract the existing trip creation logic into a shared service so quick entry cannot bypass trip business rules. Build parser/API layers as a thin input queue, and finish with a phone-optimized UI plus browser speech-recognition transcript support.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Tailwind CSS, tsx scripts, browser SpeechRecognition.

---

## Scope Guard

- Do not implement server audio upload or store audio files.
- Do not replace the existing full trip form.
- Do not delete normal `Trip` records when deleting quick-entry sessions.
- Do not commit automatically; this worktree has unrelated changes, so commit only if the user explicitly asks.
- Keep desktop safe but not primary; the target UX is phone operation.

## File Structure Mapping

- Modify: `prisma/schema.prisma` adds `QuickTripEntrySession`, `QuickTripEntryItem`, relations, and indexes.
- Create: `prisma/migrations/20260621001000_add_quick_trip_entry/migration.sql` creates quick-entry persistence tables.
- Modify: `lib/prisma-tenant.ts` adds tenant wrappers for quick-entry models.
- Create: `lib/trips/create-trip.ts` contains shared create-trip business logic currently embedded in `app/api/trips/route.ts`.
- Modify: `app/api/trips/route.ts` delegates POST creation to the shared service.
- Create: `lib/quick-trip-entry/types.ts` centralizes quick-entry domain types and constants.
- Create: `lib/quick-trip-entry/split-input.ts` splits text/paste into candidate chunks.
- Create: `lib/quick-trip-entry/parser.ts` parses Vietnamese shorthand into candidate trip fields.
- Create: `lib/quick-trip-entry/validation.ts` validates candidates and decides auto-save eligibility.
- Create: `lib/quick-trip-entry/ai-provider.ts` defines an optional AI provider adapter boundary.
- Create: `lib/quick-trip-entry/serializer.ts` formats sessions/items for API responses.
- Create: `lib/quick-trip-entry/service.ts` coordinates session/item persistence, parsing, saving, and deletion rules.
- Create: `scripts/verify-quick-trip-parser.ts` runs focused parser/validation checks.
- Create: `scripts/verify-quick-trip-service.ts` runs service-level smoke checks against Prisma where practical.
- Create: `app/api/quick-trip-entry/sessions/route.ts` lists and creates sessions.
- Create: `app/api/quick-trip-entry/sessions/[id]/route.ts` updates, archives, and deletes sessions.
- Create: `app/api/quick-trip-entry/sessions/[id]/items/route.ts` lists and creates parsed items.
- Create: `app/api/quick-trip-entry/items/[itemId]/route.ts` updates draft item parsed data.
- Create: `app/api/quick-trip-entry/items/[itemId]/save/route.ts` saves one item as a normal trip.
- Create: `app/api/quick-trip-entry/sessions/[id]/save-valid/route.ts` saves all valid items in a session.
- Create: `app/dashboard/schedule/quick-entry/page.tsx` renders the mobile quick-entry page.
- Create: `components/quick-trip-entry/quick-entry-client.tsx` owns client state and data fetching.
- Create: `components/quick-trip-entry/session-rail.tsx` renders horizontal source chips.
- Create: `components/quick-trip-entry/quick-input-panel.tsx` renders textarea, send, and mic controls.
- Create: `components/quick-trip-entry/draft-card.tsx` renders one draft item as a mobile card.
- Create: `components/quick-trip-entry/draft-editor-sheet.tsx` renders the bottom-sheet editor.
- Create: `components/quick-trip-entry/use-browser-speech.ts` wraps browser speech recognition.
- Create: `types/speech-recognition.d.ts` adds minimal browser speech-recognition types.
- Modify: `app/dashboard/schedule/page.tsx` or `components/schedule-list.tsx` adds a mobile action link to quick entry.
- Modify: `openspec/changes/ai-quick-trip-entry/tasks.md` checks tasks off as implementation finishes.

---

## Task 1: Schema, Migration, And Tenant Scope

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260621001000_add_quick_trip_entry/migration.sql`
- Modify: `lib/prisma-tenant.ts`

- [ ] **Step 1: Add Prisma relations and models**

Add these relation fields:

```prisma
model Account {
  quickTripEntrySessions QuickTripEntrySession[]
  quickTripEntryItems    QuickTripEntryItem[]
}

model User {
  quickTripEntrySessions QuickTripEntrySession[] @relation("QuickTripEntrySessionCreator")
}

model Trip {
  quickEntryItems QuickTripEntryItem[]
}
```

Add these models near `TripEvent` or after `TripCustomer`:

```prisma
model QuickTripEntrySession {
  id          Int                  @id @default(autoincrement())
  name        String               @db.VarChar(120)
  sourceType  String               @default("conversation") @map("source_type") @db.VarChar(50)
  status      String               @default("active") @db.VarChar(30)
  lastInputAt DateTime?            @map("last_input_at") @db.Timestamptz(6)
  createdAt   DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)
  accountId   Int                  @map("account_id")
  createdById Int?                 @map("created_by_id")
  account     Account              @relation(fields: [accountId], references: [id])
  createdBy   User?                @relation("QuickTripEntrySessionCreator", fields: [createdById], references: [id], onDelete: SetNull)
  items       QuickTripEntryItem[]

  @@index([accountId, updatedAt], map: "idx_qte_sessions_account_updated")
  @@index([accountId, status, updatedAt], map: "idx_qte_sessions_account_status_updated")
  @@map("quick_trip_entry_sessions")
}

model QuickTripEntryItem {
  id            Int                   @id @default(autoincrement())
  sessionId     Int                   @map("session_id")
  accountId     Int                   @map("account_id")
  rawText       String                @map("raw_text")
  source        String                @default("text") @db.VarChar(20)
  parseStatus   String                @default("pending") @map("parse_status") @db.VarChar(30)
  parsedData    Json?                 @map("parsed_data")
  missingFields Json?                 @map("missing_fields")
  warnings      Json?
  confidence    Decimal?              @db.Decimal(4, 2)
  createdTripId Int?                  @map("created_trip_id")
  errorMessage  String?               @map("error_message")
  createdAt     DateTime              @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime              @updatedAt @map("updated_at") @db.Timestamptz(6)
  account       Account               @relation(fields: [accountId], references: [id])
  session       QuickTripEntrySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  createdTrip   Trip?                 @relation(fields: [createdTripId], references: [id], onDelete: SetNull)

  @@index([accountId, sessionId, createdAt], map: "idx_qte_items_account_session_created")
  @@index([accountId, parseStatus], map: "idx_qte_items_account_status")
  @@index([createdTripId], map: "idx_qte_items_created_trip")
  @@map("quick_trip_entry_items")
}
```

- [ ] **Step 2: Create SQL migration**

Create `prisma/migrations/20260621001000_add_quick_trip_entry/migration.sql`:

```sql
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
  CONSTRAINT "quick_trip_entry_sessions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    FOREIGN KEY ("session_id") REFERENCES "quick_trip_entry_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "quick_trip_entry_items_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "quick_trip_entry_items_created_trip_id_fkey"
    FOREIGN KEY ("created_trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE
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
```

- [ ] **Step 3: Add tenant wrappers**

In `lib/prisma-tenant.ts`, add model names to `TENANT_MODELS`:

```ts
"quickTripEntrySession",
"quickTripEntryItem",
```

- [ ] **Step 4: Generate Prisma client**

Run: `npx prisma generate`

Expected: exits `0`; TypeScript can reference `prisma.quickTripEntrySession` and `prisma.quickTripEntryItem`.

---

## Task 2: Shared Trip Creation Service

**Files:**
- Create: `lib/trips/create-trip.ts`
- Modify: `app/api/trips/route.ts`

- [ ] **Step 1: Create service types and helpers**

Create `lib/trips/create-trip.ts` with the exported contract:

```ts
import type { Prisma, PrismaClient } from "@prisma/client";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import {
  applyFormula,
  findMatchingFormula,
  type TripMatchInput,
} from "@/lib/formula-engine";
import { recordDriverAssignmentEvent } from "@/lib/trip-events";

export interface CreateTripInput {
  title?: string;
  description?: string | null;
  departure: string;
  destination: string;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  departureTime: string | Date;
  arrivalTime?: string | Date | null;
  price: number | string;
  totalSeats?: number | string | null;
  tripType?: string | null;
  tripDirection?: string | null;
  notes?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerNotes?: string | null;
  seats?: number | string | null;
  driverId?: number | null;
}

export interface CreateTripContext {
  accountId: number;
  actorId: number | null;
}

export class CreateTripError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "CreateTripError";
  }
}

type ParentDb = Pick<PrismaClient, "$transaction"> & PrismaClient;
```

Move the existing normalization helpers from `POST /api/trips` into this file: price parsing, optional text normalization, decimal clamps, trip direction normalization, and formula decimal sanitizers.

- [ ] **Step 2: Implement `createTripForAccount`**

Add the service function:

```ts
export async function createTripForAccount(
  parentDb: ParentDb,
  input: CreateTripInput,
  context: CreateTripContext
) {
  if (!input.departure || !input.destination || !input.departureTime || !input.price) {
    throw new CreateTripError(400, "Missing required fields");
  }

  const parsedTotalSeatsRaw = parseInt(String(input.totalSeats ?? "1"), 10);
  const parsedTotalSeats =
    Number.isFinite(parsedTotalSeatsRaw) && parsedTotalSeatsRaw > 0
      ? parsedTotalSeatsRaw
      : 1;
  const parsedPriceRaw = parseFloat(String(input.price).replace(/[.,]/g, ""));
  const safePrice = clampDecimal10_2(Number.isFinite(parsedPriceRaw) ? parsedPriceRaw : 0);
  const finalDriverId = input.driverId || null;
  const parsedDirection = input.tripDirection === "roundtrip" ? "roundtrip" : "oneway";
  const parsedTripType = input.tripType === "bao" ? "bao" : "ghep";

  const db = createTenantPrisma(parentDb, context.accountId);

  let formulaResult: ReturnType<typeof applyFormula> = {
    pointsEarned: null,
    profitRate: null,
    profit: null,
    matchedFormulaId: null,
  };
  let matchedFormulaName: string | null = null;

  if (finalDriverId) {
    const driver = await db.user.findFirst({
      where: { id: finalDriverId, accountId: context.accountId },
      select: { profitRate: true, formulaIds: true },
    });
    if (!driver) throw new CreateTripError(400, "Driver not found in your account");

    const driverFormulaIds = Array.isArray(driver.formulaIds) ? driver.formulaIds : [];
    const formulas = driverFormulaIds.length > 0
      ? await db.pricingFormula.findMany({
          where: { id: { in: driverFormulaIds }, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : await db.pricingFormula.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });

    const tripInput: TripMatchInput = {
      price: safePrice,
      totalSeats: parsedTotalSeats,
      tripType: parsedTripType,
      tripDirection: parsedDirection,
    };
    const normalizedFormulas = formulas.map((f) => ({
      id: f.id,
      name: f.name,
      tripType: f.tripType,
      seats: f.seats ?? null,
      minPrice: f.minPrice ? Number(f.minPrice) : null,
      maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
      points: Number(f.points),
    }));
    const matchedFormula = findMatchingFormula(normalizedFormulas, tripInput);
    matchedFormulaName = matchedFormula?.formulaName ?? null;
    formulaResult = applyFormula(tripInput, Number(driver.profitRate), matchedFormula);
  }

  return parentDb.$transaction(async (tx) => {
    const txDb = createTenantPrisma(tx, context.accountId);
    let customerId: number | null = null;
    if (input.customerPhone) {
      const customer = await txDb.customer.upsert({
        where: {
          idx_customers_account_phone: {
            phone: input.customerPhone,
            accountId: context.accountId,
          },
        },
        create: {
          phone: input.customerPhone,
          name: input.customerName || "Khach vang lai",
          email: input.customerEmail || null,
          notes: input.customerNotes || null,
        },
        update: {
          name: input.customerName || undefined,
          email: input.customerEmail || undefined,
          notes: input.customerNotes || undefined,
          totalTrips: { increment: 1 },
        },
      });
      customerId = customer.id;
    }

    const createdTrip = await txDb.trip.create({
      data: {
        title: input.title || `${input.departure} - ${input.destination}`,
        description: input.description ?? null,
        departure: input.departure,
        destination: input.destination,
        pickupLocation: normalizeOptionalText(input.pickupLocation),
        dropoffLocation: normalizeOptionalText(input.dropoffLocation),
        departureTime: new Date(input.departureTime),
        arrivalTime: input.arrivalTime ? new Date(input.arrivalTime) : null,
        price: safePrice,
        totalSeats: parsedTotalSeats,
        status: "scheduled",
        tripType: parsedTripType,
        tripDirection: parsedDirection,
        driverId: finalDriverId || undefined,
        createdById: context.actorId || undefined,
        notes: normalizeOptionalText(input.notes),
        pointsEarned: sanitizeOptionalDecimal10_2(formulaResult.pointsEarned),
        profitRate: sanitizeOptionalDecimal15_2(formulaResult.profitRate),
        profit: sanitizeOptionalDecimal10_2(formulaResult.profit),
        matchedFormulaId: formulaResult.matchedFormulaId,
        ...(customerId
          ? {
              customers: {
                create: {
                  customerId,
                  seats: parseInt(String(input.seats ?? "1"), 10) || 1,
                  status: "confirmed",
                  notes: input.customerNotes || null,
                  accountId: context.accountId,
                },
              },
            }
          : {}),
      },
      include: {
        driver: true,
        customers: { include: { customer: true } },
      },
    });

    if (createdTrip.driverId) {
      await recordDriverAssignmentEvent(txDb, {
        tripId: createdTrip.id,
        accountId: context.accountId,
        fromDriverId: null,
        toDriverId: createdTrip.driverId,
        actorId: context.actorId,
        createdAt: createdTrip.createdAt,
        pointsEarned: formulaResult.pointsEarned,
        profit: formulaResult.profit,
        profitRate: formulaResult.profitRate,
        formulaId: formulaResult.matchedFormulaId,
        formulaName: matchedFormulaName,
      });
    }

    return createdTrip;
  });
}
```

If TypeScript rejects direct scalar `driverId` in `data`, use the relation form already used in the update route:

```ts
driver: finalDriverId ? { connect: { id: finalDriverId } } : undefined,
```

- [ ] **Step 3: Update `POST /api/trips` to use the service**

In `app/api/trips/route.ts`, replace the current POST creation internals with:

```ts
const trip = await createTripForAccount(prisma, body, {
  accountId: user.accountId,
  actorId: user.id,
});
```

Keep the existing response shape by formatting `trip` with the same fields currently returned by the route.

- [ ] **Step 4: Verify no behavior regression**

Run: `npx tsc --noEmit`

Expected: typecheck passes or fails only on pre-existing unrelated files. Fix any error introduced by `lib/trips/create-trip.ts` or `app/api/trips/route.ts`.

---

## Task 3: Quick-Entry Types, Parser, And Validation

**Files:**
- Create: `lib/quick-trip-entry/types.ts`
- Create: `lib/quick-trip-entry/split-input.ts`
- Create: `lib/quick-trip-entry/parser.ts`
- Create: `lib/quick-trip-entry/validation.ts`
- Create: `lib/quick-trip-entry/ai-provider.ts`
- Create: `scripts/verify-quick-trip-parser.ts`

- [ ] **Step 1: Create domain types**

Create `lib/quick-trip-entry/types.ts`:

```ts
export const QUICK_ENTRY_ITEM_STATUSES = {
  PENDING: "pending",
  PARSED: "parsed",
  NEEDS_REVIEW: "needs_review",
  AUTO_SAVED: "auto_saved",
  SAVED: "saved",
  FAILED: "failed",
  DISCARDED: "discarded",
} as const;

export type QuickEntryItemStatus =
  (typeof QUICK_ENTRY_ITEM_STATUSES)[keyof typeof QUICK_ENTRY_ITEM_STATUSES];

export type QuickEntrySource = "text" | "paste" | "voice";

export interface QuickTripCandidate {
  customerPhone?: string;
  customerName?: string;
  departure?: string;
  destination?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  departureTime?: string;
  price?: number;
  totalSeats?: number;
  tripType?: "ghep" | "bao";
  tripDirection?: "oneway" | "roundtrip";
  driverId?: number | null;
  notes?: string;
  confidence: number;
  missingFields: string[];
  warnings: string[];
}

export interface ParsedQuickTripChunk {
  rawText: string;
  candidate: QuickTripCandidate;
}
```

- [ ] **Step 2: Implement input splitting**

Create `lib/quick-trip-entry/split-input.ts`:

```ts
export function splitQuickTripInput(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [normalized];

  const chunks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    const looksLikeNewTrip =
      /\b(0\d{9,10}|84\d{9,10})\b/.test(line) ||
      /\b\d{1,2}[:h]\d{0,2}\b/i.test(line) ||
      /\b\d+k\b/i.test(line);
    if (looksLikeNewTrip && current.length > 0) {
      chunks.push(current.join(" "));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}
```

- [ ] **Step 3: Implement deterministic parser**

Create `lib/quick-trip-entry/parser.ts`:

```ts
import { splitQuickTripInput } from "./split-input";
import type { ParsedQuickTripChunk, QuickTripCandidate } from "./types";

function parsePhone(text: string) {
  return text.match(/\b(0\d{9,10}|84\d{9,10})\b/)?.[1];
}

function parsePrice(text: string) {
  const k = text.match(/\b(\d{2,4})\s*k\b/i);
  if (k) return Number(k[1]) * 1000;
  const vnd = text.match(/\b(\d{5,9})\b/);
  return vnd ? Number(vnd[1]) : undefined;
}

function parseTime(text: string, now = new Date()) {
  const match = text.match(/\b(\d{1,2})(?:h|:)(\d{1,2})?\b/i);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function parseSeats(text: string) {
  const seat = text.match(/\b([1-9])\s*(?:k|khach|ghe)\b/i);
  return seat ? Number(seat[1]) : undefined;
}

function parseType(text: string): Pick<QuickTripCandidate, "tripType" | "tripDirection"> {
  const lower = text.toLowerCase();
  return {
    tripType: lower.includes("bao") || lower.includes("bx") ? "bao" : "ghep",
    tripDirection: lower.includes("2c") || lower.includes("2 chieu") ? "roundtrip" : "oneway",
  };
}

function parseRoute(text: string) {
  const withoutPhone = text.replace(/\b(0\d{9,10}|84\d{9,10})\b/g, " ");
  const withoutPrice = withoutPhone.replace(/\b\d+\s*k\b/gi, " ");
  const route = withoutPrice.match(/([A-Za-zÀ-ỹ\s.]+?)\s*(?:-|>|→|di|đi|den|đến)\s*([A-Za-zÀ-ỹ\s.]+)/i);
  if (!route) return {};
  return {
    departure: route[1].trim().replace(/\s+/g, " "),
    destination: route[2].trim().replace(/\s+/g, " "),
  };
}

export function parseQuickTripChunk(rawText: string, now = new Date()): QuickTripCandidate {
  const phone = parsePhone(rawText);
  const price = parsePrice(rawText);
  const departureTime = parseTime(rawText, now);
  const seats = parseSeats(rawText);
  const route = parseRoute(rawText);
  const type = parseType(rawText);

  const missingFields = [
    !phone ? "customerPhone" : null,
    !route.departure ? "departure" : null,
    !route.destination ? "destination" : null,
    !departureTime ? "departureTime" : null,
    !price ? "price" : null,
  ].filter((x): x is string => Boolean(x));

  const filledCount = 5 - missingFields.length;
  const confidence = Math.max(0.2, Math.min(0.95, filledCount / 5));

  return {
    customerPhone: phone,
    departure: route.departure,
    destination: route.destination,
    departureTime,
    price,
    totalSeats: type.tripType === "bao" ? 1 : seats || 1,
    tripType: type.tripType,
    tripDirection: type.tripDirection,
    notes: rawText,
    confidence,
    missingFields,
    warnings: [],
  };
}

export function parseQuickTripInput(rawText: string, now = new Date()): ParsedQuickTripChunk[] {
  return splitQuickTripInput(rawText).map((chunk) => ({
    rawText: chunk,
    candidate: parseQuickTripChunk(chunk, now),
  }));
}
```

- [ ] **Step 4: Implement validation**

Create `lib/quick-trip-entry/validation.ts`:

```ts
import type { QuickTripCandidate } from "./types";

export const QUICK_ENTRY_AUTO_SAVE_THRESHOLD = 0.85;

export function getQuickTripMissingFields(candidate: QuickTripCandidate) {
  return [
    !candidate.customerPhone ? "customerPhone" : null,
    !candidate.departure ? "departure" : null,
    !candidate.destination ? "destination" : null,
    !candidate.departureTime ? "departureTime" : null,
    !candidate.price ? "price" : null,
  ].filter((x): x is string => Boolean(x));
}

export function validateQuickTripCandidate(candidate: QuickTripCandidate) {
  const missingFields = getQuickTripMissingFields(candidate);
  const warnings: string[] = [...candidate.warnings];
  if (candidate.price != null && candidate.price <= 0) warnings.push("price_invalid");
  if (candidate.totalSeats != null && candidate.totalSeats < 1) warnings.push("seats_invalid");
  if (candidate.tripType && !["ghep", "bao"].includes(candidate.tripType)) warnings.push("trip_type_invalid");
  if (candidate.tripDirection && !["oneway", "roundtrip"].includes(candidate.tripDirection)) warnings.push("trip_direction_invalid");

  return {
    candidate: {
      ...candidate,
      missingFields,
      warnings,
    },
    canAutoSave:
      missingFields.length === 0 &&
      warnings.length === 0 &&
      candidate.confidence >= QUICK_ENTRY_AUTO_SAVE_THRESHOLD,
  };
}
```

- [ ] **Step 5: Add optional AI provider boundary**

Create `lib/quick-trip-entry/ai-provider.ts`:

```ts
import type { QuickTripCandidate } from "./types";

export interface QuickTripAiProvider {
  parse(rawText: string): Promise<Partial<QuickTripCandidate>>;
}

export function getQuickTripAiProvider(): QuickTripAiProvider | null {
  return null;
}
```

- [ ] **Step 6: Add parser verification script**

Create `scripts/verify-quick-trip-parser.ts`:

```ts
import assert from "node:assert/strict";
import { splitQuickTripInput } from "../lib/quick-trip-entry/split-input";
import { parseQuickTripInput } from "../lib/quick-trip-entry/parser";
import { validateQuickTripCandidate } from "../lib/quick-trip-entry/validation";

const now = new Date("2026-06-21T01:00:00.000Z");

assert.deepEqual(splitQuickTripInput("8h HN - HP 150k 0912345678 1k"), [
  "8h HN - HP 150k 0912345678 1k",
]);

const chunks = splitQuickTripInput("8h HN - HP 150k 0912345678 1k\n9h HP - HN 200k 0987654321 2k");
assert.equal(chunks.length, 2);

const [parsed] = parseQuickTripInput("8h HN - HP 150k 0912345678 1k", now);
assert.equal(parsed.candidate.customerPhone, "0912345678");
assert.equal(parsed.candidate.departure, "HN");
assert.equal(parsed.candidate.destination, "HP");
assert.equal(parsed.candidate.price, 150000);
assert.equal(parsed.candidate.totalSeats, 1);
assert.equal(parsed.candidate.tripType, "ghep");

const complete = validateQuickTripCandidate(parsed.candidate);
assert.equal(complete.canAutoSave, true);

const [missing] = parseQuickTripInput("HN - HP 0912345678", now);
const review = validateQuickTripCandidate(missing.candidate);
assert.equal(review.canAutoSave, false);
assert.ok(review.candidate.missingFields.includes("price"));

console.log("quick-trip parser checks passed");
```

- [ ] **Step 7: Run parser verification**

Run: `npx tsx scripts/verify-quick-trip-parser.ts`

Expected: `quick-trip parser checks passed`.

---

## Task 4: Quick-Entry Service Layer

**Files:**
- Create: `lib/quick-trip-entry/serializer.ts`
- Create: `lib/quick-trip-entry/service.ts`
- Create: `scripts/verify-quick-trip-service.ts`

- [ ] **Step 1: Create serializer**

Create `lib/quick-trip-entry/serializer.ts`:

```ts
import type { Prisma } from "@prisma/client";

export type QuickEntrySessionWithCounts = Prisma.QuickTripEntrySessionGetPayload<{
  include: { items: { select: { parseStatus: true } } };
}>;

export function serializeQuickEntrySession(session: QuickEntrySessionWithCounts) {
  const pendingCount = session.items.filter((item) =>
    ["pending", "parsed", "needs_review"].includes(item.parseStatus)
  ).length;
  const errorCount = session.items.filter((item) => item.parseStatus === "failed").length;
  return {
    id: session.id,
    name: session.name,
    sourceType: session.sourceType,
    status: session.status,
    lastInputAt: session.lastInputAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    pendingCount,
    errorCount,
  };
}

export function serializeQuickEntryItem(item: {
  id: number;
  sessionId: number;
  rawText: string;
  source: string;
  parseStatus: string;
  parsedData: unknown;
  missingFields: unknown;
  warnings: unknown;
  confidence: unknown;
  createdTripId: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    sessionId: item.sessionId,
    rawText: item.rawText,
    source: item.source,
    status: item.parseStatus,
    parsedData: item.parsedData,
    missingFields: item.missingFields ?? [],
    warnings: item.warnings ?? [],
    confidence: item.confidence == null ? null : Number(item.confidence),
    createdTripId: item.createdTripId,
    errorMessage: item.errorMessage,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
```

- [ ] **Step 2: Implement service operations**

Create `lib/quick-trip-entry/service.ts` with these exported functions:

```ts
import type { PrismaClient } from "@prisma/client";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import { createTripForAccount } from "@/lib/trips/create-trip";
import { parseQuickTripInput } from "./parser";
import { serializeQuickEntryItem, serializeQuickEntrySession } from "./serializer";
import { QUICK_ENTRY_ITEM_STATUSES, type QuickEntrySource, type QuickTripCandidate } from "./types";
import { validateQuickTripCandidate } from "./validation";

export interface QuickEntryContext {
  accountId: number;
  actorId: number;
}

export async function listQuickEntrySessions(parentDb: PrismaClient, context: QuickEntryContext) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const sessions = await db.quickTripEntrySession.findMany({
    where: { status: "active" },
    include: { items: { select: { parseStatus: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return sessions.map(serializeQuickEntrySession);
}

export async function createQuickEntrySession(
  parentDb: PrismaClient,
  context: QuickEntryContext,
  input: { name: string; sourceType?: string }
) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const session = await db.quickTripEntrySession.create({
    data: {
      name: input.name.trim().slice(0, 120),
      sourceType: input.sourceType || "conversation",
      createdById: context.actorId,
    },
    include: { items: { select: { parseStatus: true } } },
  });
  return serializeQuickEntrySession(session);
}

export async function listQuickEntryItems(parentDb: PrismaClient, context: QuickEntryContext, sessionId: number) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const items = await db.quickTripEntryItem.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return items.map(serializeQuickEntryItem);
}

export async function createQuickEntryItems(
  parentDb: PrismaClient,
  context: QuickEntryContext,
  input: { sessionId: number; rawText: string; source: QuickEntrySource; autoSave: boolean }
) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const session = await db.quickTripEntrySession.findFirst({ where: { id: input.sessionId } });
  if (!session) throw new Error("Session not found");

  const parsed = parseQuickTripInput(input.rawText);
  const created = [];
  for (const chunk of parsed) {
    const validation = validateQuickTripCandidate(chunk.candidate);
    const item = await db.quickTripEntryItem.create({
      data: {
        sessionId: input.sessionId,
        rawText: chunk.rawText,
        source: input.source,
        parseStatus: validation.canAutoSave && input.autoSave
          ? QUICK_ENTRY_ITEM_STATUSES.PARSED
          : validation.candidate.missingFields.length > 0 || validation.candidate.warnings.length > 0
            ? QUICK_ENTRY_ITEM_STATUSES.NEEDS_REVIEW
            : QUICK_ENTRY_ITEM_STATUSES.PARSED,
        parsedData: validation.candidate,
        missingFields: validation.candidate.missingFields,
        warnings: validation.candidate.warnings,
        confidence: validation.candidate.confidence,
      },
    });
    if (validation.canAutoSave && input.autoSave) {
      created.push(await saveQuickEntryItem(parentDb, context, item.id, true));
    } else {
      created.push(serializeQuickEntryItem(item));
    }
  }

  await db.quickTripEntrySession.update({
    where: { id: input.sessionId },
    data: { lastInputAt: new Date() },
  });

  return created;
}

export async function updateQuickEntryItem(
  parentDb: PrismaClient,
  context: QuickEntryContext,
  itemId: number,
  parsedData: QuickTripCandidate
) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const validation = validateQuickTripCandidate(parsedData);
  const item = await db.quickTripEntryItem.update({
    where: { id: itemId },
    data: {
      parsedData: validation.candidate,
      missingFields: validation.candidate.missingFields,
      warnings: validation.candidate.warnings,
      confidence: validation.candidate.confidence,
      parseStatus: validation.candidate.missingFields.length > 0 || validation.candidate.warnings.length > 0
        ? QUICK_ENTRY_ITEM_STATUSES.NEEDS_REVIEW
        : QUICK_ENTRY_ITEM_STATUSES.PARSED,
      errorMessage: null,
    },
  });
  return serializeQuickEntryItem(item);
}

export async function saveQuickEntryItem(
  parentDb: PrismaClient,
  context: QuickEntryContext,
  itemId: number,
  autoSaved = false
) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const item = await db.quickTripEntryItem.findFirst({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");
  if (item.createdTripId) return serializeQuickEntryItem(item);

  const candidate = item.parsedData as QuickTripCandidate | null;
  if (!candidate) throw new Error("Item has no parsed data");
  const validation = validateQuickTripCandidate(candidate);
  if (validation.candidate.missingFields.length > 0 || validation.candidate.warnings.length > 0) {
    const updated = await db.quickTripEntryItem.update({
      where: { id: item.id },
      data: {
        parseStatus: QUICK_ENTRY_ITEM_STATUSES.NEEDS_REVIEW,
        missingFields: validation.candidate.missingFields,
        warnings: validation.candidate.warnings,
        errorMessage: "Item needs review before saving",
      },
    });
    return serializeQuickEntryItem(updated);
  }

  try {
    const trip = await createTripForAccount(parentDb, {
      customerPhone: candidate.customerPhone,
      customerName: candidate.customerName,
      departure: candidate.departure!,
      destination: candidate.destination!,
      pickupLocation: candidate.pickupLocation,
      dropoffLocation: candidate.dropoffLocation,
      departureTime: candidate.departureTime!,
      price: candidate.price!,
      totalSeats: candidate.totalSeats || 1,
      tripType: candidate.tripType || "ghep",
      tripDirection: candidate.tripDirection || "oneway",
      driverId: candidate.driverId ?? null,
      notes: candidate.notes || item.rawText,
      seats: candidate.totalSeats || 1,
    }, context);

    const updated = await db.quickTripEntryItem.update({
      where: { id: item.id },
      data: {
        parseStatus: autoSaved ? QUICK_ENTRY_ITEM_STATUSES.AUTO_SAVED : QUICK_ENTRY_ITEM_STATUSES.SAVED,
        createdTripId: trip.id,
        errorMessage: null,
      },
    });
    return serializeQuickEntryItem(updated);
  } catch (error) {
    const updated = await db.quickTripEntryItem.update({
      where: { id: item.id },
      data: {
        parseStatus: QUICK_ENTRY_ITEM_STATUSES.FAILED,
        errorMessage: error instanceof Error ? error.message : "Save failed",
      },
    });
    return serializeQuickEntryItem(updated);
  }
}

export async function saveValidQuickEntryItems(parentDb: PrismaClient, context: QuickEntryContext, sessionId: number) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const items = await db.quickTripEntryItem.findMany({
    where: { sessionId, parseStatus: { in: ["parsed"] } },
    orderBy: { createdAt: "asc" },
  });
  const results = [];
  for (const item of items) {
    results.push(await saveQuickEntryItem(parentDb, context, item.id, false));
  }
  return results;
}

export async function deleteQuickEntrySession(
  parentDb: PrismaClient,
  context: QuickEntryContext,
  sessionId: number,
  confirmDiscard: boolean
) {
  const db = createTenantPrisma(parentDb, context.accountId);
  const unfinished = await db.quickTripEntryItem.count({
    where: {
      sessionId,
      parseStatus: { in: ["pending", "parsed", "needs_review"] },
    },
  });
  if (unfinished > 0 && !confirmDiscard) {
    return { deleted: false, blocked: true, unfinishedCount: unfinished };
  }
  await db.quickTripEntrySession.delete({ where: { id: sessionId } });
  return { deleted: true, blocked: false, unfinishedCount: 0 };
}
```

If Prisma's generated `JsonValue` type rejects direct `QuickTripCandidate`, cast through `Prisma.InputJsonValue` inside the implementation.

- [ ] **Step 3: Add service smoke script**

Create `scripts/verify-quick-trip-service.ts`:

```ts
import assert from "node:assert/strict";
import { QUICK_ENTRY_AUTO_SAVE_THRESHOLD } from "../lib/quick-trip-entry/validation";

assert.equal(QUICK_ENTRY_AUTO_SAVE_THRESHOLD, 0.85);
console.log("quick-trip service constants check passed");
```

- [ ] **Step 4: Run checks**

Run:

```powershell
npx tsx scripts\verify-quick-trip-parser.ts
npx tsx scripts\verify-quick-trip-service.ts
npx tsc --noEmit
```

Expected: parser and service scripts pass; typecheck has no new quick-entry service errors.

---

## Task 5: Quick-Entry API Routes

**Files:**
- Create: `app/api/quick-trip-entry/sessions/route.ts`
- Create: `app/api/quick-trip-entry/sessions/[id]/route.ts`
- Create: `app/api/quick-trip-entry/sessions/[id]/items/route.ts`
- Create: `app/api/quick-trip-entry/items/[itemId]/route.ts`
- Create: `app/api/quick-trip-entry/items/[itemId]/save/route.ts`
- Create: `app/api/quick-trip-entry/sessions/[id]/save-valid/route.ts`

- [ ] **Step 1: Create sessions route**

`app/api/quick-trip-entry/sessions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createQuickEntrySession, listQuickEntrySessions } from "@/lib/quick-trip-entry/service";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listQuickEntrySessions(prisma, { accountId: user.accountId, actorId: user.id });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Session name is required" }, { status: 400 });
  const data = await createQuickEntrySession(prisma, { accountId: user.accountId, actorId: user.id }, {
    name,
    sourceType: body.sourceType || "conversation",
  });
  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 2: Create session update/delete route**

`app/api/quick-trip-entry/sessions/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import { deleteQuickEntrySession } from "@/lib/quick-trip-entry/service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const db = createTenantPrisma(prisma, user.accountId);
  const session = await db.quickTripEntrySession.update({
    where: { id: Number(id) },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim().slice(0, 120) } : {}),
      ...(body.status !== undefined ? { status: body.status === "archived" ? "archived" : "active" } : {}),
    },
  });
  return NextResponse.json({ success: true, data: session });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const result = await deleteQuickEntrySession(
    prisma,
    { accountId: user.accountId, actorId: user.id },
    Number(id),
    searchParams.get("confirmDiscard") === "true"
  );
  if (result.blocked) {
    return NextResponse.json({ success: false, error: "Session has unfinished items", data: result }, { status: 409 });
  }
  return NextResponse.json({ success: true, data: result });
}
```

- [ ] **Step 3: Create session items route**

`app/api/quick-trip-entry/sessions/[id]/items/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createQuickEntryItems, listQuickEntryItems } from "@/lib/quick-trip-entry/service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await listQuickEntryItems(prisma, { accountId: user.accountId, actorId: user.id }, Number(id));
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const rawText = String(body.rawText || "").trim();
  if (!rawText) return NextResponse.json({ error: "Input text is required" }, { status: 400 });
  const data = await createQuickEntryItems(prisma, { accountId: user.accountId, actorId: user.id }, {
    sessionId: Number(id),
    rawText,
    source: body.source === "voice" || body.source === "paste" ? body.source : "text",
    autoSave: body.autoSave !== false,
  });
  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 4: Create item update route**

`app/api/quick-trip-entry/items/[itemId]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { updateQuickEntryItem } from "@/lib/quick-trip-entry/service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemId } = await params;
  const body = await request.json();
  const data = await updateQuickEntryItem(prisma, { accountId: user.accountId, actorId: user.id }, Number(itemId), body.parsedData);
  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 5: Create save routes**

`app/api/quick-trip-entry/items/[itemId]/save/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveQuickEntryItem } from "@/lib/quick-trip-entry/service";

export async function POST(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { itemId } = await params;
  const data = await saveQuickEntryItem(prisma, { accountId: user.accountId, actorId: user.id }, Number(itemId));
  return NextResponse.json({ success: true, data });
}
```

`app/api/quick-trip-entry/sessions/[id]/save-valid/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveValidQuickEntryItems } from "@/lib/quick-trip-entry/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await saveValidQuickEntryItems(prisma, { accountId: user.accountId, actorId: user.id }, Number(id));
  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 6: Verify API typecheck**

Run: `npx tsc --noEmit`

Expected: no type errors from quick-entry routes.

---

## Task 6: Mobile Quick-Entry UI

**Files:**
- Create: `app/dashboard/schedule/quick-entry/page.tsx`
- Create: `components/quick-trip-entry/quick-entry-client.tsx`
- Create: `components/quick-trip-entry/session-rail.tsx`
- Create: `components/quick-trip-entry/quick-input-panel.tsx`
- Create: `components/quick-trip-entry/draft-card.tsx`
- Create: `components/quick-trip-entry/draft-editor-sheet.tsx`
- Modify: `app/dashboard/schedule/page.tsx` or `components/schedule-list.tsx`

- [ ] **Step 1: Create page shell**

`app/dashboard/schedule/quick-entry/page.tsx`:

```tsx
"use client";

import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import QuickEntryClient from "@/components/quick-trip-entry/quick-entry-client";

export default function QuickEntryPage() {
  return (
    <div className="page-wrapper">
      <Sidebar>
        <Header />
        <div className="min-h-[calc(100vh-64px)] bg-slate-950 pb-24 lg:pb-6">
          <QuickEntryClient />
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Create shared UI types in client**

`components/quick-trip-entry/quick-entry-client.tsx` should define:

```tsx
export interface QuickEntrySessionView {
  id: number;
  name: string;
  status: string;
  pendingCount: number;
  errorCount: number;
}

export interface QuickEntryItemView {
  id: number;
  sessionId: number;
  rawText: string;
  source: string;
  status: string;
  parsedData: any;
  missingFields: string[];
  warnings: string[];
  confidence: number | null;
  createdTripId: number | null;
  errorMessage: string | null;
}
```

The client owns session loading, active session id, item loading, submit, save, save all, delete session, and editor state.

- [ ] **Step 3: Implement session rail**

`components/quick-trip-entry/session-rail.tsx`:

```tsx
"use client";

import { Plus } from "lucide-react";
import type { QuickEntrySessionView } from "./quick-entry-client";

export default function SessionRail({
  sessions,
  activeId,
  onSelect,
  onCreate,
}: {
  sessions: QuickEntrySessionView[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-3 no-scrollbar">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
            activeId === session.id ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white"
          }`}
        >
          {session.name}
          {(session.pendingCount > 0 || session.errorCount > 0) && (
            <span className="ml-2 rounded-full bg-slate-950/30 px-2 py-0.5 text-xs">
              {session.pendingCount + session.errorCount}
            </span>
          )}
        </button>
      ))}
      <button onClick={onCreate} className="shrink-0 rounded-full bg-white px-3 py-2 text-slate-950">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Implement input panel**

`components/quick-trip-entry/quick-input-panel.tsx` renders textarea plus sticky send/mic controls. It accepts `value`, `onChange`, `onSubmit`, `onMicToggle`, `listening`, and `speechSupported`.

Use mobile-first classes:

```tsx
className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur"
```

The send button text is `Gui cuoc`; the mic button text is `Doc voice` or `Dung`.

- [ ] **Step 5: Implement draft cards**

`components/quick-trip-entry/draft-card.tsx` displays:

- route from `parsedData.departure` and `parsedData.destination`
- time from `parsedData.departureTime`
- price with `Intl.NumberFormat("vi-VN")`
- phone from `parsedData.customerPhone`
- badge for `saved`, `auto_saved`, `needs_review`, `failed`, `parsed`
- buttons `Sua`, `Luu`, `Bo`

- [ ] **Step 6: Implement bottom-sheet editor**

`components/quick-trip-entry/draft-editor-sheet.tsx` uses a fixed overlay:

```tsx
<div className="fixed inset-0 z-[80] bg-black/50">
  <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-4">
```

Fields:

- phone/name
- departure/destination
- pickup/dropoff
- date/time
- price
- seats
- trip type/direction
- driverId as numeric text input in first version
- notes

Save calls `PATCH /api/quick-trip-entry/items/[itemId]` with `parsedData`.

- [ ] **Step 7: Add quick-entry link from schedule**

Add a mobile-visible action near the schedule content:

```tsx
<Link
  href="/dashboard/schedule/quick-entry"
  className="mb-3 flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg lg:hidden"
>
  Tao cuoc nhanh
</Link>
```

Use the location that causes the least churn: `app/dashboard/schedule/page.tsx` above `<ScheduleList />` is preferred.

- [ ] **Step 8: Verify UI compiles**

Run: `npx tsc --noEmit`

Expected: no quick-entry component type errors.

---

## Task 7: Browser Voice Support

**Files:**
- Create: `types/speech-recognition.d.ts`
- Create: `components/quick-trip-entry/use-browser-speech.ts`
- Modify: `components/quick-trip-entry/quick-entry-client.tsx`
- Modify: `components/quick-trip-entry/quick-input-panel.tsx`

- [ ] **Step 1: Add minimal type declarations**

Create `types/speech-recognition.d.ts`:

```ts
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
```

- [ ] **Step 2: Implement hook**

Create `components/quick-trip-entry/use-browser-speech.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

export function useBrowserSpeech(onTranscript: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "vi-VN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0]?.transcript || "";
      }
      onTranscript(text.trim());
    };
    recognition.onerror = () => {
      setError("Khong nghe duoc voice. Hay nhap text thu cong.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [onTranscript]);

  const toggle = () => {
    if (!recognitionRef.current) {
      setError("Trinh duyet nay chua ho tro nhan voice.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setError(null);
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return { supported, listening, error, toggle };
}
```

- [ ] **Step 3: Wire voice to input**

In `quick-entry-client.tsx`, call `useBrowserSpeech((text) => setInputText(text))` and pass `toggle`, `listening`, `supported`, and `error` into `QuickInputPanel`.

When submitting voice text, send `source: "voice"` if the last action was voice; otherwise send `source: "text"` or `"paste"` based on line count.

- [ ] **Step 4: Verify unsupported browser fallback**

Run app locally and test in a browser where SpeechRecognition is unavailable or disabled. Expected: mic button shows fallback message and text entry still works.

---

## Task 8: Session Deletion And Storage Cleanup UX

**Files:**
- Modify: `components/quick-trip-entry/quick-entry-client.tsx`
- Modify: `components/quick-trip-entry/session-rail.tsx`
- Modify: `components/quick-trip-entry/draft-card.tsx`

- [ ] **Step 1: Add delete session action**

In the active session controls, add button text `Xoa phien`. First request:

```ts
await fetch(`/api/quick-trip-entry/sessions/${activeSessionId}`, { method: "DELETE" });
```

If the API returns `409`, show a confirm panel:

```ts
const ok = window.confirm("Phien con cuoc nhap do. Xoa phien se bo qua cac draft chua luu, nhung khong xoa Trip da tao. Tiep tuc?");
```

If confirmed:

```ts
await fetch(`/api/quick-trip-entry/sessions/${activeSessionId}?confirmDiscard=true`, { method: "DELETE" });
```

- [ ] **Step 2: Refresh state after delete**

After successful delete, reload sessions. If sessions remain, select the newest active session. If none remain, create default session named `Nguon moi`.

- [ ] **Step 3: Verify Trip safety**

Manual check after saving a draft as a trip:

- Delete the session.
- Visit `/dashboard/schedule`.
- Confirm the created trip remains in the schedule list.

---

## Task 9: Verification And OpenSpec Task Sync

**Files:**
- Modify: `openspec/changes/ai-quick-trip-entry/tasks.md`

- [ ] **Step 1: Run generation and parser checks**

Run:

```powershell
npx prisma generate
npx tsx scripts\verify-quick-trip-parser.ts
npx tsx scripts\verify-quick-trip-service.ts
```

Expected:

- Prisma generate exits `0`.
- Parser script prints `quick-trip parser checks passed`.
- Service script prints `quick-trip service constants check passed`.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`

Expected: exits `0`, or any failure is confirmed unrelated to files touched in this change.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: repo may have baseline lint failures. Classify any failure in quick-entry files as blocking and fix it.

- [ ] **Step 4: Manual mobile smoke test**

Use a mobile viewport and verify:

- create session named `Zalo A`
- switch between two sessions without losing draft queue
- enter one line and create one item
- paste two lines and create two items
- save one valid item as Trip
- save all valid items
- edit a `needs_review` item in the bottom sheet
- delete a completed session
- delete an unfinished session only after discard confirmation
- confirm Trips created from deleted sessions remain visible in schedule
- mic fallback appears if browser speech recognition is unsupported

- [ ] **Step 5: Update OpenSpec tasks**

Mark completed items in `openspec/changes/ai-quick-trip-entry/tasks.md` only after the relevant verification has passed.

---

## Self-Review Checklist

- REQ-QTE-001 server sessions: covered by Tasks 1, 4, 5, 6.
- REQ-QTE-002 mobile session navigation: covered by Task 6.
- REQ-QTE-003 text/paste entry: covered by Tasks 3, 5, 6.
- REQ-QTE-004 browser voice transcript: covered by Task 7.
- REQ-QTE-005 auto-save safety: covered by Tasks 3, 4, 5.
- REQ-QTE-006 bottom-sheet edit: covered by Task 6.
- REQ-QTE-007 bulk save valid: covered by Tasks 4, 5, 6.
- REQ-QTE-008 account isolation: covered by Tasks 1, 4, 5.
- REQ-QTE-009 archive/delete sessions: covered by Tasks 1, 5, 8.
- REQ-TRIP-QUICK-001 normal trip creation: covered by Task 2 and Task 4.
- REQ-TRIP-QUICK-002 validation: covered by Task 3.
- REQ-TRIP-QUICK-003 low-confidence review: covered by Task 3 and Task 4.
- REQ-TRIP-QUICK-004 multi-line candidates: covered by Task 3.
- REQ-TRIP-QUICK-005 raw input preservation: covered by Tasks 1, 4, 6.

## Implementation Notes

- Keep `rawText` visible/copyable until the session is deleted.
- Treat `quickTripEntryItem.createdTripId` as traceability only; never cascade delete Trips.
- If extracting `createTripForAccount` exposes existing route complexity, preserve behavior first and refactor only the minimum needed for reuse.
- The deterministic parser is intentionally conservative; AI provider integration can enrich candidates without becoming a hard dependency.
