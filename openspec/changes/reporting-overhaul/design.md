# Design

## 1. Data Model

Add `TripEvent` as an append-only event table for trip audit facts.

Required fields:

- `tripId`, `accountId`
- `type`
- `fromStatus`, `toStatus`
- `fromDriverId`, `toDriverId`
- `actorId`
- `note`
- `pointsEarned`, `profit`, `profitRate`, `formulaId`, `formulaName` for assignment snapshots
- `createdAt`

Event types:

- `driver_assigned`
- `driver_changed`
- `driver_unassigned`
- `status_changed`
- `trip_completed`
- `trip_cancelled`

Indexes must support:

- fetching events by trip
- aggregating latest assignment by driver
- account-scoped event queries by date/type

## 2. Event Recording

Create `lib/trip-events.ts` with helpers that are called by trip create/update routes.

Rules:

- Creating a trip with `driverId` records `driver_assigned`.
- Updating `driverId` from null to id records `driver_assigned`.
- Updating `driverId` from A to B records `driver_changed`.
- Updating `driverId` from id to null records `driver_unassigned`.
- Updating status records `status_changed`.
- Updating status to `completed` also records `trip_completed`.
- Updating status to `cancelled` also records `trip_cancelled`.
- Assignment/change events store the point/profit/formula snapshot calculated at assignment time.

Event writes must happen after the trip write succeeds. If an event write fails, the API should return an error rather than silently losing audit data.

## 3. Backfill

Create an idempotent backfill script:

- Finds existing trips with `driverId IS NOT NULL`.
- Inserts `driver_assigned` event with `createdAt = Trip.createdAt` only when no driver assignment event exists for that trip.
- Stores enough fields to identify account/trip/driver.
- Verifies count before/after.

## 4. Reporting Services

Create `lib/reports/` modules:

- `date-range.ts`: parse dates and previous period.
- `trip-metrics.ts`: shared money/count/rate/bucket helpers.
- `overview-report.ts`: aggregate overview KPIs, revenue chart, status distribution.
- `driver-report.ts`: aggregate per-driver stats.

Status buckets:

- `completed`
- `cancelled`
- `assigned`
- `unassigned`

Money rules:

- Revenue/profit only count `completed` trips.
- Date range filters trip `createdAt`.
- Average trip value divides by completed trips.
- Driver point/profit reconciliation uses `trip_events.createdAt` of assignment/change events as the period axis.
- Driver assignment snapshots are matched by `tripId + toDriverId` so a reassigned trip cannot reuse the previous driver's snapshot.

Rate rules:

- Completion/cancel rates divide by total trips in the selected period.
- Zero denominator returns 0.

## 5. API Routes

Modify:

- `app/api/reports/stats/route.ts`
- `app/api/reports/drivers/route.ts`
- optionally `app/api/reports/routes/route.ts` and `customers/route.ts` to align date semantics
- `app/api/trips/route.ts`
- `app/api/trips/[id]/route.ts`

Reports API response should include:

Overview:

- `totalRevenue`
- `totalProfit`
- `totalTrips`
- `completedTrips`
- `assignedTrips`
- `unassignedTrips`
- `cancelledTrips`
- `completionRate`
- `cancelRate`
- `avgTripValue`
- `avgProfitPerTrip`
- `revenueByDay`
- `revenueByMonth`
- `statusDistribution`
- trend percentages

Drivers:

- existing count/money fields
- `completionRate`
- `cancelRate`
- `avgProfitPerCompletedTrip`
- `totalPoints`
- `assignedPointProfit`
- `lastAssignedAt`
- `lastCompletedAt`
- per-driver trip history endpoint for reconciliation by latest assignment time

## 6. UI

Modify:

- `app/dashboard/reports/page.tsx`
- `components/reports/kpi-cards.tsx`
- `components/reports/status-pie-chart.tsx`
- `components/reports/revenue-chart.tsx`
- `components/reports/driver-report-tab.tsx`
- `components/reports/report-table.tsx` only if needed for wider columns/mobile cards

Overview layout:

- Money band: revenue, profit, average completed trip.
- Operations band: total, assigned, unassigned, completed, cancelled.
- Quality band: completion rate, cancel rate, period trends.

Driver table:

- Add rate columns.
- Add points, assignment-time driver profit, and profit averages.
- Add latest assignment/completion timestamps.
- Add a "Cuoc" reconciliation action that opens trip history with created date, latest assignment time, points, driver profit, and formula snapshot.
- Mobile card rows include core metrics, assignment-time profit, last assignment, and the history action.

## 7. Compatibility

Existing clients may still expect `revenueByStatus`; keep it during transition if cheap, but new UI should use `statusDistribution`.

Existing docs saying reports use `departureTime` must be updated.

## 8. Verification

Minimum verification:

- `npx tsc --noEmit`
- targeted lint for modified files or full `npm run lint` with pre-existing failures documented
- report calculator tests
- API smoke tests with a trip whose `createdAt` and `departureTime` fall on different dates
- backfill dry-run or count verification
