# Progress Log: Reporting Overhaul

## Gate Status

- [x] G0 Session recovery complete: previous root plan was completed status-flow work.
- [x] G1 Spec approved by user: user confirmed reporting-overhaul direction and replied OK.
- [x] G2 Plan created: `docs/superpowers/plans/2026-06-20-reporting-overhaul.md` plus root planning files.
- [ ] G3 UI design confirmed: text-only design accepted at overview level; final UI verification pending.
- [ ] G4 Implementation verified.

## Decisions

- Use OpenSpec mode from `.spec-mode`.
- Use full direction "Huong 3": event history + reporting layer + UI upgrade.
- Do not use visual companion; user requested text-only.
- Add `trip_events` instead of using mutable `updatedAt`.
- Backfill legacy assignment events.
- Use `Trip.createdAt` for reporting period/revenue grouping.
- Use `Trip.createdAt` for company revenue/profit recognition.
- Use latest assignment event time (`trip_events.createdAt`) for driver point/profit reconciliation and trip history.

## Session Entries

### 2026-06-20

- Read `spec-first-superpowers`, OpenSpec workflow, quality gates, brainstorming, planning-with-files, and writing-plans guidance.
- Reviewed current report APIs and schema.
- Created spec artifacts:
  - `docs/superpowers/specs/2026-06-20-reporting-overhaul-design.md`
  - `openspec/changes/reporting-overhaul/proposal.md`
  - `openspec/changes/reporting-overhaul/design.md`
  - `openspec/changes/reporting-overhaul/specs/reports/spec.md`
  - `openspec/changes/reporting-overhaul/specs/trips/spec.md`
  - `openspec/changes/reporting-overhaul/tasks.md`
- User approved spec with "OK".
- Created implementation plan:
  - `docs/superpowers/plans/2026-06-20-reporting-overhaul.md`
- Replaced root planning files for active work:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`
- Started Subagent-Driven execution after user selected recommended option.
- Dispatched worker `Nash` for Phase 1 schema/event/backfill scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260620000001_add_trip_events/migration.sql`
  - `lib/trip-events.ts`
  - `scripts/backfill-trip-events.ts`
- Completed Phase 1 schema/event history:
  - Added `TripEvent` with tenant-safe composite relation to `Trip`.
  - Added idempotent set-based assignment backfill using advisory lock and row locks.
  - Added event helpers for driver assignment/status events.
  - Recorded assignment/status events in trip create/update APIs.
  - Hardened trip create/update so trip/customer/event writes are atomic where relevant.
  - Added `tripEvent` to tenant proxy with `createMany` support.
- Phase 1 review loop passed:
  - Spec compliance reviewer approved trip API event behavior.
  - Code quality reviewer requested fixes for atomicity, tenant safety, stale reads, and partial mutations.
  - Follow-up reviewer approved final POST/PUT transaction behavior with no Critical/Important issues.
- Completed Phase 2 reporting service:
  - Added `lib/reports/date-range.ts` with Asia/Ho_Chi_Minh day boundaries.
  - Added `lib/reports/trip-metrics.ts` for percentage, date key, money conversion, and status bucket helpers.
  - Added `lib/reports/overview-report.ts` using `Trip.createdAt`, completed-only revenue/profit, count-based status distribution, completion/cancel rates, and created-date revenue grouping.
  - Added `lib/reports/driver-report.ts` with driver-only rows, rates, points, averages, ISO last assignment/completion timestamps, badges, stable sort/pagination, and trip-scoped event lookup.
  - Added `scripts/verify-report-metrics.ts` focused checks for date range, createdAt grouping, status buckets, driver badges/timestamps, pagination, and driver role filtering.
- Phase 2 review loop passed:
  - Spec reviewer requested `badge`, ISO timestamp shape, default revenue sort, and driver role filtering.
  - Code quality reviewer requested timezone-safe ranges, scoped assignment events, pagination guard, stable sorting, and semantic notes for `revenueByStatus`.
  - Follow-up reviewers approved final Phase 2 service with no Critical/Important issues.
- Completed Phase 3 reports API refactor:
  - `app/api/reports/stats/route.ts` now delegates to `getOverviewReport` and validates `driverId`.
  - `app/api/reports/drivers/route.ts` now delegates to `getDriverReport`.
  - `app/api/reports/routes/route.ts` now filters trip periods by `createdAt` using timezone-safe report ranges.
  - `app/api/reports/customers/route.ts` now filters nested trips by `createdAt` using timezone-safe report ranges while keeping `departureTime` for last-trip display.
  - Route/customer pagination input now normalizes invalid page/limit values.
- Phase 3 review loop passed:
  - Spec reviewer requested timezone-safe range parsing in routes/customers.
  - Code quality reviewer requested invalid `driverId` handling, route/customer page normalization, and compatibility-safe `revenueByStatus`.
  - Follow-up reviewers approved final Phase 3 API changes with no Critical/Important issues.
- Completed Phase 4 reports UI upgrade:
  - Overview KPI cards now separate money, operations, and quality metrics.
  - Revenue chart labels clarify created-date revenue recognition and completed-only money.
  - Status chart consumes `statusDistribution` and displays count/percent, including `unassigned`.
  - Driver report table includes completion/cancel rates, points, averages, latest assignment, and latest completion.
  - Report filter panel now has searchable driver dropdown; removed stale debounce fetch path.
  - Mobile driver cards reduced density from 4x3 to 3x3 scan-focused rows.
- Phase 4 review loop passed:
  - Initial reviewers found missing driver dropdown, stale debounce, missing last completion column, missing `unassigned` status config, and dense mobile cards.
  - Follow-up reviewer `Raman` approved with no Critical/Important findings after fixes.
- Completed Phase 5 docs and verification:
  - Rewrote `docs/bao-cao-data-flow.md` and `docs/bao-cao-thuat-toan.md` to document `Trip.createdAt` as report axis, completed-only revenue/profit, count-based status distribution, and `trip_events` assignment recency.
  - Removed report-related lint issues introduced by this change from `lib/reports/*`, `scripts/verify-report-metrics.ts`, and reports routes.

## Verification Evidence

- 2026-06-20 Phase 1:
  - `npx prisma generate` exit 0. Prisma Client generated successfully. Environment warning: ignored extra cert at `C:\Users\Admin\AppData\Roaming\9router\mitm\rootCA.crt`.
  - `npx prisma validate` exit 0. Schema valid. Same environment cert warning.
  - `npx tsc --noEmit` exit 0. Same environment cert warning.
- 2026-06-20 Phase 2:
  - `npx tsx scripts/verify-report-metrics.ts` exit 0. Output: `verify-report-metrics: ok`. Same environment cert warning.
  - `npx tsc --noEmit` exit 0. Same environment cert warning.
- 2026-06-20 Phase 3:
  - `npx tsx scripts/verify-report-metrics.ts` exit 0. Output: `verify-report-metrics: ok`. Same environment cert warning.
  - `npx tsc --noEmit` exit 0. Same environment cert warning.
- Baseline lint from earlier session failed repo-wide with pre-existing issues; classify after full implementation.
- 2026-06-20 Phase 4/5:
  - `npx tsx scripts/verify-report-metrics.ts` exit 0. Output: `verify-report-metrics: ok`. Same environment cert warning.
  - `npx tsc --noEmit` exit 0. Same environment cert warning.
  - `npx prisma generate` exit 0. Prisma Client generated successfully. Same environment cert warning.
  - `npm run lint` exit 1 repo-wide with 85 errors and 74 warnings after report-related fixes. Remaining failures are outside the reporting-overhaul files, except existing generic components `components/reports/report-filters.tsx` and `components/reports/report-table.tsx` that were not edited in this phase. No remaining lint errors in `lib/reports/*`, `scripts/verify-report-metrics.ts`, `app/api/reports/routes/route.ts`, `app/api/reports/customers/route.ts`, or `app/dashboard/reports/page.tsx`.

### 2026-06-21

- Continued reporting overhaul with driver assignment point reconciliation.
- Added assignment snapshot fields to `TripEvent`: points, profit, profit rate, formula id, formula name.
- Stored assignment-time snapshot on trip create/update when driver is assigned or changed.
- Added `getDriverTripHistory` and `/api/reports/drivers/[driverId]/trips` for per-driver trip reconciliation.
- Updated driver report UI:
  - Added "Cong theo gan" to desktop table, mobile cards, and Excel export.
  - Added "Cuoc" history action on desktop and mobile.
  - Added loading/error/empty states and retry for the history modal.
- Review finding: driver point/profit reports originally still selected trips by `Trip.createdAt`, so trips created outside the period but assigned inside the period were missing.
- Fix: driver report and trip history now use `trip_events.createdAt` for assignment-period filtering, then load current trips for those assignment events.
- Fix: latest assignment snapshot is keyed by `tripId + toDriverId`, preventing reassigned trips from reusing a previous driver's point/profit snapshot.
- Added regression checks:
  - Cuoc tao ngoai ky nhung gan trong ky is included in driver points/profit.
  - Driver trip history includes the same cross-period assignment.
  - Previous driver's assignment snapshot is not reused after reassignment.

## Verification Evidence - 2026-06-21

- `npx tsx scripts\verify-report-metrics.ts` exit 0. Output: `verify-report-metrics: ok`.
- `npx tsc --noEmit` exit 0.
- `npx prisma generate` exit 0. Prisma Client generated successfully.
- `npm run lint` exit 1 repo-wide with 78 errors and 74 warnings after cleaning modified trip/report files. Remaining reporting-area lint is the pre-existing `components/reports/report-filters.tsx` React set-state-in-effect rule, plus unrelated repo-wide issues.
- Final rerun:
  - `npx prisma generate` exit 0.
  - `npx tsx scripts\verify-report-metrics.ts` exit 0. Output: `verify-report-metrics: ok`.
  - `npx tsc --noEmit` exit 0.
