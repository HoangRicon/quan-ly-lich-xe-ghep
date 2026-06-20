# Task Plan: Refactor Trip Status Control Flow

## Mục tiêu
Ngăn chặn tình trạng cuốc xe có `status = "confirmed"` nhưng `driverId = null` bằng cách:
1. Validate ở API (reject các transition không hợp lệ).
2. Frontend ẩn các option chuyển trạng thái không khả thi.
3. Auto-cascade status khi gán/bỏ gán Zom.

## Cấu trúc file thay đổi

### Mới tạo
- `lib/trip-status-transitions.ts` — helper module

### Sửa
- `app/api/trips/[id]/route.ts` — validate + cascade status
- `components/schedule-list.tsx` — filter dropdown + cascade trong modal gán Zom

### Tài liệu
- (Không cần cập nhật docs trong change này — đã covered bởi change `fix-revenue-report-accuracy`)

---

## Giai đoạn thực hiện

### Phase 1: Helper module + unit tests (nền tảng)
1. **Tạo `lib/trip-status-transitions.ts`** với 2 helper:
   - `getValidNextStatuses(currentStatus, hasDriver)` — cho frontend
   - `validateStatusTransition(currentStatus, newStatus, newDriverId)` — cho backend
2. **Verify TypeScript compile** — đảm bảo helper không có lỗi type.

**Acceptance**: file tồn tại, compile pass, helper trả đúng cho 5 case test (xem tasks.md 1.3).

### Phase 2: Backend API (validate + cascade)
1. Sửa PUT handler trong `app/api/trips/[id]/route.ts`:
   - Import helper
   - Xác định `finalDriverId` sau khi merge input với DB state
   - Auto-cascade status khi driverId thay đổi
   - Validate transition trước khi commit
2. Manual test qua curl:
   - `PUT { status: "confirmed" }` không có driverId → expect 400
   - `PUT { status: "confirmed", driverId: 5 }` từ scheduled → expect 200, status="confirmed"
   - `PUT { status: "cancelled" }` từ completed → expect 400

**Acceptance**: API reject đúng case, cascade đúng case.

### Phase 3: Frontend list view dropdown
1. Sửa `components/schedule-list.tsx`:
   - Thay `nextMap[trip.status]` bằng `getValidNextStatuses(trip.status, !!trip.driver)`
   - Render fallback "Trạng thái cuối" khi `validNext.length === 0`
2. Test qua UI:
   - Trip scheduled + không driver → dropdown chỉ có "Đã hủy"
   - Trip scheduled + có driver → dropdown có "Đã hủy", "Đã gán"
   - Trip confirmed → dropdown có "Chờ gán", "Đã hủy", "Hoàn thành"
   - Trip completed → không có dropdown, hiển thị text

**Acceptance**: dropdown filter đúng theo hasDriver.

### Phase 4: Modal gán Zom (cascade)
1. Trong handler gọi API từ `openDriverModal`:
   - Nếu set driverId (không null) từ status scheduled → gửi `status: "confirmed"`
   - Nếu clear driverId từ status confirmed → gửi `status: "scheduled"`
2. Trong handler error 400:
   - Hiển thị toast với message từ server
   - Reload danh sách

**Acceptance**: gán Zom tự động đổi status; bỏ gán Zom tự động về scheduled.

### Phase 5: Cleanup data cũ
1. Viết SQL detect các trip "orphan" (status confirmed/running không có driver)
2. Hướng dẫn user xử lý

**Acceptance**: User biết phải làm gì với data cũ trước khi deploy.

### Phase 6: Verification cuối
1. TypeScript check
2. Lint check
3. Manual test 8 scenarios trong spec
4. Regression test: các flow cũ vẫn hoạt động (tạo trip, gán Zom, đổi trạng thái)

**Acceptance**: All tests pass, không regress.

---

## Test points chính

| Phase | Test point | Cách verify |
|-------|-----------|-------------|
| 1 | Helper trả đúng cho 5 case | Code review + manual test |
| 2 | API reject scheduled→confirmed no driver | curl/Postman |
| 2 | API auto-cascade status khi gán Zom | curl/Postman |
| 3 | Dropdown ẩn option không hợp lệ | UI manual test |
| 4 | Modal gán Zom cascade đúng status | UI manual test |
| 5 | SQL detect orphan trips | psql query |
| 6 | TypeScript + lint + 8 scenarios | automation + manual |

---

## Phụ thuộc giữa các phase

```
Phase 1 (helper)
    ↓
Phase 2 (API) ──→ Phase 3 (Frontend dropdown) ──→ Phase 4 (Modal cascade)
    ↓                                                  ↓
Phase 5 (cleanup) ───────────────────────────────────┘
    ↓
Phase 6 (verify)
```

Phase 2 và Phase 3 có thể làm song song (cùng dùng helper từ Phase 1).

---

## Risk + Mitigation

| Risk | Mitigation |
|------|-----------|
| Helper sai logic → frontend filter sai → UX broken | Phase 1: viết unit test kỹ trước khi dùng |
| API reject quá mạnh → block user hợp lệ | Phase 2: test kỹ các edge case trước khi áp |
| Data cũ có trip orphan → user không biết | Phase 5: query detect + hướng dẫn |
| Edit form (giữ nguyên) cho chọn status tự do | Đã chấp nhận rủi ro — API vẫn validate, frontend hiển thị lỗi |
