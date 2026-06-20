# Progress Log

## Gate Status
- [x] **G1**: Spec đã được user xác nhận (`openspec/changes/refactor-trip-status-control-flow/`)
- [x] **G2**: Plan đã được user xác nhận (`task_plan.md`, `findings.md`)
- [x] **G3**: Implementation đã hoàn tất (6 phases)
- [x] **G4**: Verification
  - [x] TypeScript check: PASS (exit code 0)
  - [x] ESLint: không có lỗi mới do change này gây ra (còn 6 errors pre-existing toàn dự án)

## Quyết định đã chốt với user
1. **Phạm vi validate**: Toàn diện (Frontend + API).
2. **Edit form**: Giữ nguyên (không validate ở UI).
3. **Status khi gán Zom**: Chỉ dùng `confirmed`, bỏ `running`.
4. **Backward compat**: Detect orphan trips qua SQL, hướng dẫn user xử lý.
5. **Out of scope**: Không thêm trường DB, không sửa báo cáo (change khác).

## Sessions

### Session 1 — Spec phase
- Tạo OpenSpec change `refactor-trip-status-control-flow/`
- Viết proposal, spec, design, tasks
- User duyệt → Gate G1 ✓

### Session 2 — Plan phase
- Tạo `task_plan.md`, `findings.md`, `progress.md`
- User duyệt → Gate G2 ✓

### Session 3 — Implementation phase (current)
- **Phase 1** ✓ Tạo `lib/trip-status-transitions.ts` với 3 helper:
  - `getValidNextStatuses(currentStatus, hasDriver)`
  - `validateStatusTransition(currentStatus, newStatus, newDriverId)`
  - `resolveStatusAfterDriverChange(currentStatus, oldDriverId, newDriverId)`
- **Phase 2** ✓ Sửa `app/api/trips/[id]/route.ts` (PUT handler):
  - Fetch trip hiện tại trước khi validate
  - Auto-cascade status khi driverId thay đổi
  - Validate transition → trả 400 nếu không hợp lệ
- **Phase 3** ✓ Sửa `components/schedule-list.tsx`:
  - List view dropdown (dòng ~1467): filter theo `getValidNextStatuses`
  - Card view select (dòng ~1191): filter theo `getValidNextStatuses`, fallback "Trạng thái cuối"
  - Xóa unused `nextMap` import
- **Phase 4** ✓ Modal gán Zom (`assignDriver`):
  - Đã hard-code `status: "confirmed"` khi gán → đúng cascade
  - Edit form gửi `driverId: null` → backend tự cascade về `scheduled`
- **Phase 5** ✓ Tạo SQL cleanup script:
  - `scripts/cleanup-orphan-trips.sql` (4 bước: detect → backup → fix → verify → rollback)
- **Phase 6** ✓ Verification:
  - `npx tsc --noEmit` → exit code 0 (PASS)
  - `npx eslint` → không có lỗi mới do change này (6 errors pre-existing toàn dự án)

## Files changed

### Mới tạo
- `lib/trip-status-transitions.ts` (84 dòng) — helper module
- `openspec/changes/refactor-trip-status-control-flow/scripts/cleanup-orphan-trips.sql` — cleanup script

### Sửa
- `app/api/trips/[id]/route.ts`:
  - Import 2 helper từ trip-status-transitions
  - Thêm logic fetch trip + validate + cascade (khoảng 35 dòng)
- `components/schedule-list.tsx`:
  - Import `getValidNextStatuses`
  - Xóa `nextMap` unused
  - Sửa list view dropdown (filter + fallback)
  - Sửa card view select (filter + fallback)

## Test scenarios đã verify (qua code review)

| Scenario | Code path | Kết quả |
|----------|-----------|---------|
| 1: scheduled→confirmed no driver | `validateStatusTransition` reject | ✓ |
| 2: scheduled→confirmed có driver | cascade auto | ✓ |
| 3: scheduled→confirmed qua modal gán Zom | `assignDriver` gửi status | ✓ |
| 4: Dropdown ẩn option không hợp lệ | `getValidNextStatuses` filter | ✓ |
| 5: completed→bất kỳ | `validateStatusTransition` reject | ✓ |
| 6: confirmed→cancelled giữ Zom | `getValidNextStatuses` cho phép | ✓ |
| 7: confirmed→scheduled qua bỏ gán | cascade auto từ `resolveStatusAfterDriverChange` | ✓ |
| 8: cancelled→scheduled | `getValidNextStatuses` cho phép | ✓ |

## Next steps (sau khi user review)

1. User chạy script `cleanup-orphan-trips.sql` (Phase 5) trên production DB.
2. Manual test toàn flow qua UI:
   - Tạo trip mới → gán Zom → status auto = confirmed
   - Bỏ gán Zom → status auto = scheduled
   - Click dropdown status chỉ thấy option hợp lệ
3. Sau khi ổn định → sang OpenSpec change `fix-revenue-report-accuracy`.
