# Spec: Nâng cấp Reports Page — Mobile UX

## 1. Overview

**Trang Báo cáo tổng hợp** (`app/dashboard/reports/page.tsx`) phục vụ operator xem KPI doanh thu, lợi nhuận, và khách hàng. Trên mobile, trang có 2 lỗi nghiêm trọng và nhiều vấn đề UX nhỏ. Task này fix toàn bộ mà không thay đổi business logic.

## 2. User Stories

| ID | Story |
|----|-------|
| US1 | **Lái máy** — Tôi mở Báo cáo trên iPhone, thấy 2 bảng lọc trùng lặp → Fix: chỉ 1 bảng lọc sticky ở dưới |
| US2 | **Khách hàng chi tiết** — Tôi muốn xem danh sách khách hàng theo doanh thu, nhấn tab "Chi tiết" → Fix: thêm tab button |
| US3 | **Đọc số liệu** — Tôi đọc KPI cards trên iPhone, font quá nhỏ (10px) → Fix: tăng lên 12px |
| US4 | **Thao tác nhanh** — Tôi bấm nút "Chi tiết cuốc" trên mobile, touch target quá nhỏ → Fix: tăng padding |

## 3. Functional Requirements

### FR1 — Sửa Duplicate Mobile Filter Panel
- **Mô tả**: Trên mobile (screen < 1024px), chỉ render 1 filter panel sticky ở bottom
- **Hành vi**: 
  - Desktop: Hiển thị filter panel ngang trên cùng (đã có, giữ nguyên)
  - Mobile: Hiển thị filter panel dạng sticky bottom (1 panel duy nhất)
- **Chi tiết**: Xóa phần `div className="lg:hidden ..."` trùng lặp (đoạn ~line 2480–2652), giữ panel sticky bottom

### FR2 — Thêm Tab "Chi tiết"
- **Mô tả**: Thêm nút tab "Chi tiết" (icon Users) để chuyển sang xem Khách hàng
- **Hành vi**:
  - Tab "Tổng quan" → hiển thị KPI + Charts + Top lists + Data table
  - Tab "Chi tiết" → hiển thị Customer summary + Data table
- **Chi tiết**: 
  - Thêm button với `Users` icon từ lucide-react
  - Active state: `border-blue-600 text-blue-600`
  - Inactive state: `border-transparent text-slate-500`

### FR3 — Tăng Font Size tối thiểu
- **Mô tả**: Mọi text trên mobile (dưới 1024px) phải đọc được, tối thiểu 12px
- **Chi tiết**:
  - Thay `text-[10px]` → `text-xs` (12px)
  - Thay `text-[11px]` → `text-xs` (12px)  
  - Ngoại trừ: legend label trong chart bars (dùng `text-[11px]`)

### FR4 — Tăng Touch Target
- **Mô tả**: Các nút action trên mobile phải có touch target ≥ 36px height
- **Chi tiết**:
  - Nút "Chi tiết cuốc" trong customer mobile card: `px-3 py-2` (thay vì `px-2 py-1`)
  - Pagination buttons: `w-9 h-9` (thay vì `p-2` ≈ 32px)

### FR5 — Responsive Charts
- **Mô tả**: Charts section phải responsive tốt trên tablet
- **Chi tiết**:
  - Revenue trend + Profit: `grid-cols-1 md:grid-cols-2 lg:col-span-2` (thay vì `lg:col-span-2`)
  - Top lists: giữ `lg:grid-cols-3`

## 4. Non-Functional Requirements

- **Performance**: Không thêm API calls, không thêm re-renders
- **Compatibility**: Tailwind CSS, không thêm thư viện mới
- **Accessibility**: Touch targets ≥ 36px, font ≥ 12px

## 5. Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|-------------|
| AC1 | Trên mobile, chỉ hiển thị 1 filter panel sticky bottom | Visual check trên iPhone/Android emulator |
| AC2 | Tab "Chi tiết" hiển thị đúng nội dung customer summary | Click tab, verify content renders |
| AC3 | Mọi text trên mobile ≥ 12px | Code inspection |
| AC4 | Touch targets ≥ 36px | Visual check |
| AC5 | Charts responsive trên tablet 768px | Browser DevTools mobile preview |
| AC6 | Không break desktop layout | Desktop 1024px+ check |
| AC7 | Không break existing business logic (stats, filter, sort) | So sánh behavior trước/sau |

## 6. Out of Scope

- Thay đổi logic tính toán stats/filter/sort
- Thêm API calls mới
- Thay đổi layout desktop
- Sửa `schedule-list.tsx` (file riêng)
