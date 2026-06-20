# Tasks

## 1. Schema and migration

- [x] 1.1 Add `TripEvent` model and relations to `prisma/schema.prisma`.
- [x] 1.2 Create migration for `trip_events` and indexes.
- [x] 1.3 Generate Prisma client.

## 2. Event recording

- [x] 2.1 Create `lib/trip-events.ts`.
- [x] 2.2 Record assignment events in `POST /api/trips`.
- [x] 2.3 Record assignment/status events in `PUT /api/trips/[id]`.
- [x] 2.4 Add idempotent backfill script for legacy assignment events.

## 3. Reporting service

- [x] 3.1 Create `lib/reports/date-range.ts`.
- [x] 3.2 Create `lib/reports/trip-metrics.ts`.
- [x] 3.3 Create `lib/reports/overview-report.ts`.
- [x] 3.4 Create `lib/reports/driver-report.ts`.
- [x] 3.5 Add focused tests for createdAt revenue and status distribution.

## 4. Reports API

- [x] 4.1 Refactor `app/api/reports/stats/route.ts` to call overview service.
- [x] 4.2 Refactor `app/api/reports/drivers/route.ts` to call driver service.
- [x] 4.3 Align route/customer report date semantics to `createdAt` where they use trip periods.
- [x] 4.4 Preserve backward-compatible fields when cheap, while returning new fields.

## 5. Reports UI

- [x] 5.1 Update overview KPI layout into money, operations, and quality sections.
- [x] 5.2 Update revenue chart labels to state "Theo ngay tao cuoc".
- [x] 5.3 Update status chart to consume count-based `statusDistribution`.
- [x] 5.4 Update driver table and mobile cards with rates, points, averages, and latest assignment.
- [x] 5.5 Improve empty/loading states and labels for accounting clarity.

## 6. Docs and verification

- [x] 6.1 Update report docs that currently mention `departureTime`.
- [x] 6.2 Run typecheck.
- [x] 6.3 Run lint and document pre-existing failures separately from new failures.
- [x] 6.4 Run API smoke tests for `createdAt` vs `departureTime`.
- [x] 6.5 Manually verify desktop/mobile report UI.
