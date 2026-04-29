# Proposal: Nâng cấp Reports Page — Tối ưu Mobile UX

## Tóm tắt

Trang **Báo cáo tổng hợp** (`app/dashboard/reports/page.tsx`) hiện có 2 lỗi nghiêm trọng và nhiều vấn đề UX trên thiết bị di động. Task này sửa toàn bộ để mang lại trải nghiệm mượt mà trên điện thoại.

## Vấn đề hiện tại

### Lỗi nghiêm trọng (Critical)

| # | Vấn đề | Nguyên nhân |
|---|---------|-------------|
| C1 | **Duplicate mobile filter panel** — Trên mobile, 2 bảng lọc giống hệt nhau hiển thị song song (đoạn 2303–2475 và 2480–2652), gây UI rất xấu | Logic `lg:hidden` không đúng, 2 panel cùng render |
| C2 | **Tab "Chi tiết" không click được** — Button của tab "Chi tiết" KHÔNG tồn tại trong code (chỉ có "Tổng quan"), nhưng nội dung tab "Chi tiết" vẫn được render (dòng 1989). User không thể truy cập mục Khách hàng chi tiết | Thiếu tab button, chỉ có tab content |

### Vấn đề nhẹ (Minor)

| # | Vấn đề | Chi tiết |
|---|---------|----------|
| M1 | **8 KPI cards hiển thị 2×4** trên mobile — màn hình chật, text nhỏ, phải cuộn nhiều | Nên dùng `grid-cols-2` đã có nhưng nên giới hạn 4–5 KPIs trên mobile, phần còn lại scroll ngang |
| M2 | **Quick filter row tràn màn hình** — 5 nút "Hôm nay / Tuần này / Tháng này / Tất cả / Tùy chọn" trên mobile hẹp có thể bị cắt | Đã có `overflow-x-auto` nhưng nút "Tùy chọn" nên có icon để tiết kiệm không gian |
| M3 | **Charts (2×1 grid) không có breakpoint tablet** — `lg:grid-cols-3` không có `md:` nên trên tablet (768–1024px) charts hiển thị lệch | Thêm `md:grid-cols-2` và `lg:grid-cols-3` |
| M4 | **Font quá nhỏ** — Nhiều chỗ dùng `text-[10px]` và `text-[11px]` không đọc được trên iPhone | Tăng lên tối thiểu `text-xs` (12px) |
| M5 | **KPI card header spacing** — padding `p-3` trên card nhưng header có `mb-2` và icon `10×10`, dư khoảng trắng trên mobile | Tinh chỉnh spacing |
| M6 | **Action button touch target** — nút "Chi tiết cuốc" trong customer mobile card (dòng 2113) dùng `px-2 py-1` → quá nhỏ | Tăng touch target |
| M7 | **Bottom filter panel trùng overlay** — Filter panel mobile (2303–2475) dùng `sticky bottom-0` nhưng nằm TRONG `Sidebar` đã có `BottomNav`, có thể bị che | Kiểm tra z-index và đảm bảo không bị BottomNav che |

## Giải pháp đề xuất

### Core Fixes (bắt buộc)

1. **Xóa 1 trong 2 duplicate filter panel** (giữ panel sticky bottom, bỏ panel trùng lặp ở trên)
2. **Thêm tab button "Chi tiết"** với icon Users, cho phép user chuyển giữa Tổng quan và Chi tiết khách hàng
3. **Đảm bảo filter panel mobile không bị BottomNav che** — kiểm tra `pb-[180px]` trên container

### UX Enhancements (nên làm)

4. KPI cards: giữ `grid-cols-2` trên mobile, ưu tiên hiển thị 4 KPIs quan trọng nhất (Doanh thu, Lợi nhuận, Tổng cuốc, Chưa gán)
5. Tăng font size tối thiểu lên `text-xs` (12px) cho mọi text trên mobile
6. Tăng touch target cho các nút action
7. Thêm breakpoint `md:` cho charts section

## Scope

- File duy nhất: `app/dashboard/reports/page.tsx`
- Không thay đổi logic tính toán (stats, filter, sort)
- Không thay đổi API calls
- Không thay đổi logic desktop (chỉ tối ưu mobile + tablet)

## Impact

- UX mobile: **cao** (fix 2 lỗi critical + 4+ issues nhẹ)
- Risk: **thấp** (chỉ thay đổi UI, không động business logic)
- Effort: ~2–3 giờ

## Thành viên

- Owner: AI Assistant
- Reviewer: User
