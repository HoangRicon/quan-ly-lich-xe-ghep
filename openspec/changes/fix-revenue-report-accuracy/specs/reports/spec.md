# Capability: reports

## Purpose

Trang báo cáo phải cho ra số liệu doanh thu / lợi nhuận / trạng thái cuốc chính xác, nhất quán giữa các view (KPI cards, biểu đồ đường, biểu đồ tròn, bảng theo tháng, bảng tài xế), và có khả năng drill-down chi tiết từng cuốc của từng tài xế.

## Requirements

### REQ-RPT-001: Định nghĩa "ngày gán" cho doanh thu
- Mỗi cuốc xe có một (hoặc không có) `lastAssignedAt` = thời điểm gần nhất cuốc được gán cho tài xế.
- **Doanh thu / lợi nhuận được nhóm theo `lastAssignedAt`** (timezone Asia/Ho_Chi_Minh), KHÔNG theo `departureTime`.
- Nếu `lastAssignedAt = null` (cuốc chưa từng được gán), cuốc đó **không được tính vào doanh thu ngày nào** (chỉ xuất hiện trong các KPI đếm cuốc như "Chưa gán").

### REQ-RPT-002: Phạm vi tính doanh thu
- Chỉ các cuốc có `status = "completed"` mới tính vào `totalRevenue` và `totalProfit`.
- Lý do: khi cuốc chưa hoàn thành, `price` là giá dự kiến chứ chưa phải doanh thu thực.

### REQ-RPT-003: Công thức trung bình
- `avgTripValue = totalRevenue / totalTrips` (chia trên **tất cả** cuốc trong kỳ, không chỉ cuốc completed).
- `avgProfitPerTrip = totalProfit / totalTrips`.
- Nếu `totalTrips = 0`, trả về 0.

### REQ-RPT-004: Nhóm doanh thu theo trạng thái (pie chart)
- `revenueByStatus` chỉ cộng `price` của các cuốc `completed`, nhóm theo `status`.
- Mục đích: tổng các phần trong pie chart phải ≤ `totalRevenue`.
- Trên UI: các status `confirmed` + `running` + `in_progress` được gộp thành nhóm "Đã gán" (logic `mergeAssignedRevenue` đã có).

### REQ-RPT-005: Timezone nhất quán
- Mọi phép so sánh WHERE và GROUP BY đều dùng timezone `Asia/Ho_Chi_Minh` cho việc tính "ngày".
- Server chạy UTC → API phải convert sang ICT trước khi group.
- Frontend chỉ hiển thị giá trị đã được group sẵn từ API.

### REQ-RPT-006: Bộ lọc giờ
- API nhận tham số `startHour` (0-23) và `endHour` (0-23).
- Áp dụng cho `lastAssignedAt`: chỉ lấy các cuốc có `lastAssignedAt` rơi vào khoảng giờ `[startHour, endHour]` (theo ICT).
- Nếu `startHour > endHour` (qua đêm), lấy `>= startHour OR < endHour`.
- Nếu không truyền → không lọc giờ.

### REQ-RPT-007: So sánh kỳ trước
- Kỳ trước = cùng độ dài, kết thúc ngay trước kỳ hiện tại.
- Group theo `lastAssignedAt` cho cả kỳ hiện tại và kỳ trước.
- `revenueChangePercent`, `profitChangePercent`, `tripsChangePercent` tính trên các KPI tương ứng.

### REQ-RPT-008: Drill-down tài xế
- Bảng tổng hợp tài xế có cột "Hành động" với nút "Xem chi tiết".
- Click mở drawer/panel hiển thị:
  - Tên tài xế, SĐT
  - Tổng quan nhanh (tổng cuốc, hoàn thành, doanh thu, lợi nhuận)
  - Bảng danh sách cuốc chi tiết với phân trang: STT, Điểm đi → Điểm đến, Giờ xuất phát, Giờ gán cuối, Giá, Lợi nhuận, Trạng thái
- Endpoint: `GET /api/reports/drivers/[id]/trips?startDate=&endDate=&startHour=&endHour=&page=&limit=`

## Scenarios

### Scenario 1: Doanh thu theo ngày gán
- **WHEN** có 1 cuốc được gán lúc 23:55 ngày 1/6 và hoàn thành lúc 02:00 ngày 2/6
- **THEN** doanh thu của cuốc đó phải nằm trong nhóm ngày **1/6** (theo `lastAssignedAt`), không phải 2/6.

### Scenario 2: TB cuốc đúng công thức
- **WHEN** kỳ có 10 cuốc, 3 hoàn thành với tổng doanh thu 3.000.000đ
- **THEN** `avgTripValue = 3.000.000 / 10 = 300.000đ` (không phải 1.000.000đ).

### Scenario 3: Timezone qua đêm
- **WHEN** server UTC lưu `lastAssignedAt = 2026-06-01T17:30:00Z` (= 2026-06-02 00:30 ICT)
- **THEN** cuốc này phải nằm trong nhóm ngày **2/6** theo ICT.

### Scenario 4: Lọc giờ ca đêm
- **WHEN** user chọn `startHour = 22, endHour = 6`
- **THEN** chỉ các cuốc có `lastAssignedAt` (ICT) từ 22:00 đến 06:00 sáng hôm sau được tính.

### Scenario 5: Drill-down tài xế
- **WHEN** user click "Xem chi tiết" trên tài xế A trong kỳ 1/6 → 7/6
- **THEN** drawer hiển thị danh sách cuốc của A trong kỳ đó, với phân trang 20 cuốc/trang.
