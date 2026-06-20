# Findings: Reporting Overhaul

## Repo context

- Stack: Next.js App Router, TypeScript, Prisma/PostgreSQL, Tailwind, Recharts.
- Auth/tenant pattern: APIs call `getSession()` then `createTenantPrisma(prisma, user.accountId)`.
- Current reports APIs calculate inside route handlers.
- Existing root planning files were for completed change `refactor-trip-status-control-flow`; this task replaces root plan context with `reporting-overhaul`.

## Current report issues confirmed

- `app/api/reports/stats/route.ts` filters by `departureTime`.
- `app/api/reports/stats/route.ts` groups revenue by `departureTime`.
- `app/api/reports/drivers/route.ts` filters driver trips by `departureTime`.
- `revenueByStatus` sums `price` for all statuses, including scheduled/cancelled, while KPI revenue sums only completed trips.
- Driver tab does not expose completion rate, cancel rate, points, last assignment, or last completion.
- `DriverReportTab` receives `selectedDriver` but does not use it.
- Schema has no event/history table; `updatedAt` cannot be used for last assignment because unrelated edits update it.

## Chosen scope

User chose "Huong 3" after being offered:

1. Minimal logic fix.
2. Balanced reporting correction.
3. Full reporting layer + event history.

Selected: full reporting layer + event history.

## Business decisions

- Financial reporting date = `Trip.createdAt`.
- Revenue/profit only count `status = "completed"`.
- `totalTrips` = all trips created in selected period.
- `completionRate = completedTrips / totalTrips`.
- `cancelRate = cancelledTrips / totalTrips`.
- Status distribution chart uses counts/percent, not revenue.
- "Lan gan tai xe gan nhat" means latest driver assignment/change event, not latest trip and not `updatedAt`.
- Legacy data should be backfilled using `Trip.createdAt` for trips that already have `driverId`.

## Existing worktree notes

At plan creation, unrelated or pre-existing changes existed:

- `components/schedule-list.tsx` modified.
- Deleted old `openspec/changes/fix-revenue-report-accuracy/*`.
- Untracked `openspec/changes/ai-quick-trip-entry/`.
- New spec files for `openspec/changes/reporting-overhaul/`.

Do not revert unrelated changes.

## Verification baseline

Previous `npm run lint` failed repo-wide with many pre-existing issues. For this change, full lint may remain red; implementation should avoid introducing new report/trip-event lint errors and should document remaining pre-existing failures.
