# SPEC: Quick Create Draft Editor — Mirror Add Page UX

## 1. Overview

Đồng bộ phần "Ghi chú" giữa **Trang thêm cuốc xe** (`/dashboard/schedule/add` — dùng `TripForm`) và **Bottom sheet sửa bản nháp** ở trang tạo nhanh (`/dashboard/quick-create` — dùng `DraftEditorSheet`). Cụ thể: mang sang 2 nút `✨ Tạo thêm ghi chú` / `Xoá tất cả ghi chú` và preview auto-note realtime.

**Phạm vi**: Chỉ thay đổi UX ghi chú. Không thay đổi các trường khác, không thay đổi layout tổng thể, không thay đổi API/DB.

---

## 2. User Stories

### US-1: Auto-generate note từ form fields

**Là** tài xế đang sửa bản nháp trong quick-create,
**Tôi muốn** bấm một nút để hệ thống tự động tạo ra chuỗi ghi chú từ các trường đã nhập (giờ, tuyến, giá, SĐT, số ghế, loại, chiều, vị trí đón/trả),
**Để** copy/paste vào Zom zom mà không phải nhập tay, và nội dung khớp 100% với note từ trang add.

### US-2: Preview auto-note trước khi apply

**Là** tài xế đang nhập liệu,
**Tôi muốn** thấy trước nội dung auto-note ngay dưới textarea (cập nhật realtime khi tôi sửa bất kỳ field nào trong form),
**Để** tôi biết chính xác nội dung sẽ được tạo ra và có thể điều chỉnh trước khi bấm nút.

### US-3: Append note (không overwrite)

**Là** tài xế muốn kết hợp nhiều note,
**Tôi muốn** bấm "Tạo thêm ghi chú" nhiều lần để append (cộng dồn), không phải thay thế,
**Để** có thể tạo ra note tổng hợp nhiều chiều (ví dụ: thêm lần 2 với thời gian khác).

### US-4: Xoá tất cả ghi chú nhanh

**Là** tài xế đang test thử,
**Tôi muốn** một nút xoá nhanh toàn bộ nội dung textarea,
**Để** tôi không phải Ctrl+A → Delete.

---

## 3. Visual Specification

### 3.1 Phần "Ghi chú" trong `DraftEditorSheet` (sau thay đổi)

```
┌──────────────────────────────────────────────────────┐
│  GHI CHÚ                                              │
├──────────────────────────────────────────────────────┤
│  [✨ Tạo thêm ghi chú]  [Xoá tất cả ghi chú]        │  ← Header row
│                                                       │
│  ┌──────────────────────────────────────────────────┐│
│  │ Ghi chú zom...                                   ││  ← Textarea (3 rows)
│  │                                                  ││
│  │                                                  ││
│  └──────────────────────────────────────────────────┘│
│                                                       │
│  ┌──────────────────────────────────────────────────┐│  ← Preview (chỉ hiện
│  │ 0-30p 1k HN - HP 150k 0912345678                ││    khi đủ field)
│  │ Vị trí đón: 123 Cầu Giấy                         ││
│  │ Vị trí trả: 456 Lê Chân                          ││
│  └──────────────────────────────────────────────────┘│
│                                                       │
│  [Cốp trống] [Khách quen] [Gọi trước] [Hẹn lại]    │  ← Quick tag chips (giữ nguyên)
└──────────────────────────────────────────────────────┘
```

### 3.2 So sánh với `TripForm` (trang add) — line 920-957

Đây là reference để implement: **bố cục 1:1** với trang add, chỉ khác wrapper className (vì `TripForm` dùng `bg-white rounded-xl shadow-sm border border-slate-200 p-4`, còn `DraftEditorSheet` dùng section `space-y-2`).

| Element | `TripForm` | `DraftEditorSheet` (sau thay đổi) |
|---------|-----------|----------------------------------|
| Section header | `Ghi chú` (label text-sm font-medium) | `GHI CHÚ` (h3 text-xs uppercase tracking-wide) |
| Button "Tạo thêm ghi chú" | `text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-md` | **Cùng style** |
| Button "Xoá tất cả ghi chú" | `text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-md` | **Cùng style** |
| Textarea | `rows={3}` | `rows={3}` (đổi từ 2 → 3) |
| Preview block | `mt-2 p-3 bg-slate-50 rounded-lg` chứa `text-sm font-mono text-slate-700 whitespace-pre-wrap` | **Cùng style** |
| Quick tag chips | **Không có** | 4 chips hiện tại (giữ nguyên) |

### 3.3 Điều kiện hiển thị Preview

Preview chỉ hiển thị khi **đồng thời** có:
- `form.departureTime` (truthy)
- `form.departure` (truthy)
- `form.destination` (truthy)
- `form.price` (truthy, sau khi parse thành number > 0)

Nếu thiếu 1 trong 4 → không hiển thị preview (giống TripForm line 950).

---

## 4. Functional Specification

### 4.1 Hàm `generateAutoNote` (tách ra `lib/quick-create/auto-note.ts`)

**Signature**:
```typescript
export interface AutoNoteInput {
  departureTime: string;        // "HH:mm"
  departure: string;             // "Hà Nội"
  destination: string;           // "Hải Phòng"
  price: string | number;        // "150.000" hoặc 150000
  phone: string;                 // "0912345678"
  seats: number;                 // 1, 2, 3, ...
  tripType: "ghep" | "bao";      // loại bỏ _roundtrip
  tripDirection?: "oneway" | "roundtrip";
  pickupLocation?: string;
  dropoffLocation?: string;
}

export function generateAutoNote(input: AutoNoteInput): string;
```

**Logic** (mirror y hệt từ `trip-form.tsx` lines 8-82):

1. Tính `diffMinutes = (hours*60 + minutes) - (currentHours*60 + currentMinutes)`.
2. Nếu `diffMinutes === 0` → giữ 0. Nếu `diffMinutes < 0` → cộng 24*60 (cho ngày mai).
3. `displayMinutes = max(1, diffMinutes)`.
4. Xác định `seatType`:
   - `bao` → `"bx"`
   - `seats === 1` → `"1k"`
   - `seats >= 2` → `"2k"`
   - default → `"1k"`
5. `directionSuffix = tripDirection === "roundtrip" ? " 2C" : ""`.
6. `priceDisplay = priceNum >= 1000 ? "${round(priceNum/1000)}k" : priceNum.toString()`.
7. `timePart`:
   - `diffMinutes <= 60` → `"0-${displayMinutes}p ${seatType}"`
   - else → `"${HH}h${MM} ${seatType}"`
8. `baseNote = "${timePart}${directionSuffix} ${departure} - ${destination} ${priceDisplay} ${phone}".trim()`.
9. Nếu `pickupLocation` truthy → append `\nVị trí đón: ${pickupLocation}`.
10. Nếu `dropoffLocation` truthy → append `\nVị trí trả: ${dropoffLocation}`.
11. Return `baseNote + pickupLine + dropoffLine`.

**Test cases** (bổ sung vào `scripts/verify-quick-create-logic.ts`):

```typescript
// Case 1: Đầy đủ thông tin, dưới 60 phút
generateAutoNote({
  departureTime: "08:30", departure: "HN", destination: "HP",
  price: "150000", phone: "0912345678", seats: 1,
  tripType: "ghep", tripDirection: "oneway",
}) === "0-30p 1k HN - HP 150k 0912345678"

// Case 2: 2 chiều
generateAutoNote({
  ...input, tripType: "ghep", tripDirection: "roundtrip",
}) chứa "2C" ở cuối timePart

// Case 3: Có vị trí đón/trả → 3 dòng
generateAutoNote({
  ...input, pickupLocation: "123 CG", dropoffLocation: "456 LC",
}).split("\n").length === 3

// Case 4: Bao xe → seatType = "bx"
generateAutoNote({ ...input, tripType: "bao" }).includes("bx")

// Case 5: 2 ghế trở lên → seatType = "2k"
generateAutoNote({ ...input, seats: 3 }).includes("2k")

// Case 6: Trên 60 phút → format HHhMM
generateAutoNote({ ...input, departureTime: "14:30" }).includes("14h30")
```

### 4.2 Hàm `buildGeneratedNote` trong `DraftEditorSheet`

**Logic** (mirror `trip-form.tsx` line 425-451):

```typescript
const buildGeneratedNote = () => {
  // Xác định giờ thực tế: nếu giờ đã qua trong ngày, dùng giờ hiện tại
  const now = new Date();
  const [hours, minutes] = form.departureTime.split(":").map(Number);
  const [year, month, day] = form.departureDate.split("-").map(Number);
  const tripDate = new Date(year, month - 1, day, hours, minutes);
  const nowWithBuffer = new Date(now.getTime() + 60 * 1000);
  const actualTime = tripDate < nowWithBuffer
    ? now.toTimeString().slice(0, 5)
    : form.departureTime;
  const direction = form.tripType.includes("roundtrip") ? "roundtrip" : "oneway";
  const rawType = form.tripType.replace("_roundtrip", "") as "ghep" | "bao";

  return generateAutoNote({
    departureTime: actualTime,
    departure: form.departure,
    destination: form.destination,
    price: form.price,
    phone: form.customerPhone,
    seats: parseInt(form.totalSeats) || 1,
    tripType: rawType,
    tripDirection: direction,
    pickupLocation: form.pickupLocation,
    dropoffLocation: form.dropoffLocation,
  });
};
```

**Lưu ý**: 
- `form` ở đây là local state trong `DraftEditorSheet` (đã có sẵn từ line 103).
- `customerPhone` thay vì `customerPhone || ""` (để khớp behavior trip-form line 492).

### 4.3 Hàm `appendGeneratedNote` (mới trong `DraftEditorSheet`)

**Logic** (mirror `trip-form.tsx` line 453-460):

```typescript
const appendGeneratedNote = () => {
  const generatedNote = buildGeneratedNote();
  setForm((current) => {
    const existing = current.notes.trim();
    const combined = existing ? `${existing} ${generatedNote}` : generatedNote;
    return { ...current, notes: combined };
  });
};
```

### 4.4 Hàm `clearAllNotes` (mới trong `DraftEditorSheet`)

**Logic** (mirror `trip-form.tsx` line 462-464):

```typescript
const clearAllNotes = () => {
  setForm((current) => ({ ...current, notes: "" }));
};
```

---

## 5. UI Changes in `draft-editor-sheet.tsx`

### 5.1 Textarea rows: 2 → 3

**Lý do**: Match với `TripForm` (`rows={3}`) cho preview note có thể hiển thị gọn.

### 5.2 Section header

Hiện tại (line 530-533):
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Ghi chú
    </h3>
    {form.notes && (
      <button onClick={...} className="...">
        <Trash2 className="h-3 w-3" />
        Xóa ghi chú
      </button>
    )}
  </div>
```

Sau thay đổi:
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Ghi chú
    </h3>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={appendGeneratedNote}
        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-md font-medium transition-colors"
      >
        ✨ Tạo thêm ghi chú
      </button>
      <button
        type="button"
        onClick={clearAllNotes}
        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-md font-medium transition-colors"
      >
        Xoá tất cả ghi chú
      </button>
    </div>
  </div>
  <textarea ... rows={3} ... />
  {/* Preview block - chỉ hiện khi đủ field */}
  {form.departureTime && form.departure && form.destination && form.price && (
    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
      <div className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
        {buildGeneratedNote()}
      </div>
    </div>
  )}
  {/* Quick tag chips - giữ nguyên */}
  <div className="flex flex-wrap gap-1.5">
    {["Cốp trống", "Khách quen", "Gọi trước", "Hẹn lại"].map((note) => (
      ...existing...
    ))}
  </div>
</div>
```

### 5.3 Giữ nguyên quick tag chips

4 chips `Cốp trống`, `Khách quen`, `Gọi trước`, `Hẹn lại` vẫn còn — chỉ chuyển vị trí xuống dưới preview block.

---

## 6. Refactor `trip-form.tsx` (low risk)

### 6.1 Thay thế function `generateAutoNote` local

**Hiện tại** (`trip-form.tsx` line 8-82): local function trong cùng file.

**Sau refactor**: 
- Xóa function local.
- Import từ `lib/quick-create/auto-note`:
  ```typescript
  import { generateAutoNote, type AutoNoteInput } from "@/lib/quick-create/auto-note";
  ```
- Tại 2 call site (line ~439, line ~487): wrap tham số thành object:
  ```typescript
  // Trước:
  generateAutoNote(actualTime, formData.departure, formData.destination, ..., direction, ...)
  // Sau:
  generateAutoNote({
    departureTime: actualTime,
    departure: formData.departure,
    destination: formData.destination,
    price: formData.price,
    phone: formData.customerPhone || "",
    seats: parseInt(formData.totalSeats) || 1,
    tripType: rawType,
    tripDirection: direction,
    pickupLocation: formData.pickupLocation,
    dropoffLocation: formData.dropoffLocation,
  })
  ```

**Kiểm tra**: 
- Trip-form phải pass `npx tsc --noEmit` không lỗi mới
- Không thay đổi behavior: gọi cùng input → cùng output string

---

## 7. Acceptance Criteria

### AC-1: Auto-note generation đồng nhất với trang add
- [ ] `generateAutoNote` từ `lib/quick-create/auto-note.ts` cho ra **chuỗi giống byte-for-byte** với `generateAutoNote` cũ trong `trip-form.tsx` khi cùng input
- [ ] 6 test cases trong mục 4.1 pass

### AC-2: UI nút "Tạo thêm ghi chú" hoạt động
- [ ] Hiển thị nút `✨ Tạo thêm ghi chú` ở header row phần Ghi chú
- [ ] Bấm nút → append auto-note vào textarea (nếu đã có note → cách nhau bằng space, nếu rỗng → set luôn)
- [ ] Bấm nhiều lần → note cộng dồn, không bị replace
- [ ] Bấm khi thiếu field → vẫn tạo note (giống trip-form — không block)

### AC-3: UI nút "Xoá tất cả ghi chú" hoạt động
- [ ] Hiển thị nút `Xoá tất cả ghi chú` ở header row (cùng hàng với nút tạo)
- [ ] Bấm nút → textarea trống hoàn toàn

### AC-4: Preview auto-note realtime
- [ ] Khi `departureTime && departure && destination && price` đều có giá trị → hiển thị preview block dưới textarea
- [ ] Preview update realtime khi sửa bất kỳ field nào (departure, destination, price, pickupLocation, dropoffLocation, customerPhone, totalSeats, tripType)
- [ ] Preview ẩn khi bất kỳ field nào trong 4 field bắt buộc bị xoá
- [ ] Preview dùng style: `mt-2 p-3 bg-slate-50 rounded-lg` + `text-sm font-mono text-slate-700 whitespace-pre-wrap`

### AC-5: Quick tag chips vẫn hoạt động
- [ ] 4 chips `Cốp trống`, `Khách quen`, `Gọi trước`, `Hẹn lại` vẫn còn
- [ ] Bấm chip khi rỗng → set note = chip
- [ ] Bấm chip khi có note → append `" • ${chip}"`

### AC-6: Refactor trip-form.tsx không phá vỡ
- [ ] `npx tsc --noEmit` không lỗi
- [ ] Mở trang `/dashboard/schedule/add` → tạo cuốc thử → note auto-generate giống hệt trước refactor
- [ ] Mở trang edit (`/dashboard/schedule/add?edit=N`) → load + save → note giữ nguyên

### AC-7: Script verify pass
- [ ] `npx tsx scripts/verify-quick-create-logic.ts` in ra `quick-create logic checks passed`
- [ ] 6 test cases mới (mục 4.1) pass

---

## 8. File Structure

### File mới
- `lib/quick-create/auto-note.ts` (~100 dòng): function + types
- `openspec/changes/quick-create-draft-editor-tweaks/specs/quick-create-draft-editor/spec.md` (file này)
- `openspec/changes/quick-create-draft-editor-tweaks/proposal.md`

### File sửa
- `components/quick-create/draft-editor-sheet.tsx` (UI: +30 dòng, refactor: -10 dòng)
- `components/trip-form.tsx` (refactor: -75 dòng local function, +1 import, +12 dòng wrap object ở 2 call site)
- `scripts/verify-quick-create-logic.ts` (+50 dòng test cases)
- `lib/quick-create/types.ts` (nếu cần thêm `AutoNoteInput`)

---

## 9. Dependencies

Không thêm dependency. Chỉ dùng:
- TypeScript types có sẵn
- `lib/quick-create/draft-helpers.ts` (đã có `buildIsoDateTimeFromLocalParts`)
- `formatNumberWithDots` từ `lib/quick-create/formatters` (đã có)

---

## 10. Out of Scope

- Không thêm voice input cho ghi chú
- Không dùng LLM để suggest note
- Không thay đổi format note (phải khớp 100% byte-for-byte với trip-form)
- Không thêm analytics / tracking
- Không tạo API mới
- Không thay đổi schema DB
