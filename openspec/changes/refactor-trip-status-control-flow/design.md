# Design

## 1. Helper mới: `getValidNextStatuses`

### File: `lib/trip-status-transitions.ts`
```ts
type TripStatus = "scheduled" | "confirmed" | "running" | "completed" | "cancelled";

export function getValidNextStatuses(
  currentStatus: string,
  hasDriver: boolean
): string[] {
  if (currentStatus === "completed") return [];

  if (currentStatus === "scheduled") {
    const next: string[] = ["cancelled"];
    if (hasDriver) next.push("confirmed");
    return next;
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

## 2. Validate API

### File: `app/api/trips/[id]/route.ts`

Thêm helper trong file hoặc extract sang `lib/trip-status-transitions.ts`:

```ts
type StatusTransitionResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  newDriverId: number | null | undefined
): StatusTransitionResult {
  // completed → bất kỳ: reject
  if (currentStatus === "completed") {
    return { ok: false, message: "Không thể thay đổi trạng thái của cuốc đã hoàn thành." };
  }

  // → confirmed mà không có driver: reject
  if (newStatus === "confirmed" && !newDriverId) {
    return {
      ok: false,
      message: "Phải gán tài xế trước khi chuyển sang trạng thái Đã gán.",
    };
  }

  // cancelled → scheduled (mở lại): OK
  if (currentStatus === "cancelled" && newStatus === "scheduled") {
    return { ok: true };
  }

  // các transition hợp lệ khác theo getValidNextStatuses
  const valid = getValidNextStatuses(currentStatus, !!newDriverId);
  if (!valid.includes(newStatus)) {
    return {
      ok: false,
      message: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}".`,
    };
  }

  return { ok: true };
}
```

Trong handler PUT, sau khi xác định `finalDriverId` (sau khi áp dụng driverId mới hoặc giữ cũ), gọi:
```ts
if (status !== undefined) {
  const check = validateStatusTransition(trip.status, status, finalDriverId);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 });
  }
}
```

## 3. Auto-cascade driverId → status

Trong cùng handler PUT, khi `driverId` thay đổi:

```ts
let finalStatus: string | undefined = status;
if (driverId !== undefined) {
  // driver thay đổi → kiểm tra có cần cascade status không
  if (driverId === null) {
    // Bỏ gán: nếu đang confirmed → về scheduled
    if (trip.status === "confirmed" && finalStatus === undefined) {
      finalStatus = "scheduled";
    }
  } else {
    // Gán mới: nếu đang scheduled → confirmed
    if (trip.status === "scheduled" && finalStatus === undefined) {
      finalStatus = "confirmed";
    }
  }
}
```

## 4. Frontend: cập nhật dropdown trạng thái

### File: `components/schedule-list.tsx`

Thay vòng `nextMap[trip.status]` hiện tại:

```tsx
// BEFORE
{(nextMap[trip.status] || []).slice(0, 6).map((nextStatus) => (
  <button onClick={() => updateStatus(trip.id, nextStatus)}>
    {statusMap.get(nextStatus)?.label || nextStatus}
  </button>
))}

// AFTER
import { getValidNextStatuses } from "@/lib/trip-status-transitions";

const validNext = getValidNextStatuses(trip.status, !!trip.driver);
{validNext.length === 0 ? (
  <span className="text-xs text-slate-400 italic">Trạng thái cuối</span>
) : (
  validNext.map((nextStatus) => (
    <button onClick={() => updateStatus(trip.id, nextStatus)}>
      {statusMap.get(nextStatus)?.label || nextStatus}
    </button>
  ))
)}
```

## 5. Modal gán Zom: cascade status

### File: `components/schedule-list.tsx` (handler `openDriverModal`)

Trong handler gọi API gán Zom (PUT trip):
- Nếu `newDriverId ≠ null` và `currentStatus === "scheduled"` → gửi kèm `status: "confirmed"`.
- Nếu `newDriverId = null` và `currentStatus === "confirmed"` → gửi kèm `status: "scheduled"`.
- Các trường hợp khác → chỉ gửi driverId.

## 6. Xử lý lỗi API 400

Trong tất cả các handler gọi API trip (updateStatus, gán Zom, edit form):
- Nếu response 400 → hiển thị toast với message từ `error`.
- Reload danh sách trips để đồng bộ.

## 7. Backward compatibility

- Dữ liệu cũ có thể có `status = "confirmed"` mà `driverId = null` (do bug cũ).
- Cần **script migration** (hoặc manual fix) để sửa: chuyển các trip đó về `status = "scheduled"`.
- Thêm query để detect:
  ```sql
  SELECT id FROM trips WHERE status IN ('confirmed', 'running') AND driver_id IS NULL;
  ```
- Cho user xem danh sách này và tự xử lý trước khi deploy.
