# Tasks: Nâng cấp Reports Page — Mobile UX

## Tiến độ

**Đánh dấu DONE khi hoàn thành.**

---

## Task 1: Xóa Duplicate Mobile Filter Panel

**File**: `app/dashboard/reports/page.tsx`
**Dòng mốc**: ~line 2303 (opening) → ~line 2475 (closing panel 1), ~line 2480 → ~line 2652 (panel 2 trùng lặp)

**Chi tiết**: 
- Tìm phần code từ `className="lg:hidden sticky bottom-0 ..."` (mobile filter panel sticky bottom)
- Tìm phần code tiếp theo cũng là filter panel giống hệt (thường ngay sau `</div>` của panel 1)
- Xóa panel trùng lặp, giữ panel sticky bottom
- Đảm bảo filter panel sticky bottom có `pb-[180px]` để không bị BottomNav che

**Done khi**: Chỉ 1 filter panel hiển thị trên mobile

---

## Task 2: Thêm Tab Button "Chi tiết"

**File**: `app/dashboard/reports/page.tsx`
**Dòng mốc**: ~line 935–947 (tab buttons)

**Chi tiết**:
- Thêm import `Users` từ lucide-react (nếu chưa có)
- Thêm button tab bên cạnh "Tổng quan":
  ```tsx
  <button
    onClick={() => setActiveTab("details")}
    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
      activeTab === "details"
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-slate-500 hover:text-slate-700"
    }`}
  >
    <span className="hidden sm:inline">Chi tiết</span>
    <span className="sm:hidden">
      <Users className="w-4 h-4" />
    </span>
  </button>
  ```
- Giữ nguyên tab content (đã tồn tại ở dòng ~1989)

**Done khi**: Click tab "Chi tiết" hiển thị customer summary

---

## Task 3: Tăng Font Size tối thiểu lên 12px

**File**: `app/dashboard/reports/page.tsx`

**Chi tiết**:
Thay các class font quá nhỏ trên toàn bộ file:

| Class hiện tại | Thay bằng |
|----------------|-----------|
| `text-[10px]` | `text-xs` |
| `text-[11px]` | `text-xs` |

**Các khu vực cần check**:
- KPI cards: labels (`text-xs text-slate-500`)
- Charts legend: để `text-[11px]` (chart bars legend, acceptable)
- Top lists: revenue labels, progress bar percentages
- Customer cards: trip counts, dates
- Pagination: page numbers

**Done khi**: Không còn `text-[10px]` trong file

---

## Task 4: Tăng Touch Target cho Buttons

**File**: `app/dashboard/reports/page.tsx`

**Chi tiết**:
- Nút "Chi tiết cuốc" trong customer mobile card (~line 2113):
  - Thay `px-2 py-1` → `px-3 py-2`
- Pagination buttons:
  - Thay `p-2` → `min-w-[36px] min-h-[36px] flex items-center justify-center` (đảm bảo ≥ 36px)
- Export buttons header:
  - Đảm bảo touch target đủ lớn (`px-3 py-2` minimum)

**Done khi**: Tất cả buttons có touch target ≥ 36px

---

## Task 5: Responsive Charts Section

**File**: `app/dashboard/reports/page.tsx`
**Dòng mốc**: ~line 1317 (charts grid)

**Chi tiết**:
- Biến đổi:
  ```tsx
  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
  ```
- Revenue trend chart container: `lg:col-span-2` → `md:col-span-2 lg:col-span-2`
- Profit chart: giữ nguyên

**Done khi**: Charts hiển thị 2 cột trên tablet (768px+)

---

## Task 6: Kiểm tra Bottom Nav Overlap

**File**: `app/dashboard/reports/page.tsx`
**Dòng mốc**: ~line 904 (container), ~line 2303 (filter panel)

**Chi tiết**:
- Container chính: `pb-[180px] lg:pb-0` (đã có, đảm bảo giữ nguyên)
- Filter panel sticky: đảm bảo `mb-[180px]` hoặc container padding bottom đủ lớn
- BottomNav z-index: kiểm tra filter panel có bị che không
- Test trên điện thoại: filter panel có bị BottomNav che phần nội dung?

**Done khi**: Filter panel hiển thị đầy đủ trên mobile, không bị BottomNav che

---

## Verification Checklist

- [ ] AC1: Chỉ 1 filter panel mobile
- [ ] AC2: Tab "Chi tiết" hoạt động
- [ ] AC3: Font ≥ 12px
- [ ] AC4: Touch targets ≥ 36px
- [ ] AC5: Charts responsive tablet
- [ ] AC6: Desktop không break
- [ ] AC7: Business logic nguyên vẹn
