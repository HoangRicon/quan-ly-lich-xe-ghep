# Nguồn dữ liệu các chỉ số báo cáo

## Tổng quan kiến trúc

```text
Database (Prisma: trips, trip_events, users)
  -> lib/reports/* service
  -> API Route: /api/reports/stats, /api/reports/drivers
  -> Frontend: page.tsx -> KpiCards / RevenueChart / StatusPieChart / DriverReportTab
```

## Nguyên tắc nghiệp vụ

- Kỳ báo cáo dùng `Trip.createdAt`: cuốc tạo ngày nào thì doanh thu của cuốc đó thuộc ngày đó.
- Doanh thu và lợi nhuận chỉ cộng cuốc có `status = "completed"`.
- `departureTime` là thời gian khởi hành/vận hành, không dùng để ghi nhận doanh thu báo cáo.
- `completedAt` hiện chưa có trong schema; trạng thái hoàn thành được theo dõi qua `Trip.status` và event `trip_completed`.
- Lần gán tài xế gần nhất lấy từ `trip_events` loại `driver_assigned` hoặc `driver_changed`, không lấy từ `updatedAt`.
- Điểm/công tài xế dùng trục `trip_events.createdAt` của lần gán tài xế. Nói cách khác, với Zom thì thời điểm gán là thời điểm chốt khung đối soát, không phải `departureTime`.

## KPI tổng quan

| Chỉ số | Nguồn | Logic |
| --- | --- | --- |
| Tổng cuốc | `trips` | Đếm tất cả cuốc tạo trong kỳ theo `createdAt` |
| Doanh thu | `trips` | Tổng `price` của cuốc completed trong kỳ |
| Lợi nhuận | `trips` | Tổng `profit` của cuốc completed trong kỳ |
| Hoàn thành | `trips` | Đếm cuốc `status = completed` |
| Đã hủy | `trips` | Đếm cuốc `status = cancelled` |
| Đã gán | `trips` | Cuốc chưa completed/cancelled và có `driverId` |
| Chưa gán | `trips` | Cuốc chưa completed/cancelled và chưa có `driverId` |
| Tỷ lệ hoàn thành | Service | `completedTrips / totalTrips` |
| Tỷ lệ hủy | Service | `cancelledTrips / totalTrips` |
| TB cuốc hoàn thành | Service | `totalRevenue / completedTrips` |
| TB lợi nhuận hoàn thành | Service | `totalProfit / completedTrips` |

## Biểu đồ doanh thu

`RevenueChart` dùng dữ liệu cuốc completed, nhóm theo `Trip.createdAt`.

| Filter | Field trả về | Nhóm |
| --- | --- | --- |
| Hôm nay / Tuần / Tháng | `revenueByDay` | `YYYY-MM-DD` theo múi giờ Việt Nam |
| Năm / Tất cả | `revenueByMonth` | `YYYY-MM` theo múi giờ Việt Nam |

```ts
for (const trip of completedTrips) {
  const day = toDayKey(trip.createdAt);
  revenueByDay[day].revenue += Number(trip.price);
  revenueByDay[day].profit += Number(trip.profit ?? 0);
  revenueByDay[day].trips += 1;
}
```

## Biểu đồ trạng thái

`StatusPieChart` hiển thị số lượng cuốc và tỷ trọng, không hiển thị tiền.

| Bucket | Logic |
| --- | --- |
| `completed` | `status = completed` |
| `cancelled` | `status = cancelled` |
| `assigned` | Chưa completed/cancelled và có `driverId` |
| `unassigned` | Chưa completed/cancelled và không có `driverId` |

`revenueByStatus` chỉ còn là alias tương thích cũ. UI mới nên dùng `statusDistribution` và `statusCounts`.

## Báo cáo tài xế

Nguồn chính là `getDriverReport` trong `lib/reports/driver-report.ts`.

| Field | Logic |
| --- | --- |
| `totalTrips` | Tổng cuốc có lần gán tài xế trong kỳ theo `trip_events.createdAt` |
| `completedTrips` | Cuốc trong tập đã gán kỳ này có `status = completed` |
| `cancelledTrips` | Cuốc trong tập đã gán kỳ này có `status = cancelled` |
| `totalRevenue` | Tổng `price` của cuốc completed trong tập đã gán kỳ này; dùng để tham khảo hiệu quả tài xế, không thay đổi sổ doanh thu tổng quan |
| `totalProfit` | Tổng `profit` của cuốc completed trong tập đã gán kỳ này |
| `totalPoints` | Tổng điểm snapshot tại lần gán cuối của chính tài xế; fallback về `Trip.pointsEarned` nếu event cũ chưa có snapshot |
| `assignedPointProfit` | Tổng công snapshot tại lần gán cuối của chính tài xế; fallback về `Trip.profit` nếu event cũ chưa có snapshot |
| `completionRate` | `completedTrips / totalTrips` |
| `cancelRate` | `cancelledTrips / totalTrips` |
| `lastAssignedAt` | MAX `trip_events.createdAt` theo event gán/đổi tài xế |
| `lastCompletedAt` | MAX event `trip_completed` hoặc thời điểm đại diện completion từ dữ liệu service |

`/api/reports/drivers/:driverId/trips` trả lịch sử cuốc để đối chiếu: ngày tạo cuốc, giờ gán cuối, điểm, công, tỷ lệ công và công thức/khung đã chốt tại lúc gán.

## Bộ lọc

| Filter | URL param | Áp dụng |
| --- | --- | --- |
| Từ ngày | `startDate=YYYY-MM-DD` | Lọc `createdAt` từ đầu ngày |
| Đến ngày | `endDate=YYYY-MM-DD` | Lọc `createdAt` đến cuối ngày |
| Tài xế | `driverId=N` | Lọc overview và tab tài xế theo tài xế |

## Cách đối chiếu nhanh bằng SQL

```sql
-- Doanh thu/lợi nhuận đã ghi nhận trong kỳ tạo cuốc
SELECT
  SUM(price) AS total_revenue,
  SUM(profit) AS total_profit,
  COUNT(*) AS completed_trips
FROM trips
WHERE account_id = :account_id
  AND status = 'completed'
  AND created_at >= :start
  AND created_at <= :end;

-- Tổng cuốc tạo trong kỳ
SELECT COUNT(*) AS total_trips
FROM trips
WHERE account_id = :account_id
  AND created_at >= :start
  AND created_at <= :end;

-- Phân bổ trạng thái vận hành
SELECT status, COUNT(*) AS count
FROM trips
WHERE account_id = :account_id
  AND created_at >= :start
  AND created_at <= :end
GROUP BY status;

-- Lần gán tài xế gần nhất và điểm/công theo kỳ gán
SELECT
  to_driver_id,
  MAX(created_at) AS last_assigned_at,
  SUM(points_earned) AS assigned_points,
  SUM(profit) AS assigned_profit
FROM trip_events
WHERE account_id = :account_id
  AND type IN ('driver_assigned', 'driver_changed')
  AND created_at >= :start
  AND created_at <= :end
GROUP BY to_driver_id;
```
