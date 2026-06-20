# Reporting Overhaul Design

## Goal

Cai thien toan dien trang bao cao de cac chi so doanh thu, van hanh va tai xe dung nghiep vu ke toan/quan tri: doanh thu cua cuoc hoan thanh duoc ghi theo ngay tao cuoc, bao cao trang thai dung theo so luong/ty le cuoc, va bao cao tai xe co lich su gan tai xe gan nhat thay vi suy doan tu `updatedAt`.

## Scope

Change nay la huong 3: dai tu reporting layer co nen du lieu lich su.

- Them lich su su kien cho cuoc xe: gan tai xe, doi tai xe, bo gan tai xe, doi trang thai, hoan thanh, huy.
- Backfill du lieu cu bang cach tao su kien gan tai xe tu du lieu hien co cho cac cuoc co `driverId`.
- Tach logic tinh bao cao ra khoi API route thanh module `lib/reports/*`.
- Doi truoc ngay bao cao doanh thu tu `departureTime` sang `createdAt`.
- Bao cao doanh thu/lai chi cong cuoc `completed`.
- Doi bieu do trang thai tu doanh thu theo status sang so luong va ty le cuoc theo bucket.
- Nang cap tab tai xe voi ty le hoan thanh, ty le huy, diem/cong, doanh thu binh quan, loi nhuan binh quan, lan gan tai xe gan nhat va lan hoan thanh gan nhat.
- Cai thien UI bao cao thanh cac nhom: tien, van hanh, chat luong.

## Out Of Scope

- Chua xay kho du lieu rieng, materialized view hay job tong hop dinh ky.
- Chua lam audit UI chi tiet tung su kien cuoc xe.
- Chua thay doi logic cong thuc tinh loi nhuan/diem.
- Chua sua toan bo lint cua repo; chi tranh tao loi moi trong pham vi reports/trips.

## Business Rules

### Revenue Recognition

- `totalRevenue` = tong `price` cua cuoc co `status = "completed"` trong ky bao cao.
- `totalProfit` = tong `profit` cua cuoc co `status = "completed"` trong ky bao cao.
- Ky bao cao mac dinh loc theo `Trip.createdAt`, khong theo `departureTime`, `updatedAt`, hay ngay hoan thanh.
- Bieu do doanh thu theo ngay/thang nhom bang `Trip.createdAt`.
- So sanh ky truoc cung dung `Trip.createdAt`.

### Trip Volume And Rates

- `totalTrips` = tong cuoc duoc tao trong ky.
- `completedTrips` = cuoc `completed` trong tap `totalTrips`.
- `cancelledTrips` = cuoc `cancelled` trong tap `totalTrips`.
- `completionRate = completedTrips / totalTrips`.
- `cancelRate = cancelledTrips / totalTrips`.
- Neu mau so bang 0 thi ty le bang 0.

### Status Buckets

Tat ca bao cao trang thai dung chung bucket:

- `completed`: status `completed`.
- `cancelled`: status `cancelled`.
- `assigned`: co tai xe va chua completed/cancelled, gom `confirmed`, `running`, `in_progress`, va `scheduled` co `driverId`.
- `unassigned`: chua co tai xe va chua completed/cancelled.

### Driver Assignment History

- Them bang lich su su kien cuoc xe de luu su kien gan/doi/bo gan tai xe.
- `driverLastAssignedAt` trong bao cao tai xe lay tu thoi diem su kien gan/doi tai xe gan nhat, khong dung `updatedAt`.
- Backfill du lieu cu: voi cuoc co `driverId`, tao su kien gan tai xe tai `Trip.createdAt` neu chua co su kien phu hop.
- Khi tao cuoc moi co `driverId`, ghi su kien gan tai xe tai thoi diem tao.
- Khi PUT doi `driverId` tu null sang id, id A sang id B, hoac id sang null, ghi su kien tuong ung.

## Data Model

Them model moi:

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

  trip    Trip    @relation(fields: [tripId], references: [id], onDelete: Cascade)
  account Account @relation(fields: [accountId], references: [id])

  @@index([accountId, createdAt], map: "idx_trip_events_account_created")
  @@index([accountId, type, createdAt], map: "idx_trip_events_account_type_created")
  @@index([accountId, toDriverId, createdAt], map: "idx_trip_events_account_to_driver_created")
  @@index([tripId], map: "idx_trip_events_trip")
  @@map("trip_events")
}
```

Allowed event types:

- `driver_assigned`
- `driver_changed`
- `driver_unassigned`
- `status_changed`
- `trip_completed`
- `trip_cancelled`

## Architecture

### Reporting Service

Create focused modules under `lib/reports/`:

- `date-range.ts`: parse `startDate`/`endDate` as local day boundaries.
- `trip-metrics.ts`: shared bucket/rate/revenue calculations.
- `overview-report.ts`: summary KPIs and chart data.
- `driver-report.ts`: per-driver aggregation and sorting.
- `format.ts`: helper for API-safe number/date output if needed.

API routes become thin:

- Authenticate user.
- Parse query params.
- Call report service.
- Return JSON.

### Event Recording

Create `lib/trip-events.ts`:

- `recordTripStatusEvent`.
- `recordDriverAssignmentEvent`.
- `backfillTripAssignmentEvents` helper for scripts/migration use.

Trip create/update APIs call these helpers in the same request flow after successful DB updates.

## UI Design

### Overview

Replace the dense 9-card strip with three report bands:

- Money: doanh thu da ghi nhan, loi nhuan, gia tri trung binh cuoc hoan thanh.
- Operations: tong cuoc tao, da gan, chua gan, hoan thanh, huy.
- Quality: ty le hoan thanh, ty le huy, bien dong doanh thu/loi nhuan/cuoc.

Charts:

- Revenue trend: title states "Theo ngay tao cuoc".
- Status distribution: count and percent by bucket, not revenue by status.
- Monthly table: still shows revenue/profit/trips, sourced by `createdAt`.

### Driver Tab

Columns:

- Ten tai xe, SDT.
- Tong cuoc.
- Hoan thanh.
- Da gan/dang xu ly.
- Da huy.
- Ty le hoan thanh.
- Ty le huy.
- Doanh thu.
- Loi nhuan.
- Diem/cong.
- Doanh thu binh quan.
- Loi nhuan binh quan.
- Lan gan gan nhat.
- Lan hoan thanh gan nhat.

Default sort: `totalRevenue desc`, tie-breaker `completedTrips desc`.

## Error Handling

- API returns `400` for invalid date ranges or unsupported sort keys.
- Empty ranges return zero metrics and empty chart/table arrays.
- Event recording failure should fail the write operation if it would make assignment/status audit inconsistent.
- Backfill script must be idempotent and safe to rerun.

## Tests And Verification

- Add tests for pure report calculators where practical.
- Verify API routes with targeted requests for createdAt vs departureTime edge cases.
- Verify backfill does not duplicate events.
- Verify lint/typecheck for modified files.
- Manually verify UI on desktop and mobile widths.

## Rollback

- Revert UI to previous API fields if needed.
- Event table is append-only; rollback can stop reading it without deleting data.
- Backfill script should write enough metadata/event type to identify generated records.
- Prisma migration rollback can drop `trip_events` only before production data depends on it.

## Spec Self-Review

- No unresolved placeholders.
- Scope is bounded to reporting and trip event history.
- Business rules separate what/why from implementation details except where data model is required for auditability.
- Ambiguous date semantics are explicit: financial reporting uses `createdAt`; assignment recency uses event history.
