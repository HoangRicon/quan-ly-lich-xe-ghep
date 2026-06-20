# Reporting Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reliable reporting foundation where revenue is recognized by trip `createdAt`, driver assignment recency comes from auditable trip events, and the reports UI presents money, operations, and quality metrics clearly.

**Architecture:** Add append-only `TripEvent` data first, then move report calculations into pure-ish `lib/reports/*` services. API routes become thin wrappers, and the UI consumes richer response fields without duplicating accounting logic.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Tailwind CSS, Recharts, tsx scripts.

---

## File Structure Mapping

- Modify: `prisma/schema.prisma` adds `TripEvent` model and relations from `Account`/`Trip`.
- Create: `prisma/migrations/20260620000001_add_trip_events/migration.sql` creates `trip_events` table and indexes.
- Create: `lib/trip-events.ts` records assignment/status events.
- Create: `scripts/backfill-trip-events.ts` idempotently backfills legacy assignment events.
- Create: `lib/reports/date-range.ts` parses current and previous report periods.
- Create: `lib/reports/trip-metrics.ts` holds shared bucket/rate/money helpers.
- Create: `lib/reports/overview-report.ts` calculates overview KPIs and chart data.
- Create: `lib/reports/driver-report.ts` calculates driver table data.
- Create: `scripts/verify-report-metrics.ts` runs focused calculator checks without adding a test framework.
- Modify: `app/api/trips/route.ts` records create-time driver assignment events.
- Modify: `app/api/trips/[id]/route.ts` records assignment/status events on update.
- Modify: `app/api/reports/stats/route.ts` delegates to overview service.
- Modify: `app/api/reports/drivers/route.ts` delegates to driver service.
- Modify: `app/api/reports/routes/route.ts` aligns period filtering to `createdAt`.
- Modify: `app/api/reports/customers/route.ts` aligns period filtering to `createdAt`.
- Modify: `components/reports/kpi-cards.tsx` renders money/operations/quality groups.
- Modify: `components/reports/status-pie-chart.tsx` consumes count-based status distribution.
- Modify: `components/reports/revenue-chart.tsx` labels revenue as by created trip date.
- Modify: `components/reports/driver-report-tab.tsx` adds rate/points/last assignment columns.
- Modify: `app/dashboard/reports/page.tsx` updates types and overview layout props.
- Modify: `docs/bao-cao-data-flow.md` and `docs/bao-cao-thuat-toan.md` replace `departureTime` semantics with `createdAt`.

---

## Task 1: Schema And Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260620000001_add_trip_events/migration.sql`

- [ ] **Step 1: Update Prisma schema**

Add relation fields:

```prisma
model Account {
  // existing fields
  tripEvents TripEvent[]
}

model Trip {
  // existing fields
  events TripEvent[]
}
```

Add model:

```prisma
model TripEvent {
  id           Int      @id @default(autoincrement())
  tripId       Int      @map("trip_id")
  accountId    Int      @map("account_id")
  type         String   @db.VarChar(50)
  fromStatus   String?  @map("from_status") @db.VarChar(50)
  toStatus     String?  @map("to_status") @db.VarChar(50)
  fromDriverId Int?     @map("from_driver_id")
  toDriverId   Int?     @map("to_driver_id")
  actorId      Int?     @map("actor_id")
  note         String?
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  account      Account  @relation(fields: [accountId], references: [id])
  trip         Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([accountId, createdAt], map: "idx_trip_events_account_created")
  @@index([accountId, type, createdAt], map: "idx_trip_events_account_type_created")
  @@index([accountId, toDriverId, createdAt], map: "idx_trip_events_account_to_driver_created")
  @@index([tripId], map: "idx_trip_events_trip")
  @@map("trip_events")
}
```

- [ ] **Step 2: Create SQL migration**

Create:

```sql
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
  CONSTRAINT "trip_events_trip_id_fkey"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
```

- [ ] **Step 3: Generate Prisma client**

Run: `npx prisma generate`

Expected: command exits `0` and generated client includes `tripEvent`.

---

## Task 2: Trip Event Helpers

**Files:**
- Create: `lib/trip-events.ts`

- [ ] **Step 1: Implement event helpers**

Create helpers with explicit event names:

```ts
import type { PrismaClient } from "@prisma/client";

export const TRIP_EVENT_TYPES = {
  DRIVER_ASSIGNED: "driver_assigned",
  DRIVER_CHANGED: "driver_changed",
  DRIVER_UNASSIGNED: "driver_unassigned",
  STATUS_CHANGED: "status_changed",
  TRIP_COMPLETED: "trip_completed",
  TRIP_CANCELLED: "trip_cancelled",
} as const;

type TripEventWriter = {
  tripEvent: Pick<PrismaClient["tripEvent"], "create" | "createMany">;
};

export async function recordDriverAssignmentEvent(
  db: TripEventWriter,
  input: {
    tripId: number;
    accountId: number;
    fromDriverId: number | null;
    toDriverId: number | null;
    actorId: number | null;
    createdAt?: Date;
  }
) {
  if (input.fromDriverId === input.toDriverId) return null;
  const type =
    input.fromDriverId == null && input.toDriverId != null
      ? TRIP_EVENT_TYPES.DRIVER_ASSIGNED
      : input.fromDriverId != null && input.toDriverId == null
      ? TRIP_EVENT_TYPES.DRIVER_UNASSIGNED
      : TRIP_EVENT_TYPES.DRIVER_CHANGED;

  return db.tripEvent.create({
    data: {
      tripId: input.tripId,
      accountId: input.accountId,
      type,
      fromDriverId: input.fromDriverId,
      toDriverId: input.toDriverId,
      actorId: input.actorId,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}

export async function recordStatusEvents(
  db: TripEventWriter,
  input: {
    tripId: number;
    accountId: number;
    fromStatus: string;
    toStatus: string;
    actorId: number | null;
  }
) {
  if (input.fromStatus === input.toStatus) return [];
  const events = [
    {
      tripId: input.tripId,
      accountId: input.accountId,
      type: TRIP_EVENT_TYPES.STATUS_CHANGED,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorId: input.actorId,
    },
  ];
  if (input.toStatus === "completed") {
    events.push({ ...events[0], type: TRIP_EVENT_TYPES.TRIP_COMPLETED });
  }
  if (input.toStatus === "cancelled") {
    events.push({ ...events[0], type: TRIP_EVENT_TYPES.TRIP_CANCELLED });
  }
  return db.tripEvent.createMany({ data: events });
}
```

- [ ] **Step 2: Typecheck helper**

Run: `npx tsc --noEmit`

Expected: if Prisma client is generated, no new type errors from `lib/trip-events.ts`.

---

## Task 3: Backfill Legacy Assignment Events

**Files:**
- Create: `scripts/backfill-trip-events.ts`

- [ ] **Step 1: Implement idempotent backfill**

Create script:

```ts
import { prisma } from "../lib/prisma";
import { TRIP_EVENT_TYPES } from "../lib/trip-events";

async function main() {
  const trips = await prisma.trip.findMany({
    where: { driverId: { not: null } },
    select: { id: true, accountId: true, driverId: true, createdAt: true },
  });

  let inserted = 0;
  for (const trip of trips) {
    const exists = await prisma.tripEvent.findFirst({
      where: {
        tripId: trip.id,
        accountId: trip.accountId,
        type: {
          in: [
            TRIP_EVENT_TYPES.DRIVER_ASSIGNED,
            TRIP_EVENT_TYPES.DRIVER_CHANGED,
          ],
        },
      },
      select: { id: true },
    });
    if (exists || trip.driverId == null) continue;
    await prisma.tripEvent.create({
      data: {
        tripId: trip.id,
        accountId: trip.accountId,
        type: TRIP_EVENT_TYPES.DRIVER_ASSIGNED,
        fromDriverId: null,
        toDriverId: trip.driverId,
        actorId: null,
        note: "Backfilled from existing trip.driverId",
        createdAt: trip.createdAt,
      },
    });
    inserted++;
  }

  console.log(`Backfill complete. checked=${trips.length} inserted=${inserted}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run script after migration**

Run: `npx tsx scripts/backfill-trip-events.ts`

Expected: logs checked/inserted counts and exits `0`.

---

## Task 4: Record Events In Trip APIs

**Files:**
- Modify: `app/api/trips/route.ts`
- Modify: `app/api/trips/[id]/route.ts`

- [ ] **Step 1: Record assignment on create**

In `POST /api/trips`, after `db.trip.create`, add:

```ts
if (trip.driverId != null) {
  await recordDriverAssignmentEvent(db, {
    tripId: trip.id,
    accountId: user.accountId,
    fromDriverId: null,
    toDriverId: trip.driverId,
    actorId: user.id,
    createdAt: trip.createdAt,
  });
}
```

Also import:

```ts
import { recordDriverAssignmentEvent } from "@/lib/trip-events";
```

- [ ] **Step 2: Record assignment/status on update**

In `PUT /api/trips/[id]`, expand the initial select:

```ts
select: { id: true, status: true, driverId: true, accountId: true },
```

After `db.trip.update`, add:

```ts
if (driverId !== undefined && oldDriverId !== trip.driverId) {
  await recordDriverAssignmentEvent(db, {
    tripId: trip.id,
    accountId: user.accountId,
    fromDriverId: oldDriverId,
    toDriverId: trip.driver?.id ?? null,
    actorId: user.id,
  });
}

if (finalStatus !== undefined && finalStatus !== currentStatus) {
  await recordStatusEvents(db, {
    tripId: trip.id,
    accountId: user.accountId,
    fromStatus: currentStatus,
    toStatus: finalStatus,
    actorId: user.id,
  });
}
```

Also import `recordStatusEvents`.

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`

Expected: any typing friction around tenant Prisma is resolved with a local interface instead of broad runtime changes.

---

## Task 5: Report Metric Helpers

**Files:**
- Create: `lib/reports/date-range.ts`
- Create: `lib/reports/trip-metrics.ts`
- Create: `scripts/verify-report-metrics.ts`

- [ ] **Step 1: Create date range helper**

```ts
export interface ReportDateRange {
  current?: { gte?: Date; lte?: Date };
  previous?: { gte: Date; lte: Date };
}

export function parseReportDateRange(startDate?: string | null, endDate?: string | null): ReportDateRange {
  const current: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const [y, m, d] = startDate.split("-").map(Number);
    current.gte = new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  if (endDate) {
    const [y, m, d] = endDate.split("-").map(Number);
    current.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  const output: ReportDateRange = Object.keys(current).length ? { current } : {};
  if (current.gte && current.lte) {
    const duration = current.lte.getTime() - current.gte.getTime();
    output.previous = {
      gte: new Date(current.gte.getTime() - duration - 1),
      lte: new Date(current.lte.getTime() - duration - 1),
    };
  }
  return output;
}
```

- [ ] **Step 2: Create metrics helper**

```ts
export type ReportStatusBucket = "completed" | "cancelled" | "assigned" | "unassigned";

export function reportStatusBucket(trip: { status: string; driverId?: number | null }): ReportStatusBucket {
  if (trip.status === "completed") return "completed";
  if (trip.status === "cancelled") return "cancelled";
  return trip.driverId == null ? "unassigned" : "assigned";
}

export function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export function changePercent(current: number, previous: number) {
  if (previous > 0) return Math.round(((current - previous) / previous) * 1000) / 10;
  return current > 0 ? 100 : 0;
}

export function toDayKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function toMonthKey(date: Date) {
  return toDayKey(date).slice(0, 7);
}
```

- [ ] **Step 3: Create focused verification script**

```ts
import assert from "node:assert/strict";
import { percent, reportStatusBucket, toDayKey } from "../lib/reports/trip-metrics";

assert.equal(percent(3, 5), 60);
assert.equal(percent(1, 4), 25);
assert.equal(reportStatusBucket({ status: "completed", driverId: null }), "completed");
assert.equal(reportStatusBucket({ status: "scheduled", driverId: 10 }), "assigned");
assert.equal(reportStatusBucket({ status: "scheduled", driverId: null }), "unassigned");
assert.equal(toDayKey(new Date("2026-06-19T17:30:00.000Z")), "2026-06-20");

console.log("report metric checks passed");
```

Run: `npx tsx scripts/verify-report-metrics.ts`

Expected: `report metric checks passed`.

---

## Task 6: Overview Report Service And API

**Files:**
- Create: `lib/reports/overview-report.ts`
- Modify: `app/api/reports/stats/route.ts`

- [ ] **Step 1: Implement overview service**

Service shape:

```ts
import type { PrismaClient, Prisma } from "@prisma/client";
import { changePercent, percent, reportStatusBucket, toDayKey, toMonthKey } from "./trip-metrics";

type ReportDb = {
  trip: Pick<PrismaClient["trip"], "findMany">;
};

export async function getOverviewReport(
  db: ReportDb,
  input: {
    accountId: number;
    dateRange?: { gte?: Date; lte?: Date };
    previousRange?: { gte: Date; lte: Date };
    driverId?: number;
  }
) {
  const where: Prisma.TripWhereInput = {
    accountId: input.accountId,
    ...(input.dateRange ? { createdAt: input.dateRange } : {}),
    ...(input.driverId ? { driverId: input.driverId } : {}),
  };
  const trips = await db.trip.findMany({
    where,
    select: {
      id: true,
      status: true,
      driverId: true,
      price: true,
      profit: true,
      createdAt: true,
      pointsEarned: true,
    },
  });
  const previousTrips = input.previousRange
    ? await db.trip.findMany({
        where: {
          accountId: input.accountId,
          createdAt: input.previousRange,
          ...(input.driverId ? { driverId: input.driverId } : {}),
        },
        select: {
          status: true,
          price: true,
          profit: true,
        },
      })
    : [];
  const completed = trips.filter((trip) => trip.status === "completed");
  const totalTrips = trips.length;
  const completedTrips = completed.length;
  const cancelledTrips = trips.filter((trip) => reportStatusBucket(trip) === "cancelled").length;
  const assignedTrips = trips.filter((trip) => reportStatusBucket(trip) === "assigned").length;
  const unassignedTrips = trips.filter((trip) => reportStatusBucket(trip) === "unassigned").length;
  const totalRevenue = completed.reduce((sum, trip) => sum + Number(trip.price), 0);
  const totalProfit = completed.reduce((sum, trip) => sum + Number(trip.profit ?? 0), 0);
  const previousCompleted = previousTrips.filter((trip) => trip.status === "completed");
  const previousRevenue = previousCompleted.reduce((sum, trip) => sum + Number(trip.price), 0);
  const previousProfit = previousCompleted.reduce((sum, trip) => sum + Number(trip.profit ?? 0), 0);

  const statusCounts = { completed: 0, cancelled: 0, assigned: 0, unassigned: 0 };
  for (const trip of trips) statusCounts[reportStatusBucket(trip)]++;
  const statusDistribution = Object.entries(statusCounts).map(([bucket, count]) => ({
    bucket,
    count,
    percent: percent(count, totalTrips),
  }));

  const revenueByDayMap = new Map<string, { revenue: number; profit: number; trips: number }>();
  const revenueByMonthMap = new Map<string, { revenue: number; profit: number; trips: number }>();
  for (const trip of completed) {
    for (const [key, map] of [
      [toDayKey(trip.createdAt), revenueByDayMap],
      [toMonthKey(trip.createdAt), revenueByMonthMap],
    ] as const) {
      const existing = map.get(key) ?? { revenue: 0, profit: 0, trips: 0 };
      map.set(key, {
        revenue: existing.revenue + Number(trip.price),
        profit: existing.profit + Number(trip.profit ?? 0),
        trips: existing.trips + 1,
      });
    }
  }

  return {
    totalTrips,
    totalRevenue,
    totalProfit,
    completedTrips,
    assignedTrips,
    unassignedTrips,
    cancelledTrips,
    completionRate: percent(completedTrips, totalTrips),
    cancelRate: percent(cancelledTrips, totalTrips),
    avgTripValue: completedTrips > 0 ? totalRevenue / completedTrips : 0,
    avgProfitPerTrip: completedTrips > 0 ? totalProfit / completedTrips : 0,
    revenueByDay: Array.from(revenueByDayMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date)),
    revenueByMonth: Array.from(revenueByMonthMap.entries()).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month)),
    statusDistribution,
    revenueByStatus: statusCounts,
    revenueChangePercent: changePercent(totalRevenue, previousRevenue),
    profitChangePercent: changePercent(totalProfit, previousProfit),
    tripsChangePercent: changePercent(totalTrips, previousTrips.length),
  };
}
```

- [ ] **Step 2: Replace stats API body**

`app/api/reports/stats/route.ts` should:

```ts
const ranges = parseReportDateRange(startDate, endDate);
const data = await getOverviewReport(db, {
  accountId: user.accountId,
  dateRange: ranges.current,
  previousRange: ranges.previous,
  driverId: driverId ? Number(driverId) : undefined,
});
return NextResponse.json({ success: true, data });
```

- [ ] **Step 3: Run metric verification and typecheck**

Run: `npx tsx scripts/verify-report-metrics.ts`

Run: `npx tsc --noEmit`

Expected: checks pass; no new report service type errors.

---

## Task 7: Driver Report Service And API

**Files:**
- Create: `lib/reports/driver-report.ts`
- Modify: `app/api/reports/drivers/route.ts`

- [ ] **Step 1: Implement driver aggregation**

Service must fetch drivers, trips by `createdAt`, and latest assignment/completion events:

```ts
export interface DriverReportRow {
  id: number;
  fullName: string;
  phone: string;
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  totalProfit: number;
  totalPoints: number;
  completionRate: number;
  cancelRate: number;
  avgTripValue: number;
  avgProfitPerCompletedTrip: number;
  lastAssignedAt: string | null;
  lastCompletedAt: string | null;
  badge: "top" | "active" | "normal";
}
```

Use `tripEvent.findMany` for:

```ts
where: {
  accountId,
  type: { in: ["driver_assigned", "driver_changed"] },
  toDriverId: { in: driverIds },
}
```

Then reduce latest per `toDriverId`.

- [ ] **Step 2: Replace drivers API**

Keep query params stable: `startDate`, `endDate`, `search`, `sortBy`, `sortOrder`, `page`, `limit`.

Supported sort keys:

```ts
const sortFieldMap = {
  totalRevenue: "totalRevenue",
  totalTrips: "totalTrips",
  totalProfit: "totalProfit",
  completedTrips: "completedTrips",
  completionRate: "completionRate",
  cancelRate: "cancelRate",
  lastAssignedAt: "lastAssignedAt",
  name: "fullName",
} as const;
```

- [ ] **Step 3: Verify API type surface**

Run: `npx tsc --noEmit`

Expected: `DriverReportTab` may fail until UI task updates its interface; keep this failure noted and continue directly to Task 9.

---

## Task 8: Align Route And Customer Reports

**Files:**
- Modify: `app/api/reports/routes/route.ts`
- Modify: `app/api/reports/customers/route.ts`

- [ ] **Step 1: Change period filters**

Replace:

```ts
tripWhere.departureTime = dateRange;
```

with:

```ts
tripWhere.createdAt = dateRange;
```

For nested trip filters in customer report, replace:

```ts
tripCustomerWhere.trip = { departureTime: dateRange };
```

with:

```ts
tripCustomerWhere.trip = { createdAt: dateRange };
```

- [ ] **Step 2: Verify docs will later match**

Search: `rg -n "departureTime" app\\api\\reports`

Expected: no report period filtering still uses `departureTime`, unless explicitly labeled as display-only.

---

## Task 9: Reports UI Update

**Files:**
- Modify: `app/dashboard/reports/page.tsx`
- Modify: `components/reports/kpi-cards.tsx`
- Modify: `components/reports/status-pie-chart.tsx`
- Modify: `components/reports/revenue-chart.tsx`
- Modify: `components/reports/driver-report-tab.tsx`

- [ ] **Step 1: Update TypeScript interfaces**

Add fields:

```ts
completionRate: number;
cancelRate: number;
statusDistribution: Array<{ bucket: string; count: number; percent: number }>;
```

Driver:

```ts
totalPoints: number;
completionRate: number;
cancelRate: number;
avgProfitPerCompletedTrip: number;
lastAssignedAt: string | null;
lastCompletedAt: string | null;
```

- [ ] **Step 2: Update KPI cards into grouped sections**

Render groups:

```ts
const groups = [
  { title: "Tien", items: ["Doanh thu", "Loi nhuan", "TB cuoc HT"] },
  { title: "Van hanh", items: ["Tong cuoc", "Da gan", "Chua gan", "Hoan thanh", "Da huy"] },
  { title: "Chat luong", items: ["Ty le HT", "Ty le huy"] },
];
```

The final UI should still use existing visual language: white cards, slate borders, blue/green accents, compact dashboard density.

- [ ] **Step 3: Update status pie chart**

Change props to:

```ts
interface StatusPieChartProps {
  distribution: Array<{ bucket: string; count: number; percent: number }>;
  loading: boolean;
}
```

Tooltip must display count and percent, not VND.

- [ ] **Step 4: Update revenue chart label**

Change title map labels to include created-date semantics:

```ts
today: "Doanh thu theo ngay tao cuoc",
week: "Doanh thu theo ngay tao cuoc",
month: "Doanh thu theo ngay tao cuoc",
year: "Doanh thu theo thang tao cuoc",
all: "Doanh thu theo thang tao cuoc",
```

- [ ] **Step 5: Update driver table**

Add columns:

- `completionRate`
- `cancelRate`
- `totalPoints`
- `avgProfitPerCompletedTrip`
- `lastAssignedAt`

Use formatting:

```ts
function formatPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatDateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
    : "--";
}
```

- [ ] **Step 6: Run UI typecheck**

Run: `npx tsc --noEmit`

Expected: no type errors from report UI.

---

## Task 10: Documentation And Verification

**Files:**
- Modify: `docs/bao-cao-data-flow.md`
- Modify: `docs/bao-cao-thuat-toan.md`
- Modify: `progress.md`

- [ ] **Step 1: Update report docs**

Replace report date semantics:

```md
Bao cao tai chinh su dung `Trip.createdAt` de loc va nhom doanh thu. `departureTime` chi la thoi gian khoi hanh/van hanh, khong phai ngay ghi nhan doanh thu.
```

- [ ] **Step 2: Run verification**

Run:

```powershell
npx prisma generate
npx tsx scripts/verify-report-metrics.ts
npx tsc --noEmit
npm run lint
```

Expected:

- Prisma generate exits 0.
- Metric script exits 0.
- TypeScript exits 0.
- Lint may still fail on pre-existing repo-wide issues; record only new report/trip-event issues as blockers.

- [ ] **Step 3: Record evidence**

Update `progress.md` with:

- Commands run.
- Exit codes.
- Any lint failures classified as pre-existing or introduced.

---

## Implementation Notes

- Avoid broad refactors outside reports/trips.
- Do not delete existing OpenSpec changes.
- Keep backward-compatible `revenueByStatus` only as a temporary alias if it is cheap; new UI should read `statusDistribution`.
- Prefer fixing modified-file lint issues, but do not attempt a whole-repo lint cleanup in this change.
