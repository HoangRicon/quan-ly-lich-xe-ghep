# Thuật toán lọc và chỉ số báo cáo

## Bộ lọc ngày

Frontend chỉ tạo `startDate` và `endDate`. API chuyển các ngày này thành khoảng đầu ngày/cuối ngày theo múi giờ Việt Nam rồi lọc bằng `Trip.createdAt`.

| Filter | Ngày bắt đầu | Ngày kết thúc |
| --- | --- | --- |
| Hôm nay | Hôm nay | Hôm nay |
| Tuần | Thứ 2 đầu tuần | Hôm nay |
| Tháng | Ngày 1 của tháng | Hôm nay |
| Năm | Ngày 1/1 của năm | Hôm nay |
| Tất cả | Không giới hạn | Không giới hạn |

```ts
// app/dashboard/reports/page.tsx
today -> startDate = today, endDate = today
week -> startDate = mondayOfCurrentWeek, endDate = today
month -> startDate = firstDayOfCurrentMonth, endDate = today
year -> startDate = firstDayOfCurrentYear, endDate = today
all -> startDate = "", endDate = ""
```

## Trục ngày kế toán

Quy tắc quan trọng nhất:

```text
Kỳ báo cáo = Trip.createdAt
Doanh thu được cộng khi status = completed
```

Ví dụ: cuốc tạo ngày 20/06/2026, hoàn thành ngày 21/06/2026. Khi cuốc đã completed, doanh thu của cuốc này thuộc báo cáo ngày 20/06/2026.

## Công thức KPI

| Chỉ số | Công thức |
| --- | --- |
| `totalTrips` | Đếm tất cả cuốc tạo trong kỳ |
| `completedTrips` | Đếm cuốc tạo trong kỳ có `status = completed` |
| `cancelledTrips` | Đếm cuốc tạo trong kỳ có `status = cancelled` |
| `assignedTrips` | Đếm cuốc chưa completed/cancelled và có `driverId` |
| `unassignedTrips` | Đếm cuốc chưa completed/cancelled và không có `driverId` |
| `totalRevenue` | Tổng `price` của cuốc completed |
| `totalProfit` | Tổng `profit` của cuốc completed |
| `completionRate` | `completedTrips / totalTrips * 100` |
| `cancelRate` | `cancelledTrips / totalTrips * 100` |
| `avgTripValue` | `totalRevenue / completedTrips` |
| `avgProfitPerTrip` | `totalProfit / completedTrips` |

Nếu mẫu số bằng 0, tỷ lệ và trung bình trả về 0.

## So sánh kỳ trước

Khi có đủ `startDate` và `endDate`, service tạo một khoảng kỳ trước có cùng độ dài ngay trước kỳ hiện tại.

```ts
changePercent =
  previous > 0
    ? ((current - previous) / previous) * 100
    : current > 0
      ? 100
      : 0;
```

## Nhóm doanh thu theo ngày/tháng

Chỉ cuốc completed mới đi vào `revenueByDay` và `revenueByMonth`.

```ts
const completedTrips = trips.filter((trip) => trip.status === "completed");

for (const trip of completedTrips) {
  const dayKey = toDayKey(trip.createdAt);
  const monthKey = toMonthKey(trip.createdAt);

  addMoney(revenueByDay[dayKey], trip.price, trip.profit);
  addMoney(revenueByMonth[monthKey], trip.price, trip.profit);
}
```

## Bucket trạng thái

```ts
function reportStatusBucket(trip) {
  if (trip.status === "completed") return "completed";
  if (trip.status === "cancelled") return "cancelled";
  return trip.driverId == null ? "unassigned" : "assigned";
}
```

`StatusPieChart` hiển thị `count` và `percent`, không dùng doanh thu để vẽ trạng thái.

## Báo cáo tài xế

Mỗi dòng tài xế gồm 4 nhóm dữ liệu:

- Sản lượng: tổng cuốc được gán trong kỳ, hoàn thành, đã gán, chưa gán, đã hủy.
- Tài chính: doanh thu, lợi nhuận, trung bình doanh thu/lợi nhuận trên cuốc completed.
- Chất lượng: tỷ lệ hoàn thành, tỷ lệ hủy, điểm/công chốt theo lần gán.
- Thời gian gần nhất: lần gán tài xế gần nhất và lần hoàn thành gần nhất.

Lần gán tài xế gần nhất phải lấy từ `trip_events`, không dùng `updatedAt`, vì `updatedAt` cũng đổi khi sửa giá, ghi chú hoặc thông tin khác.

Trục kỳ của điểm/công Zom là `trip_events.createdAt` của event `driver_assigned` hoặc `driver_changed`. Nếu một cuốc được tạo ngày 01/06/2026 nhưng gán tài xế ngày 19/06/2026, cuốc đó vẫn nằm trong báo cáo công/điểm tài xế ngày 19/06/2026. Ngược lại, nếu cuốc tạo trong kỳ nhưng gán sau kỳ, điểm/công của cuốc đó chưa thuộc kỳ hiện tại.

Khi tính điểm/công, service lấy snapshot mới nhất theo cặp `tripId + toDriverId`. Điều này tránh lấy nhầm điểm/công của tài xế cũ khi cuốc đã bị đổi tài xế. Với event backfill cũ chưa có snapshot, service fallback về `Trip.pointsEarned`, `Trip.profit`, `Trip.profitRate`, và `Trip.matchedFormulaId`.

## Luồng dữ liệu runtime

```text
User chọn filter
  -> page.tsx cập nhật startDate/endDate/driverId
  -> useEffect gọi fetchStats()
  -> GET /api/reports/stats?startDate=...&endDate=...&driverId=...
  -> parseReportDateRange()
  -> getOverviewReport()
  -> Prisma WHERE createdAt trong kỳ
  -> Frontend render KPI, RevenueChart, StatusPieChart
```

```text
User mở tab Tài xế
  -> DriverReportTab gọi /api/reports/drivers
  -> getDriverReport()
  -> trip_events theo giờ gán trong kỳ
  -> trips hiện tại của các cuốc có event gán trong kỳ
  -> table/mobile cards/export Excel
```

```text
User bấm "Cuốc" ở tab Tài xế
  -> DriverReportTab gọi /api/reports/drivers/:driverId/trips
  -> getDriverTripHistory()
  -> trip_events theo giờ gán trong kỳ
  -> trips hiện tại của các cuốc tương ứng
  -> modal hiển thị ngày tạo cuốc, giờ gán cuối, điểm, công, công thức/khung
```

## Response chính của `/api/reports/stats`

```json
{
  "success": true,
  "data": {
    "totalRevenue": 0,
    "totalProfit": 0,
    "totalTrips": 0,
    "completedTrips": 0,
    "assignedTrips": 0,
    "unassignedTrips": 0,
    "cancelledTrips": 0,
    "completionRate": 0,
    "cancelRate": 0,
    "avgTripValue": 0,
    "avgProfitPerTrip": 0,
    "revenueByDay": [],
    "revenueByMonth": [],
    "statusDistribution": [],
    "statusCounts": {},
    "revenueByStatus": {}
  }
}
```

## Lưu ý vận hành

- Không đối chiếu doanh thu báo cáo bằng `departureTime`.
- Không cộng tiền cuốc cancelled, scheduled hoặc assigned vào doanh thu/lợi nhuận đã ghi nhận.
- Không đối chiếu điểm/công Zom bằng `Trip.createdAt` hoặc `departureTime`; phải dùng giờ gán tài xế trong `trip_events`.
- Schema công thức hiện chưa có cột khung giờ bắt đầu/kết thúc. Hệ thống hiện chốt snapshot công thức tại lúc gán và hiển thị để đối chiếu; nếu muốn tự động chọn công thức theo ca giờ, cần bổ sung schema công thức khung giờ riêng.
- Nếu sau này cần báo cáo theo ngày hoàn thành, nên thêm field riêng `completedAt` hoặc dùng event `trip_completed` với tên báo cáo khác, không thay đổi báo cáo doanh thu theo ngày tạo cuốc hiện tại.
