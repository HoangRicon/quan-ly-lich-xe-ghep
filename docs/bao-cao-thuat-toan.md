# Thuật Toán Lọc & Chỉ Số Báo Cáo

## Bộ Lọc Ngày

### Các Tùy Chọn

| Filter | Mô Tả | Ngày bắt đầu | Ngày kết thúc |
|--------|--------|---------------|----------------|
| **Hôm nay** | Dữ liệu trong ngày hiện tại | Hôm nay | Hôm nay |
| **Tuần** | Dữ liệu từ đầu tuần đến hôm nay | Thứ 2 đầu tuần | Hôm nay |
| **Tháng** (mặc định) | Dữ liệu từ ngày 1 tháng đến hôm nay | Ngày 1 tháng hiện tại | Hôm nay |
| **Năm** | Dữ liệu từ ngày 1/1 đến hôm nay | 1/1 năm hiện tại | Hôm nay |
| **Tất cả** | Tất cả dữ liệu | Không giới hạn | Không giới hạn |

### Thuật Toán Tính Khoảng Ngày (Frontend)

```typescript
// File: app/dashboard/reports/page.tsx
// Hàm: applyQuickFilter(key)

Hôm nay  → start = today, end = today
Tuần     → start = firstDayOfWeek(today), end = today
Tháng   → start = firstDayOfMonth(today), end = today
Năm     → start = Jan 1 of current year, end = today
Tất cả  → start = "", end = ""
```

## Các Chỉ Số KPI

Mỗi chỉ số được tính **trên toàn bộ trips trong khoảng ngày đã chọn**.

### Danh Sách Chỉ Số

| STT | Tên | Công Thức | Nguồn Dữ Liệu |
|-----|-----|-----------|----------------|
| 1 | **Doanh thu** | Tổng `price` của tất cả trips | `SUM(trip.price)` |
| 2 | **Lợi nhuận** | Tổng `profit` của tất cả trips | `SUM(trip.profit)` |
| 3 | **Tổng cuốc** | Đếm tất cả trips | `COUNT(trip)` |
| 4 | **Chưa gán** | Trips có `status = 'scheduled'` VÀ `driverId = null` | `WHERE status='scheduled' AND driverId IS NULL` |
| 5 | **Hoàn thành** | Trips có `status = 'completed'` | `WHERE status='completed'` |
| 6 | **Đang chạy** | Trips có `status = 'in_progress'` | `WHERE status='in_progress'` |
| 7 | **Đã hủy** | Trips có `status = 'cancelled'` | `WHERE status='cancelled'` |
| 8 | **TB cuốc** | Doanh thu / Tổng cuốc | `SUM(price) / COUNT(trips)` |
| 9 | **TB lợi nhuận** | Lợi nhuận / Tổng cuốc | `SUM(profit) / COUNT(trips)` |

### Chỉ Số So Sánh (Trend %)

Mỗi chỉ số có % thay đổi so với **khoảng thời gian trước đó cùng độ dài**.

**Ví dụ:** Filter "Tháng" (30 ngày: 1/5 → 10/5)
- Khoảng hiện tại: 10/4 → 10/5 (30 ngày)
- Khoảng trước đó: 11/3 → 10/4 (30 ngày)

```typescript
// Công thức:
changePercent = prevValue > 0
  ? ((currentValue - prevValue) / prevValue) * 100
  : currentValue > 0 ? 100 : 0
```

## Biểu Đồ Doanh Thu

### Logic Chọn Data

| Filter | Data Nguồn | Label Trục X | Title |
|--------|-----------|--------------|-------|
| Hôm nay | `revenueByDay` (1 ngày) | `DD/MM` | Doanh thu hôm nay |
| Tuần | `revenueByDay` (7 ngày) | `DD/MM` | Doanh thu tuần này |
| Tháng | `revenueByDay` (≤31 ngày) | `DD/MM` | Doanh thu tháng này |
| Năm | `revenueByMonth` (12 tháng) | `T1,T2...T12` | Doanh thu theo tháng |
| Tất cả | `revenueByMonth` | `T1,T2...T12` | Doanh thu theo tháng |

### Revenue By Day

Nhóm trips theo **YYYY-MM-DD**, tính tổng revenue và profit mỗi ngày.

### Revenue By Month

Nhóm trips theo **YYYY-MM**, tính tổng revenue và profit mỗi tháng.

## Bộ Lọc Tùy Chỉnh (Panel Mở Rộng)

Khi click "Bộ lọc", panel mở rộng cho phép:

1. **Ngày tùy chỉnh** — chọn "Từ ngày" và "Đến ngày" cụ thể
2. **Tài xế** — lọc theo tài xế được chọn (áp dụng cho tab Tài xế)

> **Lưu ý:** Không có bộ lọc Trạng thái trên trang Báo cáo tổng quan. Trạng thái được hiển thị trong KPI cards và biểu đồ tròn.

## Luồng Dữ Liệu

```
User click filter
  → applyQuickFilter(key)
    → setDateFilter(key)
    → setStartDate() + setEndDate()
    → setStatsLoading(true)
  → fetchStats()
    → GET /api/reports/stats?startDate=...&endDate=...
      → Prisma: WHERE departureTime >= start AND departureTime <= end
      → Trả JSON: { totalRevenue, totalProfit, totalTrips, ..., revenueByDay, revenueByMonth }
  → setKpiData(json.data)
  → OverviewTab render
    → KpiCards: 9 metrics
    → RevenueChart: revenueByDay (day/week/month) | revenueByMonth (year/all)
    → StatusPieChart: phân bổ theo status
    → MonthlyTable: revenueByMonth
```

## API Endpoint

```
GET /api/reports/stats
  ?startDate=YYYY-MM-DD    (optional)
  ?endDate=YYYY-MM-DD      (optional)
  ?driverId=N              (optional)

Response:
{
  success: true,
  data: {
    totalRevenue,        // number
    totalProfit,        // number
    totalTrips,         // number
    completedTrips,     // number
    unassignedTrips,    // number
    inProgressTrips,   // number
    cancelledTrips,     // number
    avgTripValue,       // number
    avgProfitPerTrip,   // number
    revenueChangePercent,  // number (%)
    profitChangePercent,   // number (%)
    tripsChangePercent,    // number (%)
    revenueByDay: [{ date, revenue, profit, trips }],
    revenueByMonth: [{ month, revenue, profit, trips }],
    revenueByStatus: { "completed": N, "in_progress": N, ... }
  }
}
```
