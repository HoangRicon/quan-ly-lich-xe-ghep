# Fix Revenue Report Accuracy + Driver Drill-down + Hour Filter

## Why

Trang báo cáo hiện tại (`/dashboard/reports`) đang cho ra số liệu **không chính xác** trong nhiều tình huống thực tế, đồng thời thiếu khả năng drill-down chi tiết cho tài xế và bộ lọc giờ. Người dùng cần:

1. **Tin tưởng vào số liệu doanh thu / lợi nhuận** — phải khớp với dữ liệu SQL gốc và khớp giữa các view.
2. **Biết chính xác khi nào một cuốc được gán cho tài xế** (thời điểm chuyển từ "chờ gán" → "đã gán" lần cuối) để phục vụ đánh giá thời gian phản hồi.
3. **Doanh thu phải tính theo ngày gán**, không phải ngày chuyển sang hoàn thành — vì mục đích báo cáo là đo "hiệu quả gán việc" trong ngày.
4. **Có thể drill-down chi tiết từng cuốc của một tài xế** trong báo cáo tài xế.
5. **Lọc theo giờ gán** để xem ca nào trong ngày hoạt động hiệu quả nhất.

## What Changes

### 1. Schema (Prisma + migration SQL)
- **Thêm cột `lastAssignedAt`** vào bảng `trips`:
  - Kiểu: `TIMESTAMPTZ NULL`
  - Ý nghĩa: thời điểm gần nhất cuốc được gán cho tài xế (chuyển từ "chờ gán" sang "đã gán"). Null = chưa từng được gán.

### 2. API tạo/cập nhật Trip (`app/api/trips/route.ts` + `[id]/route.ts`)
- Khi trip được tạo với `driverId` ngay → set `lastAssignedAt = now()`.
- Khi trip được cập nhật từ "không có driver" → "có driver" → set `lastAssignedAt = now()`.
- Khi trip đã có driver mà đổi sang driver khác → cập nhật `lastAssignedAt = now()`.
- Khi trip bị xóa driver (null) → set `lastAssignedAt = null`.

### 3. API báo cáo — sửa logic nghiệp vụ
Sửa `app/api/reports/stats/route.ts`:
- **Sửa `avgTripValue` / `avgProfitPerTrip`**: theo tài liệu, chia trên `totalTrips`. (Hiện code chia trên `completedTrips`.)
- **Sửa nhóm doanh thu theo ngày**:
  - Trước đây: group theo `departureTime`.
  - Sau này: group theo `lastAssignedAt` (nếu null thì gán vào nhóm `unassigned`, không tính vào doanh thu ngày).
- **Sửa `revenueByStatus`**: chỉ cộng `price` của các cuốc đã `completed` (đồng nhất với KPI doanh thu).
- **Sửa `revenueByMonth`**: tương tự, group theo `lastAssignedAt`.
- **Sửa timezone**: dùng `Asia/Ho_Chi_Minh` cho cả WHERE lẫn GROUP BY (server chạy UTC).
- **Sửa tính kỳ trước**: dùng `lastAssignedAt` để so sánh cùng kỳ.
- **Thêm params mới**: `startHour` (0-23), `endHour` (0-23) áp dụng cho `lastAssignedAt`.

Sửa `app/api/reports/drivers/route.ts`:
- Sửa `totalRevenue` / `totalProfit` / `avgTripValue` theo cùng logic (chỉ tính cuốc `completed`, group theo `lastAssignedAt`).
- Thêm endpoint mới `/api/reports/drivers/[id]/trips` trả về danh sách cuốc chi tiết của 1 tài xế trong khoảng thời gian (để drill-down).

### 4. Frontend báo cáo tổng quan (`app/dashboard/reports/page.tsx`)
- Truyền `selectedDriver` xuống overview tab (hiện tại chỉ truyền xuống `DriverReportTab`).
- Bổ sung bộ lọc giờ trong panel: 2 ô nhập `Từ giờ` / `Đến giờ`.
- Cập nhật URL params khi gọi API: thêm `startHour`, `endHour`.

### 5. Frontend báo cáo tài xế (`components/reports/driver-report-tab.tsx`)
- Thêm nút "Xem chi tiết" trên mỗi dòng tài xế → mở panel/drawer hiển thị danh sách cuốc chi tiết (departure, destination, departureTime, lastAssignedAt, price, profit, status).
- Hỗ trợ phân trang trong drawer chi tiết.
- Bộ lọc giờ áp dụng cho cả bảng tổng hợp tài xế.

### 6. Tài liệu (`docs/bao-cao-thuat-toan.md`, `docs/bao-cao-data-flow.md`)
- Cập nhật cho khớp với logic mới (đặc biệt: doanh thu theo ngày gán, công thức trung bình, timezone).

## Rollback

- Drop cột `lastAssignedAt` qua migration down.
- Bỏ tham số `startHour` / `endHour` ở frontend và revert code API về group theo `departureTime`.
- Đóng endpoint drill-down `/api/reports/drivers/[id]/trips`.
- Khôi phục docs.

## Out of Scope

- Không thay đổi logic công thức tính profit (formula engine giữ nguyên).
- Không thay đổi cách nhập liệu trip (form trip giữ nguyên, chỉ backend tự động cập nhật `lastAssignedAt`).
- Không thêm chart mới ngoài việc sửa data source cho chart hiện có.
