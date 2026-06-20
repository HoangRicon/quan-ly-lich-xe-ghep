# Design

## 1. Database migration

### File: `prisma/migrations/20260620_add_last_assigned_at/migration.sql`
```sql
ALTER TABLE trips ADD COLUMN last_assigned_at TIMESTAMPTZ NULL;
CREATE INDEX idx_trips_account_last_assigned ON trips(account_id, last_assigned_at);
```

### Prisma schema update
```prisma
model Trip {
  // ... existing fields
  lastAssignedAt DateTime? @map("last_assigned_at") @db.Timestamptz(6)
  // ...
  @@index([accountId, lastAssignedAt], map: "idx_trips_account_last_assigned")
}
```

## 2. API changes

### `app/api/trips/route.ts` (POST)
- Thêm helper `resolveAssignedAt(currentDriverId, newDriverId, currentLastAssignedAt)`:
  - newDriverId null + current null → return null
  - newDriverId null + current có → return null
  - newDriverId có + current null → return new Date()
  - newDriverId có + current có, cùng id → return currentLastAssignedAt (giữ nguyên)
  - newDriverId có + current có, khác id → return new Date()

### `app/api/trips/[id]/route.ts` (PUT)
- Fetch trip hiện tại trước (chỉ cần `driverId`, `lastAssignedAt`).
- Áp dụng helper `resolveAssignedAt` với driverId cũ + mới.
- Set `lastAssignedAt` trong updateData.

### `app/api/reports/stats/route.ts` (GET)
- Helper `parseHourParams`: parse `startHour`, `endHour` từ query string (0-23).
- Build date range từ startDate/endDate **theo timezone ICT**:
  ```ts
  function getIctRange(startDate, endDate) {
    // Convert YYYY-MM-DD (ICT) sang UTC để query Postgres
    const startUtc = startDate ? new Date(`${startDate}T00:00:00+07:00`) : undefined;
    const endUtc   = endDate   ? new Date(`${endDate}T23:59:59.999+07:00`) : undefined;
    return { gte: startUtc, lte: endUtc };
  }
  ```
- Build where clause cho `lastAssignedAt` thay vì `departureTime`:
  - `lastAssignedAt: { not: null, gte, lte }` (nếu có date range)
  - Nếu có hour filter: lọc thêm trong JS sau khi fetch (vì giờ tính theo ICT phải convert từ UTC).
- Group revenue theo ngày ICT:
  ```ts
  const dateStr = ictDateKey(trip.lastAssignedAt);
  ```
- Sửa `avgTripValue` / `avgProfitPerTrip`: dùng `totalTrips` thay vì `completedTrips`.
- Sửa `revenueByStatus`: chỉ cộng `price` của completed trips.
- Kỳ trước: cùng logic, dùng `lastAssignedAt`.

### `app/api/reports/drivers/route.ts` (GET)
- Cùng logic date/hour filter như stats.
- Group revenue theo `lastAssignedAt`.

### Endpoint mới: `app/api/reports/drivers/[id]/trips/route.ts`
- Trả về danh sách trip chi tiết của 1 driver trong kỳ.
- Response shape:
  ```ts
  {
    success: true,
    data: [{
      id, title, departure, destination, departureTime,
      lastAssignedAt, price, profit, status, tripType
    }],
    pagination: { page, limit, total, totalPages },
    summary: { totalTrips, completedTrips, totalRevenue, totalProfit }
  }
  ```

## 3. Frontend changes

### `app/dashboard/reports/page.tsx`
- Thêm state `startHour`, `endHour` (string).
- Truyền params `startHour`, `endHour` vào `fetchStats`.
- Truyền `selectedDriver` xuống `OverviewTab` và áp dụng vào params.
- Bộ lọc panel: thêm 2 ô input time "Từ giờ" / "Đến giờ".

### `components/reports/driver-report-tab.tsx`
- Thêm state `drillDriverId`, `drillOpen`.
- Click "Xem chi tiết" → mở drawer.
- Drawer gọi `/api/reports/drivers/[id]/trips?...` và render bảng + phân trang.
- Bộ lọc giờ áp dụng cho cả bảng tổng hợp.

### Drawer UI
- Dùng component `Sheet` (đã có trong codebase?) hoặc tự build bằng Tailwind.
- Backdrop mờ + slide từ phải.
- Hiển thị tóm tắt + bảng + pagination.

## 4. Documentation updates
- `docs/bao-cao-thuat-toan.md`: cập nhật công thức TB, doanh thu theo ngày gán, hour filter.
- `docs/bao-cao-data-flow.md`: cập nhật SQL mẫu cho `last_assigned_at` + hour filter.

## 5. Testing strategy
- Unit test: helper `resolveAssignedAt` (5 case theo Scenario 1-5).
- Integration test: tạo trip, gán lại, verify `lastAssignedAt` đúng.
- API test: gọi `/api/reports/stats?startDate=&endDate=&startHour=&endHour=`, verify response.
- Manual UI test: mở `/dashboard/reports`, chọn filter, verify số liệu khớp DB.
