# Capability: trips

## Purpose

The Trip model phải lưu được thời điểm gán tài xế lần cuối (`lastAssignedAt`) để phục vụ báo cáo và đánh giá hiệu quả phân công.

## Requirements

### REQ-TRIP-001: Thêm trường `lastAssignedAt`
- Cột mới trong bảng `trips`: `last_assigned_at TIMESTAMPTZ NULL`.
- Mapping Prisma: `lastAssignedAt DateTime? @db.Timestamptz(6) @map("last_assigned_at")`.
- Index: thêm composite index `(account_id, last_assigned_at)` để query báo cáo nhanh.

### REQ-TRIP-002: Quy tắc cập nhật `lastAssignedAt`
- **Tạo trip mới với `driverId` ≠ null** → `lastAssignedAt = now()`.
- **Tạo trip mới với `driverId` = null** → `lastAssignedAt = null`.
- **Cập nhật trip: `driverId` từ null → có giá trị** → `lastAssignedAt = now()`.
- **Cập nhật trip: `driverId` đổi từ A sang B** → `lastAssignedAt = now()` (gán lại cho người mới).
- **Cập nhật trip: `driverId` từ có → null** → `lastAssignedAt = null`.
- **Cập nhật các trường khác (price, notes, status...) không liên quan đến driverId** → KHÔNG đụng vào `lastAssignedAt`.

### REQ-TRIP-003: Áp dụng cho cả POST và PUT
- File `app/api/trips/route.ts` (POST): xử lý theo REQ-TRIP-002.
- File `app/api/trips/[id]/route.ts` (PUT và PATCH nếu có): xử lý theo REQ-TRIP-002.

### REQ-TRIP-004: Trả về `lastAssignedAt` trong API response
- GET `/api/trips` (list): trả về `lastAssignedAt` cho mỗi trip.
- GET `/api/trips/[id]` (detail): trả về `lastAssignedAt`.

## Scenarios

### Scenario 1: Tạo trip có driver ngay
- **WHEN** POST `/api/trips` với `{ driverId: 5, ... }`
- **THEN** trip mới có `lastAssignedAt = current_timestamp`.

### Scenario 2: Gán driver sau
- **WHEN** trip #100 đang có `driverId = null`, sau đó PUT `{ driverId: 7 }`
- **THEN** trip #100 có `lastAssignedAt = now()`.

### Scenario 3: Đổi tài xế
- **WHEN** trip #200 đang có `driverId = 5, lastAssignedAt = T1`, sau đó PUT `{ driverId: 9 }`
- **THEN** trip #200 có `lastAssignedAt = T2 > T1`.

### Scenario 4: Bỏ gán
- **WHEN** trip #300 đang có `driverId = 5`, sau đó PUT `{ driverId: null }`
- **THEN** trip #300 có `lastAssignedAt = null`.

### Scenario 5: Cập nhật không liên quan
- **WHEN** trip #400 đang có `lastAssignedAt = T1`, PUT chỉ đổi `price`
- **THEN** `lastAssignedAt` vẫn = T1 (không đổi).
