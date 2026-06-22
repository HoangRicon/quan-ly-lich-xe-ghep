# Quick Create Draft Editor — Mirror Add Page UX

## Why

Khi chỉnh sửa bản nháp ở trang `/dashboard/quick-create`, người dùng chỉ thấy 4 nút ghi chú nhanh cố định (`Cốp trống`, `Khách quen`, `Gọi trước`, `Hẹn lại`). So với trang `/dashboard/schedule/add` (dùng `TripForm`), bản nháp **thiếu hẳn chức năng "Tạo thêm ghi chú"** — tức là tự sinh note từ các trường đã nhập (giờ đi, điểm đón/trả, giá, SĐT, số ghế, loại cuốc, chiều, vị trí đón/trả). Đây là chức năng quan trọng vì:

- Trang add là nguồn copy/paste ghi chú chính của tài xế (note zom), nên nội dung note phải đồng nhất giữa add và quick-create.
- Tài xế thường bắt đầu từ quick-create (AI parse) → sửa → tạo cuốc. Nếu editor thiếu auto-note, họ phải nhập tay hoặc bỏ qua, dẫn đến note zom lúc có lúc không.
- UI/UX hiện tại của editor (chỉ 4 chip + textarea) kém giàu thông tin hơn trang add (có nút `✨ Tạo thêm ghi chú`, `Xoá tất cả ghi chú`, preview auto-note realtime).

## What Changes

- **`components/quick-create/draft-editor-sheet.tsx`** — thêm vào section "Ghi chú" (hiện đang ở dòng ~530-573):
  - Thêm nút `✨ Tạo thêm ghi chú` (gọi `appendGeneratedNote` — append, không ghi đè)
  - Thêm nút `Xoá tất cả ghi chú` (gọi `clearAllNotes`)
  - Thêm preview block hiển thị auto-note realtime (`buildGeneratedNote`) — chỉ hiện khi đủ điều kiện (giờ đi, điểm đón, điểm đến, giá)
  - Giữ nguyên 4 chip quick tag hiện tại (không xóa)
- **`lib/quick-create/auto-note.ts`** (mới) — tách `generateAutoNote` từ `components/trip-form.tsx` thành module độc lập, có thể import từ cả `trip-form.tsx` lẫn `draft-editor-sheet.tsx` (tránh duplicate logic).
  - Ký hiệu export: `generateAutoNote({ departureTime, departure, destination, price, phone, seats, tripType, tripDirection, pickupLocation, dropoffLocation }): string`
  - Behavior: y hệt implementation hiện tại ở `trip-form.tsx` (lines 8-82), chỉ thay đổi kiểu tham số từ positional → options object để dễ đọc.
- **`components/trip-form.tsx`** — refactor nhẹ: thay call inline `generateAutoNote(...)` ở 2 chỗ (line ~439, line ~487) bằng call tới `lib/quick-create/auto-note.ts`. **Không thay đổi hành vi UI**.
- **`lib/quick-create/types.ts`** — bổ sung (nếu chưa có) type `AutoNoteInput` cho options object.
- **`scripts/verify-quick-create-logic.ts`** — thêm test cho `generateAutoNote` (khi dùng options object):
  - Input tối thiểu → note có dạng `0-30p 1k HN - HP 150k 0912345678`
  - Có roundtrip → note có hậu tố `2C`
  - Có `pickupLocation`/`dropoffLocation` → note có 2 dòng phụ `\nVị trí đón: ...\nVị trí trả: ...`
  - Giờ đã qua so với hiện tại → dùng `0-Xp` (không phải `HHhMM`)

## Visual Diff (phần "Ghi chú" trong `draft-editor-sheet`)

Trước:
```
[Ghi chú]
[Xóa ghi chú] (chỉ hiện khi có note)
[textarea - 2 dòng]
[Cốp trống] [Khách quen] [Gọi trước] [Hẹn lại]
```

Sau (match trip-form.tsx ~dòng 920-957):
```
[Ghi chú]   [✨ Tạo thêm ghi chú] [Xoá tất cả ghi chú]
[textarea - 3 dòng]
[Preview block slate-50, font-mono, chỉ hiện khi đủ field]
[Cốp trống] [Khách quen] [Gọi trước] [Hẹn lại]   ← giữ nguyên
```

## Rollback

- Revert 2 file: `components/quick-create/draft-editor-sheet.tsx`, `components/trip-form.tsx`
- Xóa file mới: `lib/quick-create/auto-note.ts`
- Xóa phần test trong `scripts/verify-quick-create-logic.ts`
- Không ảnh hưởng API, schema DB, hay component khác

## Out Of Scope

- Không thêm "Đọc bằng giọng nói" (voice input) cho notes
- Không thêm AI-suggested note (dùng AI parser, không dùng LLM)
- Không thay đổi format note (`0-30p 1k HN - HP 150k 0912345678`) — phải khớp 100% với trang add
- Không thêm cảnh báo khi preview note rỗng (đã ẩn khi thiếu field)
- Không sync note từ `rawText` prompt AI (chỉ sinh khi user bấm nút hoặc đủ field)
