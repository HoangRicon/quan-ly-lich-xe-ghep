# Findings

## Context dự án
- Tech stack: Next.js (app router), Prisma + PostgreSQL, Tailwind CSS, TypeScript.
- Multi-tenant: mọi query qua `createTenantPrisma(prisma, user.accountId)`.
- Timezone server: **UTC** (theo user xác nhận).
- DB schema đã có `last_assigned_at` cho trip? **CHƯA** (sẽ làm trong change khác).

## Khám phá codebase đã thực hiện

### Files liên quan status
1. `lib/useTripStatuses.ts` — quản lý status qua API + fallback
   - `nextMap` hiện tại: auto-gen từ sortOrder (status nào có sortOrder cao hơn → là "next" của status trước).
   - `fixedOrder`: scheduled=1, confirmed=2, running=3, completed=4, cancelled=5.
   - **Đây là chỗ gây bug**: khi trip đang `scheduled`, dropdown hiện cả `confirmed`, `running`, `completed`, `cancelled`.

2. `components/schedule-list.tsx` — list view chính
   - Dòng ~1467: `{(nextMap[trip.status] || []).slice(0, 6).map(...)}` — render dropdown.
   - Dòng ~2036-2053: edit form có list status đầy đủ để user click (giữ nguyên theo yêu cầu).
   - Có `openDriverModal` — modal chọn Zom. **Cần xem chi tiết handler** để biết gọi API thế nào.

3. `app/api/trips/[id]/route.ts` — handler PUT trip
   - Đã có logic recalculate formula/profit, cascade driver thay đổi (set `pointsEarned`, `profitRate`, `profit` về null khi clear driver).
   - **CHƯA có** validate transition status.
   - **CHƯA có** auto-cascade status khi driverId thay đổi.

### Files chưa cần đụng trong change này
- `lib/trip-status-buckets.ts` — dùng cho báo cáo (change khác).
- `app/api/reports/*` — báo cáo (change khác).
- `components/trip-form.tsx` — tạo trip mới (giữ nguyên).

## Quyết định kỹ thuật

### Q1: Helper đặt ở đâu?
- **Chọn**: `lib/trip-status-transitions.ts` (file mới).
- Lý do: cần share giữa frontend (`schedule-list.tsx`) và backend (`api/trips/[id]/route.ts`). Đặt trong `lib/` để cả hai import được.

### Q2: Status nào được coi là "next" của scheduled?
- **Bảng trong spec**:
  - `scheduled` → `cancelled` (luôn)
  - `scheduled` → `confirmed` (chỉ khi có driver)
  - `scheduled` → `completed` (cho phép từ list view, mặc dù thực tế nên qua bước confirmed)
  - **Lý do giữ `scheduled → completed`**: edge case có thể có trip confirm đường khác (vd: import) chưa qua flow scheduled.
- `running` không dùng trong change này (theo user: chỉ dùng `confirmed`).

### Q3: Khi API reject 400, frontend xử lý thế nào?
- Toast error với message từ server (`error` field trong response).
- KHÔNG revert UI state — chỉ reload danh sách từ server (đảm bảo đồng bộ).

### Q4: Có cần thêm trường DB không?
- **KHÔNG trong change này**. Schema không thay đổi. Logic thời gian gán sẽ thuộc change `fix-revenue-report-accuracy`.

### Q5: Edit form có cần validate không?
- Theo user: giữ nguyên (dropdown đầy đủ).
- Nhưng nếu user chọn status không hợp lệ → API reject → toast error.
- Frontend KHÔNG tự ngăn user chọn, nhưng cũng không có UX thân thiện. **Rủi ro chấp nhận được** vì API là lớp bảo vệ cuối.

## Backward compatibility issues

### Issue 1: Data cũ có trip "orphan"
- Dữ liệu cũ có thể có trip `status = "confirmed"` (hoặc `running`) mà `driverId = null`.
- Nguyên nhân: bug đã tồn tại trước change này.
- Giải pháp:
  - Query SQL detect: `SELECT id FROM trips WHERE status IN ('confirmed','running') AND driver_id IS NULL;`
  - Hướng dẫn user chạy fix script hoặc xử lý thủ công.

### Issue 2: Hard-coded status key
- Hiện tại code có những chỗ check `status === "confirmed"` hoặc `status === "cancelled"` hard-coded (vd: `if (status === "completed" || status === "cancelled")` trong schedule-list).
- Khi thêm helper, cần chú ý không break các đoạn check cũ.

## Câu hỏi còn mở

1. Có cần backfill trường `lastAssignedAt` cho trip cũ không? → Trì hoãn sang change `fix-revenue-report-accuracy`.
2. Modal gán Zom có cho phép clear driverId (bỏ gán) không? → Theo user: có (khi đó status tự về `scheduled`).

## Phụ thuộc với change khác

- `fix-revenue-report-accuracy`: phần thêm trường `lastAssignedAt` / `currentAssignedAt` sẽ dùng helper `getValidNextStatuses` để biết trip có driver hay không. **Có thể dùng lại helper.**
