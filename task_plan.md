# Tasks: Quick Create Draft Editor — Mirror Add Page UX

## Tổng quan

Mang 2 nút `✨ Tạo thêm ghi chú` / `Xoá tất cả ghi chú` + preview auto-note realtime từ trang add (`TripForm`) sang bottom sheet sửa bản nháp ở quick-create (`DraftEditorSheet`). Tách `generateAutoNote` thành module độc lập để share giữa 2 form.

---

## Task Groups

Mỗi task implementable trong 5-15 phút. Tổng thời gian ước tính: 30-45 phút.

---

## Phase 1: Extract `generateAutoNote` (no behavior change)

### 1.1 Tạo `lib/quick-create/auto-note.ts`

- [ ] **File mới**: `lib/quick-create/auto-note.ts`
- [ ] Export `interface AutoNoteInput` (mục 4.1 spec.md)
- [ ] Export `function generateAutoNote(input: AutoNoteInput): string` — copy **y nguyên** logic từ `trip-form.tsx` line 8-82, đổi positional → object destructure
- [ ] Helper `formatNumberWithDots` copy inline (giống trip-form line 85-87)
- [ ] JSDoc ngắn cho mỗi export

### 1.2 Refactor `components/trip-form.tsx`

- [ ] **File**: `components/trip-form.tsx`
- [ ] Xóa local function `generateAutoNote` (line 8-82)
- [ ] Xóa local function `formatNumberWithDots` (line 85-87) — không còn dùng local
- [ ] Thêm import: `import { generateAutoNote } from "@/lib/quick-create/auto-note";`
- [ ] Sửa call site 1 (line ~439-450 trong `buildGeneratedNote`): wrap positional args → object
- [ ] Sửa call site 2 (line ~487-498 trong `handleSubmit`): wrap positional args → object
- [ ] **Verify**: cùng input → cùng output string

### 1.3 Verify baseline (sau refactor, trước khi sửa draft-editor-sheet)

- [ ] `npx tsc --noEmit --pretty false` — không lỗi mới
- [ ] Test thủ công: mở trang `/dashboard/schedule/add`, tạo cuốc thử → note auto-generate giống hệt trước refactor

---

## Phase 2: Add tests

### 2.1 Thêm 6 test cases vào `scripts/verify-quick-create-logic.ts`

- [ ] **File**: `scripts/verify-quick-create-logic.ts`
- [ ] Import: `import { generateAutoNote } from "../lib/quick-create/auto-note";`
- [ ] Test case 1: dưới 60 phút, ghép, 1 ghế → `"0-30p 1k HN - HP 150k 0912345678"`
- [ ] Test case 2: 2 chiều → note chứa `" 2C"` ở timePart
- [ ] Test case 3: có vị trí đón/trả → note có 3 dòng (split `\n`)
- [ ] Test case 4: bao xe → note chứa `"bx"`
- [ ] Test case 5: 2 ghế trở lên → note chứa `"2k"`
- [ ] Test case 6: trên 60 phút → note chứa pattern `HHhMM`
- [ ] `npx tsx scripts/verify-quick-create-logic.ts` → in `"quick-create logic checks passed"`

---

## Phase 3: Sửa `draft-editor-sheet.tsx`

### 3.1 Thêm 2 hàm helper trong component

- [ ] **File**: `components/quick-create/draft-editor-sheet.tsx`
- [ ] Thêm `buildGeneratedNote` (mục 4.2 spec.md) — mirror trip-form line 425-451
- [ ] Thêm `appendGeneratedNote` (mục 4.3 spec.md)
- [ ] Thêm `clearAllNotes` (mục 4.4 spec.md)
- [ ] Import `generateAutoNote` từ `@/lib/quick-create/auto-note`

### 3.2 Sửa UI section "Ghi chú" (line 530-573 hiện tại)

- [ ] Header row: thay nút "Xóa ghi chú" đơn lẻ → 2 nút `✨ Tạo thêm ghi chú` + `Xoá tất cả ghi chú`
- [ ] Nút "Tạo thêm ghi chú": className `text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-md font-medium transition-colors`, onClick `appendGeneratedNote`
- [ ] Nút "Xoá tất cả ghi chú": className `text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-md font-medium transition-colors`, onClick `clearAllNotes`
- [ ] Bỏ điều kiện `{form.notes && (...)}` bao nút (luôn hiện cả 2 nút)
- [ ] Textarea: đổi `rows={2}` → `rows={3}`
- [ ] Thêm preview block ngay sau textarea, trước quick tag chips:
  ```tsx
  {form.departureTime && form.departure && form.destination && form.price && (
    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
      <div className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
        {buildGeneratedNote()}
      </div>
    </div>
  )}
  ```
- [ ] **Giữ nguyên** block quick tag chips (4 chips) ở dưới preview

---

## Phase 4: Final verification

### 4.1 Type check

- [ ] `npx tsc --noEmit --pretty false` — không lỗi mới (chỉ lỗi cũ `lib/reports/driver-trip-history.ts(117,85)` đã biết)

### 4.2 Logic check

- [ ] `npx tsx scripts/verify-quick-create-logic.ts` → in `"quick-create logic checks passed"`

### 4.3 Manual test draft-editor-sheet (nếu có thể)

- [ ] Mở `/dashboard/quick-create`
- [ ] Bấm edit một draft card → mở sheet
- [ ] Section "Ghi chú" hiển thị 2 nút + textarea rows=3
- [ ] Điền đủ departure/destination/giờ/giá → preview block xuất hiện với auto-note
- [ ] Sửa bất kỳ field → preview cập nhật realtime
- [ ] Xoá 1 trong 4 field bắt buộc → preview biến mất
- [ ] Bấm "✨ Tạo thêm ghi chú" → textarea được append note
- [ ] Bấm "Xoá tất cả ghi chú" → textarea trống
- [ ] 4 chip quick tag vẫn hoạt động bình thường

---

## Phase 5: Archive

### 5.1 Update progress + findings

- [ ] Ghi vào `findings.md` ngày hôm nay: đã extract `generateAutoNote` ra module riêng, mirror UI auto-note vào draft-editor-sheet
- [ ] Ghi vào `progress.md` (nếu tồn tại) các bước đã hoàn thành

### 5.2 Archive openspec change

- [ ] Theo workflow OpenSpec: dùng `openspec archive` hoặc move folder `quick-create-draft-editor-tweaks` vào `openspec/changes/archive/`
- [ ] G4 Gate: chỉ archive khi tất cả test pass

---

## Acceptance Criteria Mapping

| AC | Test point |
|----|-----------|
| AC-1: byte-for-byte same | Test case 1-6 (Phase 2) |
| AC-2: append nút hoạt động | Manual 4.3 step 7 |
| AC-3: clear nút hoạt động | Manual 4.3 step 8 |
| AC-4: preview realtime | Manual 4.3 step 4-6 |
| AC-5: chips vẫn hoạt động | Manual 4.3 step 9 |
| AC-6: refactor trip-form không vỡ | Baseline 1.3 |
| AC-7: script verify pass | Phase 2 last task + 4.2 |
