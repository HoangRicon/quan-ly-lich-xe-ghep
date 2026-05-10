# Nguồn Dữ Liệu Các Chỉ Số Báo Cáo

## Tổng Quan Kiến Trúc

```
Database (Prisma - bảng trip)
  → API Route: /api/reports/stats
    → Frontend: page.tsx → KpiCards / RevenueChart / StatusPieChart / MonthlyTable
```

---

## Chi Tiết Từng Chỉ Số KPI

### 1. Doanh thu
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT price FROM trip WHERE accountId = ?` |
| **API** | `trips.reduce((sum, t) => sum + Number(t.price), 0)` |
| **KpiCards** | `data.totalRevenue` → formatVND() |
| **So sánh** | `revenueChangePercent` = % so với kỳ trước cùng độ dài |

### 2. Lợi nhuận
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT profit FROM trip WHERE accountId = ?` |
| **API** | `trips.reduce((sum, t) => sum + Number(t.profit ?? 0), 0)` |
| **KpiCards** | `data.totalProfit` → formatVND() |
| **So sánh** | `profitChangePercent` = % so với kỳ trước |

### 3. Tổng cuốc
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT COUNT(*) FROM trip WHERE accountId = ?` |
| **API** | `trips.length` |
| **KpiCards** | `data.totalTrips` → toLocaleString() |
| **So sánh** | `tripsChangePercent` = % so với kỳ trước |

### 4. Chưa gán (unassignedTrips)
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT * FROM trip WHERE accountId = ?` |
| **API** | `trips.filter(t => t.status === "scheduled" && !t.driverId).length` |
| **KpiCards** | `data.unassignedTrips` → toLocaleString() |
| **Logic** | Trip có `status = "scheduled"` VÀ `driverId = null` |

### 5. Đã gán (assignedTrips)
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT * FROM trip WHERE accountId = ?` |
| **API** | `trips.filter(t => t.status === "scheduled" && t.driverId).length` |
| **KpiCards** | `data.assignedTrips` → toLocaleString() |
| **Logic** | Trip có `status = "scheduled"` VÀ `driverId != null` |

### 6. Hoàn thành (completedTrips)
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT * FROM trip WHERE accountId = ?` |
| **API** | `trips.filter(t => t.status === "completed").length` |
| **KpiCards** | `data.completedTrips` → toLocaleString() |

### 7. Đang chạy (inProgressTrips)
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT * FROM trip WHERE accountId = ?` |
| **API** | `trips.filter(t => t.status === "in_progress").length` |
| **KpiCards** | `data.inProgressTrips` → toLocaleString() |

### 8. Đã hủy (cancelledTrips)
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT * FROM trip WHERE accountId = ?` |
| **API** | `trips.filter(t => t.status === "cancelled").length` |
| **KpiCards** | `data.cancelledTrips` → toLocaleString() |

### 9. Trung bình cuốc (avgTripValue)
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT price FROM trip` |
| **API** | `totalTrips > 0 ? totalRevenue / totalTrips : 0` |
| **KpiCards** | `data.avgTripValue` → formatVND() |

### 10. Trung bình lợi nhuận (avgProfitPerTrip)
| Tầng | Chi tiết |
|-------|----------|
| **DB** | `SELECT profit FROM trip` |
| **API** | `totalTrips > 0 ? totalProfit / totalTrips : 0` |
| **KpiCards** | `data.avgProfitPerTrip` → formatVND() |

---

## Biểu Đồ Doanh Thu

### RevenueChart (Đường)
| Filter | Nguồn data | Nhóm |
|--------|-----------|------|
| Hôm nay / Tuần / Tháng | `revenueByDay` | Nhóm trips theo `YYYY-MM-DD` |
| Năm / Tất cả | `revenueByMonth` | Nhóm trips theo `YYYY-MM` |

**Logic nhóm ngày:**
```
trips.forEach(trip => {
  dateStr = departureTime.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }) // YYYY-MM-DD
  revenueByDayMap[dateStr] += trip.price
  profitByDayMap[dateStr] += trip.profit
  tripsByDayMap[dateStr]++
})
```

**Logic nhóm tháng:**
```
trips.forEach(trip => {
  monthStr = departureTime.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 7) // YYYY-MM
  revenueByMonthMap[monthStr] += trip.price
  profitByMonthMap[monthStr] += trip.profit
  tripsByMonthMap[monthStr]++
})
```

### StatusPieChart (Tròn)
| Nguồn | Chi tiết |
|-------|----------|
| **API** | `revenueByStatus` = nhóm trips theo `trip.status`, tổng `price` |
| **Logic** | `{ "completed": N, "in_progress": N, "scheduled": N, "cancelled": N }` |

---

## Bảng Theo Tháng (MonthlyTable)
| Nguồn | Chi tiết |
|-------|----------|
| **API** | `revenueByMonth` — luôn dùng data nhóm theo tháng |
| **Columns** | Tháng \| Cuốc \| Doanh thu \| Lợi nhuận |

---

## Cách Xác Nhận Dữ Liệu Đúng

### Cách 1: Qua SQL trực tiếp

```sql
-- Doanh thu toàn bộ
SELECT SUM(price) as totalRevenue, SUM(profit) as totalProfit, COUNT(*) as totalTrips
FROM trips;

-- Theo status
SELECT status, COUNT(*) as count, SUM(price) as revenue
FROM trips
GROUP BY status;

-- Đã gán (scheduled + có driver)
SELECT COUNT(*) as assignedTrips FROM trips
WHERE status = 'scheduled' AND driverId IS NOT NULL;

-- Chưa gán (scheduled + chưa có driver)
SELECT COUNT(*) as unassignedTrips FROM trips
WHERE status = 'scheduled' AND driverId IS NULL;

-- Theo ngày
SELECT DATE(departureTime) as date, SUM(price) as revenue, SUM(profit) as profit, COUNT(*) as trips
FROM trips
GROUP BY DATE(departureTime)
ORDER BY date;

-- Theo tháng
SELECT DATE_FORMAT(departureTime, '%Y-%m') as month, SUM(price) as revenue, SUM(profit) as profit, COUNT(*) as trips
FROM trips
GROUP BY DATE_FORMAT(departureTime, '%Y-%m')
ORDER BY month;
```

### Cách 2: Qua API endpoint

Mở DevTools (F12) → Network tab → filter `/api/reports/stats`

Response trả về:
```json
{
  "success": true,
  "data": {
    "totalTrips": N,
    "totalRevenue": N,
    "totalProfit": N,
    "completedTrips": N,
    "assignedTrips": N,
    "unassignedTrips": N,
    "inProgressTrips": N,
    "cancelledTrips": N,
    "avgTripValue": N,
    "avgProfitPerTrip": N,
    "revenueChangePercent": N,
    "profitChangePercent": N,
    "tripsChangePercent": N,
    "revenueByDay": [{ "date": "2026-05-01", "revenue": N, "profit": N, "trips": N }],
    "revenueByMonth": [{ "month": "2026-05", "revenue": N, "profit": N, "trips": N }],
    "revenueByStatus": { "completed": N, "in_progress": N, "scheduled": N, "cancelled": N }
  }
}
```

---

## Các Cổng Lọc (Filters)

### Bộ Lọc Ngày (URL params)
| Filter | startDate | endDate |
|--------|-----------|---------|
| Hôm nay | `YYYY-MM-DD` (hôm nay) | `YYYY-MM-DD` (hôm nay) |
| Tuần | Thứ 2 đầu tuần | Hôm nay |
| Tháng | Ngày 1 tháng | Hôm nay |
| Năm | 1/1 năm | Hôm nay |
| Tất cả | *(không gửi)* | *(không gửi)* |

### Bộ Lọc Tùy Chỉnh (Panel)
| Filter | URL param |
|--------|-----------|
| Từ ngày | `?startDate=YYYY-MM-DD` |
| Đến ngày | `?endDate=YYYY-MM-DD` |
| Tài xế | `?driverId=N` |

---

## Lưu Ý Quan Trọng

1. **Tất cả chỉ số KPI** lấy từ **bảng `trip`**, cột `price` và `profit`
2. **`Chưa gán`** = trips có `status = 'scheduled'` VÀ `driverId = null`
3. **`Đã gán`** = trips có `status = 'scheduled'` VÀ `driverId != null`
4. **`departureTime`** là cột dùng để lọc theo ngày
5. **So sánh kỳ trước**: API tự động tính khoảng thời gian tương đương trước đó (ví dụ: filter 1 tháng → so với 1 tháng trước đó)
6. **Múi giờ**: Dùng `Asia/Ho_Chi_Minh` (UTC+7) để group đúng ngày
7. **Trips được tính**: Tất cả trips trong khoảng `departureTime` đã chọn, không phân biệt status
