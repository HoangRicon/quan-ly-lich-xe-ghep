# Refactor Trip Status Control Flow

## Why

Hiện tại, trên trang Schedule List, người dùng có thể chuyển trạng thái cuốc từ `scheduled` → `confirmed` (đã gán) bằng cách click dropdown trạng thái **mà không cần gán tài xế**. Điều này dẫn đến:

1. Cuốc có `status = "confirmed"` nhưng `driverId = null` → dữ liệu không nhất quán.
2. Báo cáo doanh thu không đáng tin cậy vì trạng thái "đã gán" có thể tồn tại khi chưa có tài xế.
3. Lỗi nghiệp vụ: người dùng click nhầm → trạng thái lệch → khó debug.

Mục tiêu: **Tách bạch 2 thao tác** — đổi trạng thái và gán tài xế. Chỉ có thể chuyển sang "đã gán" thông qua nút gán Zom.

## What Changes

### 1. Logic frontend (`components/schedule-list.tsx`)
- Thêm helper `getValidNextStatuses(currentStatus, hasDriver)` thay thế `nextMap` mặc định.
- Quy tắc chuyển trạng thái hợp lệ (chỉ trên list view dropdown):
  - Từ `scheduled`: → `cancelled`, → `completed` (CHỈ khi đã gán Zom, dù user nhìn từ mọi góc đều nên dùng flow chính)
  - Từ `confirmed`: → `scheduled` (bỏ gán), → `cancelled` (hủy giữ Zom), → `completed`
  - Từ `cancelled`: → `scheduled` (mở lại)
  - Từ `completed`: KHÔNG chuyển được đi đâu (trạng thái cuối)
- Dropdown chỉ hiển thị các trạng thái hợp lệ. Nếu không có trạng thái hợp lệ nào → ẩn dropdown, hiển thị text tĩnh.

### 2. Validate API (`app/api/trips/[id]/route.ts`)
- Thêm helper `validateStatusTransition(currentTrip, newStatus, newDriverId)`:
  - **Rule A**: Nếu `newStatus = "confirmed"` mà `newDriverId = null` → trả 400 "Phải gán tài xế trước khi chuyển sang Đã gán".
  - **Rule B**: Nếu `currentTrip.status = "completed"` → reject mọi thay đổi status.
  - **Rule C**: Nếu `currentTrip.status = "cancelled"` và `newStatus = "scheduled"` → cho phép (mở lại).
  - **Rule D**: Các transition khác → theo helper frontend (nhất quán).

### 3. Nút gán Zom (giữ nguyên, thêm logic)
- Trong `openDriverModal` (chọn tài xế từ combobox): sau khi chọn Zom và lưu:
  - Tự động set `status = "confirmed"` (nếu đang là `scheduled`).
  - Set `currentAssignedAt = now()` (trường mới).
- Nếu user bỏ gán (clear driverId):
  - Tự động set `status = "scheduled"` (chỉ khi đang là `confirmed`).
  - Set `currentAssignedAt = null`.

### 4. Schema (Prisma + migration)
- **Bỏ qua phần schema trong change này** — phần `lastAssignedAt` / `currentAssignedAt` sẽ thuộc change `fix-revenue-report-accuracy` để tách bạch phạm vi.
- Trong change này CHỈ validate logic status, chưa lưu trường thời gian.

## Rollback

- Xóa helper `getValidNextStatuses`, revert dropdown `nextMap` cũ.
- Xóa validate trong API PUT trip.
- Khôi phục hành vi cũ (có thể chuyển `scheduled → confirmed` mà không cần Zom).

## Out of Scope

- Không thêm cột `lastAssignedAt` / `currentAssignedAt` vào DB (sẽ làm trong change khác).
- Không thay đổi logic tính profit / formula.
- Không sửa trang báo cáo (sẽ làm trong change `fix-revenue-report-accuracy`).
- Không sửa edit form (giữ nguyên dropdown trạng thái đầy đủ).
- Không validate thêm cho trip status `running` (theo quyết định: chỉ dùng `confirmed`).
