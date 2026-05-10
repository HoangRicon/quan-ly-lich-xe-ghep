# SPEC: Trang Báo Cáo Thống Kê Chuyên Nghiệp

## 1. Overview

**Project:** Hệ thống Quản lý Lịch Xe Ghép
**Component:** Trang Báo Cáo Thống Kê (`/dashboard/reports`)
**Type:** New Feature (Standard)
**Phase:** Spec → Plan → Implementation
**Date:** 2026-05-10
**Status:** Draft

---

## 2. Mục Tiêu

Xây dựng trang báo cáo thống kê **chuyên nghiệp** tại `/dashboard/reports` với:

1. **Dashboard tổng quan** — KPIs nổi bật: doanh thu, lợi nhuận, tổng cuốc xe, cuốc chưa gán Zom, cuốc hoàn thành
2. **Biểu đồ trực quan** — Doanh thu theo ngày/tháng (line chart), phân bổ trạng thái (pie chart)
3. **Bộ lọc mạnh mẽ** — Theo ngày/tuần/tháng/khoảng tùy chỉnh, theo tài xế, theo trạng thái
4. **Báo cáo chi tiết** — Theo tài xế, theo khách hàng, theo tuyến đường (phân trang, tìm kiếm)
5. **Xuất dữ liệu** — Export Excel với nhiều sheet (tổng hợp, chi tiết tài xế, chi tiết khách hàng, chi tiết tuyến)
6. **Nhập dữ liệu** — Import từ file CSV/Excel để tạo hàng loạt chuyến xe hoặc cập nhật

---

## 3. Data Model (Prisma)

### Trip Model (đã có)
```
Trip {
  id, title, departure, destination, departureTime, arrivalTime,
  price, totalSeats, status, driverId, profit, matchedFormulaId,
  pointsEarned, profitRate, tripDirection, tripType, accountId,
  createdAt, updatedAt
}
```

### Trip Status Values
- `scheduled` — Chưa gán Zom (driverId = null)
- `in_progress` — Đang chạy
- `completed` — Hoàn thành
- `cancelled` — Hủy

### Customer Model (đã có)
```
Customer {
  id, phone, name, email, notes, totalTrips, accountId, createdAt
}
```

### User/Driver Model (đã có)
```
User (Driver) {
  id, fullName, phone, email, profitRate, formulaIds, accountId
}
```

---

## 4. API Design

### 4.1 `GET /api/reports/stats`

Thống kê tổng hợp cho dashboard KPIs.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string (YYYY-MM-DD) | Ngày bắt đầu |
| `endDate` | string (YYYY-MM-DD) | Ngày kết thúc |
| `driverId` | number | Filter theo tài xế |

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTrips": 120,
    "totalRevenue": 48000000,
    "totalProfit": 9600000,
    "completedTrips": 95,
    "unassignedTrips": 12,
    "inProgressTrips": 13,
    "cancelledTrips": 0,
    "avgTripValue": 400000,
    "avgProfitPerTrip": 80000,
    "revenueByDay": [{ "date": "2026-05-01", "revenue": 1200000, "trips": 3 }, ...],
    "revenueByMonth": [{ "month": "2026-05", "revenue": 48000000, "trips": 120 }, ...],
    "revenueByStatus": { "completed": 38000000, "in_progress": 8000000, "scheduled": 2000000 },
    "revenueChangePercent": 12.5,
    "tripsChangePercent": 8.3,
    "profitChangePercent": 15.0
  }
}
```

### 4.2 `GET /api/reports/drivers`

Thống kê theo tài xế.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | Ngày bắt đầu |
| `endDate` | string | Ngày kết thúc |
| `search` | string | Tìm kiếm tên/sđt tài xế |
| `sortBy` | string | `totalRevenue`, `totalTrips`, `totalProfit` (default: `totalTrips`) |
| `sortOrder` | string | `asc` hoặc `desc` (default: `desc`) |
| `page` | number | Trang (default: 1) |
| `limit` | number | Số dòng/trang (default: 20) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "totalTrips": 45,
      "completedTrips": 40,
      "unassignedTrips": 3,
      "inProgressTrips": 2,
      "totalRevenue": 18000000,
      "totalProfit": 3600000,
      "avgTripValue": 400000,
      "badge": "top"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
```

### 4.3 `GET /api/reports/customers`

Thống kê theo khách hàng.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | Ngày bắt đầu |
| `endDate` | string | Ngày kết thúc |
| `search` | string | Tìm kiếm tên/sđt |
| `sortBy` | string | `totalSpending`, `totalTrips`, `name` (default: `totalTrips`) |
| `sortOrder` | string | `asc` hoặc `desc` (default: `desc`) |
| `page` | number | Trang |
| `limit` | number | Số dòng/trang |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Trần Văn B",
      "phone": "0987654321",
      "email": "tranb@gmail.com",
      "totalTrips": 12,
      "totalSpending": 4800000,
      "favoriteRoute": "HCM - Đà Lạt",
      "badge": "vip",
      "lastTripDate": "2026-05-08"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

### 4.4 `GET /api/reports/routes`

Thống kê theo tuyến đường.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | Ngày bắt đầu |
| `endDate` | string | Ngày kết thúc |
| `search` | string | Tìm kiếm tuyến đường |
| `sortBy` | string | `totalRevenue`, `totalTrips`, `route` (default: `totalTrips`) |
| `sortOrder` | string | `asc` hoặc `desc` |
| `page` | number | Trang |
| `limit` | number | Số dòng/trang |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "route": "HCM - Vũng Tàu",
      "departure": "HCM",
      "destination": "Vũng Tàu",
      "totalTrips": 35,
      "completedTrips": 30,
      "inProgressTrips": 3,
      "unassignedTrips": 2,
      "totalRevenue": 14000000,
      "totalProfit": 2800000,
      "avgTripValue": 400000,
      "avgProfit": 80000
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 }
}
```

### 4.5 `POST /api/reports/import`

Import dữ liệu từ CSV/Excel.

**Request Body:**
```json
{
  "type": "trips",
  "data": [
    {
      "title": "HCM-Vũng Tàu sáng",
      "departure": "HCM",
      "destination": "Vũng Tàu",
      "departureTime": "2026-05-15 08:00",
      "price": 150000,
      "totalSeats": 4,
      "customerPhone": "0912345678",
      "customerName": "Nguyễn Văn Khách"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 50,
    "failed": 2,
    "errors": [
      { "row": 3, "message": "Thiếu trường departure" }
    ]
  }
}
```

---

## 5. UI/UX Design

### 5.1 Page Layout

```
┌──────────────────────────────────────────────────────────┐
│ Header: "Báo Cáo Thống Kê" + Quick Filters (Today/Week/Month) │
├──────────────────────────────────────────────────────────┤
│ Filter Bar: Date Range | Driver | Status | [Áp dụng] [Xóa] │
├──────────────────────────────────────────────────────────┤
│ KPI Cards Row (4 cards):                                   │
│ [Doanh thu] [Lợi nhuận] [Tổng cuốc] [Cuốc chưa gán Zom]  │
├───────────────────────────────┬──────────────────────────┤
│ Revenue Chart (Line - 60%)    │ Status Pie Chart (40%)   │
├───────────────────────────────┴──────────────────────────┤
│ Tabs: [Tổng quan] [Tài xế] [Khách hàng] [Tuyến đường]     │
├──────────────────────────────────────────────────────────┤
│ Tab Content (Table + Pagination + Export button)           │
├──────────────────────────────────────────────────────────┤
│ Import Section: [Chọn file] [Mẫu tải về] [Import]          │
└──────────────────────────────────────────────────────────┘
```

### 5.2 KPI Cards

| Card | Icon | Màu | Content |
|------|------|-----|---------|
| Doanh thu | TrendingUp | green | Tổng giá trị tất cả cuốc xe (sum of `price`) |
| Lợi nhuận | DollarSign | blue | Tổng `profit` từ công thức |
| Tổng cuốc xe | Car | purple | Số lượng tất cả cuốc |
| Chưa gán Zom | Clock | orange | Cuốc có `status = scheduled` AND `driverId = null` |
| Hoàn thành | CheckCircle | green | Cuốc có `status = completed` |

### 5.3 Biểu đồ

- **Revenue Line Chart**: Trục X = ngày/tháng, trục Y = doanh thu (VND). Có tooltip hover. Legend: Doanh thu, Lợi nhuận.
- **Status Pie Chart**: 4 phần: scheduled (cam), in_progress (xanh dương), completed (xanh lá), cancelled (đỏ). Có % labels.

### 5.4 Filter Bar

- **Quick filters**: Hôm nay, Tuần này, Tháng này, Tất cả (chip buttons)
- **Custom date range**: 2 date picker inputs
- **Driver dropdown**: Select với search
- **Status dropdown**: All, Scheduled, In Progress, Completed, Cancelled
- **Apply button**: Chỉ fetch khi nhấn nút (draft-on-apply pattern)

### 5.5 Tab Content

#### Tab Tài xế
- Table columns: STT, Tên tài xế, SĐT, Tổng cuốc, Hoàn thành, Đang chạy, Chưa gán, Doanh thu, Lợi nhuận, Badge
- Badge: "Top" (top 3), "Active" (>10 trips), "Normal"
- Sort by any column, pagination 20/page
- Export button: xuất Excel

#### Tab Khách hàng
- Table columns: STT, Tên, SĐT, Email, Tổng cuốc, Tổng chi, Tuyến ưa thích, Badge, Ngày cuối
- Badge: "VIP" (>20 trips), "Regular" (5-20), "New" (<5)
- Search, sort, pagination

#### Tab Tuyến đường
- Table columns: STT, Tuyến đường, Tổng cuốc, Hoàn thành, Đang chạy, Chưa gán, Doanh thu, Lợi nhuận, Ghế TB
- Search theo tên tuyến, sort, pagination

### 5.6 Import Section

- Card riêng ở dưới cùng trang
- Drag & drop hoặc click để chọn file
- Hỗ trợ: .csv, .xlsx
- Nút "Tải mẫu" để download template
- Preview table (5 dòng đầu) trước khi import
- Progress bar khi đang import
- Thông báo kết quả: đã nhập X/Y dòng

---

## 6. Component Structure

```
app/dashboard/reports/
  └── page.tsx                    # Main page component (Client)

app/api/reports/
  ├── stats/route.ts             # GET: Dashboard KPIs + chart data
  ├── drivers/route.ts           # GET: Driver stats table
  ├── customers/route.ts          # GET: Customer stats table
  ├── routes/route.ts             # GET: Route stats table
  └── import/route.ts            # POST: Import CSV/Excel

components/reports/
  ├── kpi-cards.tsx               # KPI summary cards row
  ├── revenue-chart.tsx           # Line chart for revenue over time
  ├── status-pie-chart.tsx        # Pie chart for trip status distribution
  ├── report-filters.tsx         # Filter bar component
  ├── report-table.tsx            # Generic sortable/paginated table
  ├── driver-report-tab.tsx      # Driver stats tab content
  ├── customer-report-tab.tsx     # Customer stats tab content
  ├── route-report-tab.tsx       # Route stats tab content
  ├── import-section.tsx          # File import UI
  └── export-button.tsx           # Reusable export button
```

---

## 7. Technical Approach

### 7.1 Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4 (existing)
- **Charts**: Recharts library
- **Excel**: xlsx (already in project)
- **CSV Parsing**: Papa Parse
- **State**: React useState + useEffect (no external state manager needed)
- **Date Utils**: Existing `@/lib/date-utils`

### 7.2 Chart Library
Sử dụng **Recharts** — lightweight, React-native, supports line chart và pie chart tốt.

### 7.3 Data Fetching Pattern
- Mỗi tab/view gọi API riêng
- Draft-on-apply pattern: filter changes chỉ apply khi nhấn "Áp dụng"
- Loading states với skeleton UI
- Error boundaries cho mỗi section

### 7.4 Export Excel
Sử dụng thư viện `xlsx` (đã có trong project). Tạo workbook với multiple sheets:
- Sheet 1: "Tổng hợp" — KPIs + chart data summary
- Sheet 2: "Chi tiết tài xế" — Driver stats table
- Sheet 3: "Chi tiết khách hàng" — Customer stats table
- Sheet 4: "Chi tiết tuyến" — Route stats table

### 7.5 Import
- Parse file với Papa Parse
- Validate required fields
- Batch create via Prisma transaction
- Return detailed error report

---

## 8. Acceptance Criteria

### KPIs
- [ ] Hiển thị đúng tổng doanh thu (sum of price)
- [ ] Hiển thị đúng tổng lợi nhuận (sum of profit từ công thức)
- [ ] Hiển thị đúng tổng số cuốc xe
- [ ] Hiển thị đúng số cuốc chưa gán Zom (scheduled + no driver)
- [ ] Hiển thị đúng số cuốc hoàn thành (completed status)
- [ ] KPI cards có màu sắc và icon theo spec

### Charts
- [ ] Revenue line chart hiển thị đúng data theo khoảng thời gian filter
- [ ] Status pie chart hiển thị đúng phân bổ trạng thái

### Filters
- [ ] Quick filter buttons hoạt động (Today, Week, Month, All)
- [ ] Date range picker hoạt động
- [ ] Driver filter hoạt động
- [ ] Status filter hoạt động
- [ ] "Áp dụng" chỉ fetch lại khi nhấn nút
- [ ] "Xóa" reset tất cả filter

### Tabs
- [ ] Tab Tài xế: sort, search, pagination hoạt động
- [ ] Tab Khách hàng: sort, search, pagination hoạt động
- [ ] Tab Tuyến đường: sort, search, pagination hoạt động

### Export
- [ ] Export Excel với đầy đủ sheets hoạt động
- [ ] File download đúng format

### Import
- [ ] Drag & drop file hoạt động
- [ ] Parse CSV/Excel đúng
- [ ] Preview 5 dòng đầu hiển thị
- [ ] Import hàng loạt hoạt động
- [ ] Error report hiển thị đúng

### Performance
- [ ] Initial load < 2s
- [ ] Filter apply < 1s
- [ ] Export < 3s với 1000 records

### Responsive
- [ ] Desktop: full layout như spec
- [ ] Mobile: stacked layout, chart full-width, table scrollable

---

## 9. Non-Functional Requirements

- **Security**: Chỉ account owner xem được data của account mình
- **Accessibility**: Semantic HTML, proper ARIA labels
- **Performance**: Client-side pagination để giảm data transfer
- **UX**: Draft-on-apply filters, skeleton loading, empty states
