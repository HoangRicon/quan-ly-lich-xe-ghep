# Tasks

## 1. Database schema
- [ ] 1.1 Tạo migration SQL `prisma/migrations/20260620_add_last_assigned_at/migration.sql` (add column + index)
- [ ] 1.2 Cập nhật `prisma/schema.prisma`: thêm `lastAssignedAt DateTime?` + index
- [ ] 1.3 Chạy `npx prisma migrate dev` và `npx prisma generate`
- [ ] 1.4 Verify `lastAssignedAt` xuất hiện trong Prisma Client types

## 2. Backend - Trip API
- [ ] 2.1 Viết helper `resolveAssignedAt` (5 cases theo REQ-TRIP-002) trong `lib/trip-assignment.ts`
- [ ] 2.2 Sửa `app/api/trips/route.ts` (POST): gọi helper khi tạo trip có driverId
- [ ] 2.3 Sửa `app/api/trips/[id]/route.ts` (PUT): fetch trip cũ, áp dụng helper
- [ ] 2.4 Thêm `lastAssignedAt` vào response của GET list và GET detail

## 3. Backend - Reports API
- [ ] 3.1 Helper `parseHourParams` trong `lib/report-time-utils.ts`
- [ ] 3.2 Helper `ictDateKey(date)` trả về "YYYY-MM-DD" theo ICT
- [ ] 3.3 Helper `ictHourOfDay(date)` trả về 0-23 theo ICT
- [ ] 3.4 Sửa `app/api/reports/stats/route.ts`:
  - [ ] 3.4a Chuyển date range sang ICT trước khi query
  - [ ] 3.4b Đổi WHERE từ `departureTime` sang `lastAssignedAt`
  - [ ] 3.4c Group revenue theo `lastAssignedAt` ICT date
  - [ ] 3.4d Sửa `avgTripValue` / `avgProfitPerTrip` chia trên `totalTrips`
  - [ ] 3.4e Sửa `revenueByStatus` chỉ gồm completed trips
  - [ ] 3.4f Sửa kỳ trước dùng `lastAssignedAt`
  - [ ] 3.4g Thêm hour filter (startHour, endHour)
- [ ] 3.5 Sửa `app/api/reports/drivers/route.ts`: cùng logic với stats
- [ ] 3.6 Tạo endpoint mới `app/api/reports/drivers/[id]/trips/route.ts`
- [ ] 3.7 Cập nhật `docs/bao-cao-thuat-toan.md` + `docs/bao-cao-data-flow.md`

## 4. Frontend - Reports page
- [ ] 4.1 Thêm state `startHour`, `endHour` trong `app/dashboard/reports/page.tsx`
- [ ] 4.2 Truyền params mới vào `fetchStats`
- [ ] 4.3 Truyền `selectedDriver` xuống OverviewTab
- [ ] 4.4 Thêm 2 ô input time trong filter panel
- [ ] 4.5 Verify filter giờ hoạt động (kiểm tra cả ca qua đêm)

## 5. Frontend - Driver drill-down
- [ ] 5.1 Thêm state `drillDriverId`, `drillOpen` trong `driver-report-tab.tsx`
- [ ] 5.2 Thêm cột "Hành động" + button "Xem chi tiết"
- [ ] 5.3 Tạo component `DriverDetailDrawer.tsx`:
  - [ ] 5.3a Backdrop + slide-in animation
  - [ ] 5.3b Summary cards (tổng cuốc, hoàn thành, doanh thu, lợi nhuận)
  - [ ] 5.3c Bảng danh sách cuốc với columns theo design
  - [ ] 5.3d Pagination controls
- [ ] 5.4 Apply hour filter cho cả bảng tổng hợp

## 6. Verification
- [ ] 6.1 TypeScript check `npx tsc --noEmit` không lỗi
- [ ] 6.2 Lint check `npx next lint` không lỗi mới
- [ ] 6.3 Manual test case Scenario 1-5 trong spec
- [ ] 6.4 Verify số liệu trên UI khớp với SQL query trực tiếp:
  ```sql
  SELECT SUM(price), SUM(profit), COUNT(*) FROM trips
  WHERE last_assigned_at >= '...' AND last_assigned_at <= '...'
    AND status = 'completed' AND account_id = ?;
  ```
- [ ] 6.5 Verify hour filter qua đêm (startHour=22, endHour=6)
- [ ] 6.6 Verify drill-down drawer đúng driver + đúng kỳ
