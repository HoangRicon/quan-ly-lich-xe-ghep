# Tasks

## 1. Helper module
- [ ] 1.1 Tạo file `lib/trip-status-transitions.ts` với helper `getValidNextStatuses(currentStatus, hasDriver)`
- [ ] 1.2 Thêm helper `validateStatusTransition(currentStatus, newStatus, newDriverId)` trả về `{ ok, message }`
- [ ] 1.3 Unit test các case:
  - [ ] scheduled + no driver → [cancelled]
  - [ ] scheduled + has driver → [cancelled, confirmed]
  - [ ] confirmed → [scheduled, cancelled, completed]
  - [ ] cancelled → [scheduled]
  - [ ] completed → []

## 2. Backend API validate
- [ ] 2.1 Sửa `app/api/trips/[id]/route.ts` (PUT handler):
  - [ ] 2.1a Import helper `validateStatusTransition`
  - [ ] 2.1b Xác định `finalDriverId` sau khi áp dụng driverId mới (giữ nguyên nếu undefined)
  - [ ] 2.1c Auto-cascade status khi driverId thay đổi (theo REQ-STATUS-003)
  - [ ] 2.1d Validate status transition trước khi updateData
  - [ ] 2.1e Trả 400 với message tiếng Việt nếu không hợp lệ

## 3. Frontend list view
- [ ] 3.1 Sửa `components/schedule-list.tsx`:
  - [ ] 3.1a Import `getValidNextStatuses` từ `lib/trip-status-transitions`
  - [ ] 3.1b Thay vòng `nextMap[trip.status]` bằng `getValidNextStatuses(trip.status, !!trip.driver)` (dòng ~1467)
  - [ ] 3.1c Thêm fallback UI khi `validNext.length === 0` (text "Trạng thái cuối")

## 4. Frontend modal gán Zom
- [ ] 4.1 Sửa handler gọi API trong `openDriverModal`:
  - [ ] 4.1a Khi set driverId (không null) từ status scheduled → gửi kèm `status: "confirmed"`
  - [ ] 4.1b Khi clear driverId từ status confirmed → gửi kèm `status: "scheduled"`
- [ ] 4.2 Trong `updateStatus` (gọi API PUT):
  - [ ] 4.2a Bắt response 400 → hiển thị toast error với message
  - [ ] 4.2b Reload trips sau khi API fail

## 5. Data migration / cleanup
- [ ] 5.1 Viết SQL query detect trip có status confirmed/running nhưng driverId = null:
  ```sql
  SELECT id, account_id, status, departure_time, driver_id
  FROM trips
  WHERE status IN ('confirmed', 'running', 'in_progress')
    AND driver_id IS NULL;
  ```
- [ ] 5.2 Thêm script hoặc hướng dẫn cho user xử lý các trip này (chuyển về scheduled hoặc xóa)
- [ ] 5.3 Document trong proposal.md phần "Backward compatibility"

## 6. Verification
- [ ] 6.1 Manual test các Scenario 1-8 trong spec/trips/spec.md
- [ ] 6.2 Verify API trả 400 đúng message khi vi phạm (dùng curl/Postman)
- [ ] 6.3 TypeScript check `npx tsc --noEmit` không lỗi
- [ ] 6.4 Lint check `npx next lint` không lỗi mới
- [ ] 6.5 Verify cascade status khi gán Zom qua UI
- [ ] 6.6 Verify dropdown ẩn option không hợp lệ
- [ ] 6.7 Verify response 400 từ API không crash UI
