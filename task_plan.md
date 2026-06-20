# Task Plan: Reporting Overhaul

## Muc tieu

Dai tu trang bao cao theo huong 3:

1. Them lich su su kien cuoc xe (`trip_events`) de tinh lan gan tai xe gan nhat dung nghiep vu.
2. Backfill event gan tai xe cho du lieu cu co `driverId`.
3. Doi logic bao cao doanh thu sang `Trip.createdAt`, chi cong cuoc `completed`.
4. Tach reporting layer ra `lib/reports/*`.
5. Cai thien UI tong quan va tai xe voi ty le hoan thanh/huy, diem/cong, lan gan gan nhat.
6. Doi diem/cong Zom sang truc gio gan tai xe (`trip_events.createdAt`) va them lich su cuoc de doi chieu khung tinh diem.

## File mapping

- `prisma/schema.prisma` - them `TripEvent`.
- `prisma/migrations/20260620000001_add_trip_events/migration.sql` - tao bang/index.
- `lib/trip-events.ts` - ghi event gan/doi/bo gan/status.
- `scripts/backfill-trip-events.ts` - backfill idempotent.
- `lib/reports/date-range.ts` - date range theo local day.
- `lib/reports/trip-metrics.ts` - bucket/rate/date key helpers.
- `lib/reports/overview-report.ts` - KPI/chart tong quan.
- `lib/reports/driver-report.ts` - bao cao tai xe.
- `scripts/verify-report-metrics.ts` - test logic thuan.
- `app/api/trips/route.ts` - record event khi tao trip co driver.
- `app/api/trips/[id]/route.ts` - record event khi update driver/status.
- `app/api/reports/stats/route.ts` - dung overview service.
- `app/api/reports/drivers/route.ts` - dung driver service.
- `app/api/reports/routes/route.ts` - loc ky theo `createdAt`.
- `app/api/reports/customers/route.ts` - loc ky theo `createdAt`.
- `app/dashboard/reports/page.tsx` - update data contract/layout.
- `components/reports/kpi-cards.tsx` - group money/operations/quality.
- `components/reports/status-pie-chart.tsx` - count/percent by bucket.
- `components/reports/revenue-chart.tsx` - label theo ngay tao cuoc.
- `components/reports/driver-report-tab.tsx` - cot rate/points/latest assignment.
- `lib/reports/driver-trip-history.ts` - lich su cuoc theo gio gan de doi chieu diem/cong.
- `app/api/reports/drivers/[driverId]/trips/route.ts` - API lich su cuoc tai xe.
- `docs/bao-cao-data-flow.md`, `docs/bao-cao-thuat-toan.md` - cap nhat semantics.

## Phases

### Phase 1: Schema + event history

- [x] 1.1 Add `TripEvent` model and migration.
- [x] 1.2 Generate Prisma client.
- [x] 1.3 Create `lib/trip-events.ts`.
- [x] 1.4 Record events in trip create/update APIs.
- [x] 1.5 Create and run/prepare backfill script.

Acceptance:

- Prisma generate pass.
- Assignment/status event helpers compile.
- Backfill script is idempotent.

### Phase 2: Reporting service

- [x] 2.1 Create date range helper.
- [x] 2.2 Create metric helper and verification script.
- [x] 2.3 Create overview report service.
- [x] 2.4 Create driver report service.
- [x] 2.5 Run focused metric verification.

Acceptance:

- Revenue filters/grouping use `createdAt`.
- Revenue/profit only count `completed`.
- Status distribution uses counts/percent.

### Phase 3: API refactor

- [x] 3.1 Refactor stats API.
- [x] 3.2 Refactor drivers API.
- [x] 3.3 Align routes/customers API date semantics.
- [x] 3.4 Preserve stable response shape where useful.

Acceptance:

- Existing tabs still load.
- New fields available for UI.

### Phase 4: UI upgrade

- [x] 4.1 Update overview KPI groups.
- [x] 4.2 Update revenue chart labels.
- [x] 4.3 Update status chart to count/percent.
- [x] 4.4 Update driver table/mobile cards.
- [x] 4.5 Verify responsive density.

Acceptance:

- Tong quan co nhom tien/van hanh/chat luong.
- Tai xe co ty le hoan thanh, ty le huy, diem/cong, lan gan gan nhat.

### Phase 5: Docs + verification

- [x] 5.1 Update report docs.
- [x] 5.2 Run `npx prisma generate`.
- [x] 5.3 Run `npx tsx scripts/verify-report-metrics.ts`.
- [x] 5.4 Run `npx tsc --noEmit`.
- [x] 5.5 Run `npm run lint` and classify pre-existing failures.
- [x] 5.6 Update `progress.md` with evidence.

### Phase 6: Driver assignment point reconciliation

- [x] 6.1 Add assignment snapshot fields to `TripEvent`.
- [x] 6.2 Store point/profit/formula snapshot when assigning/changing driver.
- [x] 6.3 Use latest assignment snapshot by `tripId + toDriverId` in driver reports.
- [x] 6.4 Filter driver points/profit and trip history by assignment event time, not trip created time.
- [x] 6.5 Add per-driver trip history API and UI reconciliation modal.
- [x] 6.6 Add regression checks for cross-period `createdAt != assignedAt` behavior.

Acceptance:

- Typecheck pass.
- No new report-related lint blockers.
- Verification evidence logged.

## Detailed implementation plan

See `docs/superpowers/plans/2026-06-20-reporting-overhaul.md`.
