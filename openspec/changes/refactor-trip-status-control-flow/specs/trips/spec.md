# Capability: trips

## Purpose

Việc thay đổi trạng thái cuốc xe phải được kiểm soát chặt chẽ để đảm bảo tính nhất quán giữa `status` và `driverId`. Không thể có trạng thái "đã gán" khi chưa có tài xế.

## Requirements

### REQ-STATUS-001: Quy tắc chuyển trạng thái hợp lệ

Bảng chuyển trạng thái được phép (chỉ áp dụng cho list view dropdown và API PUT):

| Từ | Sang | Điều kiện |
|----|------|-----------|
| `scheduled` | `cancelled` | Không |
| `scheduled` | `confirmed` | **BẮT BUỘC** có `driverId ≠ null` |
| `confirmed` | `scheduled` | Bỏ gán Zom (driverId = null) → đồng thời chuyển status |
| `confirmed` | `cancelled` | Không — giữ nguyên thông tin Zom trong lịch sử |
| `confirmed` | `completed` | Không |
| `cancelled` | `scheduled` | Mở lại cuốc |
| `cancelled` | `confirmed` | BẮT BUỘC có `driverId ≠ null` |
| `completed` | * | KHÔNG được phép chuyển sang bất kỳ trạng thái nào (trạng thái cuối) |

### REQ-STATUS-002: Validate API

API `PUT /api/trips/[id]` phải:

1. Nếu request body có `status`:
   - Áp dụng bảng REQ-STATUS-001.
   - Nếu vi phạm → trả `400 Bad Request` với message tiếng Việt giải thích.
2. Nếu request body có `driverId`:
   - **Đồng thời** tự động điều chỉnh status theo Rule D (xem REQ-STATUS-003).
3. Kết hợp (1) và (2): nếu body đổi cả status lẫn driverId → validate cả 2, status phải tương thích với driverId cuối cùng sau khi apply.

### REQ-STATUS-003: Auto-cascade khi thay đổi driverId

Khi `driverId` thay đổi trong cùng request PUT:

| Trạng thái cũ | driverId cũ | driverId mới | Trạng thái mới |
|----------------|-------------|--------------|----------------|
| `scheduled` | null | có giá trị | `confirmed` (auto) |
| `scheduled` | có | null | `scheduled` (giữ nguyên) |
| `confirmed` | A | B | `confirmed` (giữ nguyên) |
| `confirmed` | A | null | `scheduled` (auto) |
| `cancelled` | null | có giá trị | KHÔNG auto thay đổi status — phải đổi status riêng qua call khác |

Nếu frontend muốn vừa đổi driver vừa đổi status (vd: từ cancelled → confirmed với Zom mới), phải gọi 2 bước: đổi status trước, đổi driver sau.

### REQ-STATUS-004: Nút gán Zom trên list view

Dropdown trạng thái trên list view (`schedule-list.tsx`) phải:

1. Gọi helper `getValidNextStatuses(currentStatus, hasDriver)` để lấy danh sách trạng thái hợp lệ tiếp theo.
2. CHỈ hiển thị các trạng thái hợp lệ.
3. Nếu không có trạng thái hợp lệ → ẩn dropdown, hiển thị text tĩnh "Trạng thái cuối" hoặc tương tự.

Helper `getValidNextStatuses(currentStatus, hasDriver)`:
```ts
function getValidNextStatuses(currentStatus, hasDriver) {
  if (currentStatus === "completed") return [];
  if (currentStatus === "scheduled") {
    return ["cancelled", hasDriver ? "confirmed" : null].filter(Boolean);
  }
  if (currentStatus === "confirmed") {
    return ["scheduled", "cancelled", "completed"];
  }
  if (currentStatus === "cancelled") {
    return ["scheduled"];
  }
  return [];
}
```

### REQ-STATUS-005: Modal gán Zom

Khi user chọn tài xế trong `openDriverModal` và lưu:

1. Nếu cuốc đang `scheduled` và chưa có Zom → sau khi lưu, status tự động = `confirmed`.
2. Nếu cuốc đang `confirmed` và đổi sang Zom khác → status giữ nguyên `confirmed`.
3. Nếu cuốc đang `confirmed` và bỏ gán (clear driverId) → status tự động = `scheduled`.

Cả 3 trường hợp đều đi qua API (frontend không tự set status local).

### REQ-STATUS-006: Xử lý lỗi UI

Khi API trả `400` do vi phạm rule:

1. Toast báo lỗi với message từ server.
2. KHÔNG thay đổi UI state (giữ nguyên trạng thái cũ).
3. Reload danh sách trips để đảm bảo đồng bộ với server.

## Scenarios

### Scenario 1: scheduled → confirmed không có driver (REJECT)
- **GIVEN** trip #1 có `status = "scheduled"`, `driverId = null`
- **WHEN** frontend gọi API PUT `{ status: "confirmed" }` (không có driverId)
- **THEN** API trả `400 "Phải gán tài xế trước khi chuyển sang Đã gán"`.

### Scenario 2: scheduled → confirmed có driver (OK)
- **GIVEN** trip #1 có `status = "scheduled"`, `driverId = null`
- **WHEN** frontend gọi API PUT `{ status: "confirmed", driverId: 5 }`
- **THEN** trip có `status = "confirmed"`, `driverId = 5`.

### Scenario 3: scheduled → confirmed chỉ bằng cách gán Zom
- **GIVEN** trip #1 có `status = "scheduled"`, `driverId = null`
- **WHEN** user click nút "+ Gán Zom" và chọn Zom 5
- **THEN** trip có `status = "confirmed"`, `driverId = 5` (status tự động cascade).

### Scenario 4: Dropdown ẩn option không hợp lệ
- **GIVEN** trip #1 có `status = "scheduled"`, `driverId = null`
- **WHEN** user mở dropdown trạng thái
- **THEN** dropdown chỉ hiển thị "Đã hủy" (không hiển thị "Đã gán" vì chưa có Zom).

### Scenario 5: completed → bất kỳ (REJECT)
- **GIVEN** trip #1 có `status = "completed"`
- **WHEN** frontend gọi API PUT `{ status: "cancelled" }`
- **THEN** API trả `400 "Không thể thay đổi trạng thái của cuốc đã hoàn thành"`.

### Scenario 6: confirmed → cancelled giữ Zom
- **GIVEN** trip #1 có `status = "confirmed"`, `driverId = 5`
- **WHEN** user chọn "Đã hủy" từ dropdown
- **THEN** trip có `status = "cancelled"`, `driverId = 5` (giữ nguyên Zom để trace).

### Scenario 7: confirmed → scheduled bằng cách bỏ gán Zom
- **GIVEN** trip #1 có `status = "confirmed"`, `driverId = 5`
- **WHEN** user clear Zom trong `openDriverModal` và lưu
- **THEN** trip có `status = "scheduled"`, `driverId = null`.

### Scenario 8: cancelled → scheduled (mở lại)
- **GIVEN** trip #1 có `status = "cancelled"`
- **WHEN** user chọn "Chờ gán" từ dropdown
- **THEN** trip có `status = "scheduled"`.
