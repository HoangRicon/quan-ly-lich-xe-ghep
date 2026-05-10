# Task Plan: Trang Báo Cáo Thống Kê Chuyên Nghiệp

## Nhiệm vụ chi tiết

### Phase 2: API Routes

- [ ] **T2.1** Tạo `GET /api/reports/stats` — KPIs + chart data
- [ ] **T2.2** Tạo `GET /api/reports/drivers` — Driver stats table
- [ ] **T2.3** Tạo `GET /api/reports/customers` — Customer stats table
- [ ] **T2.4** Tạo `GET /api/reports/routes` — Route stats table
- [ ] **T2.5** Tạo `POST /api/reports/import` — Import CSV/Excel

### Phase 3: UI Components

- [ ] **T3.1** Tạo `components/reports/kpi-cards.tsx` — KPI summary cards
- [ ] **T3.2** Tạo `components/reports/revenue-chart.tsx` — Line chart
- [ ] **T3.3** Tạo `components/reports/status-pie-chart.tsx` — Pie chart
- [ ] **T3.4** Tạo `components/reports/report-filters.tsx` — Filter bar
- [ ] **T3.5** Tạo `components/reports/report-table.tsx` — Generic sortable table
- [ ] **T3.6** Tạo `components/reports/driver-report-tab.tsx` — Driver tab
- [ ] **T3.7** Tạo `components/reports/customer-report-tab.tsx` — Customer tab
- [ ] **T3.8** Tạo `components/reports/route-report-tab.tsx` — Route tab
- [ ] **T3.9** Tạo `components/reports/import-section.tsx` — Import UI

### Phase 4: Main Page

- [ ] **T4.1** Viết lại `app/dashboard/reports/page.tsx` — Page chính
- [ ] **T4.2** Thêm icon BarChart3 vào sidebar
- [ ] **T4.3** Cập nhật menu sidebar

### Phase 5: Import

- [ ] **T5.1** Implement `POST /api/reports/import` với validation
- [ ] **T5.2** Implement UI preview + progress + error report

### Phase 6: Kiểm tra

- [ ] **T6.1** Chạy dev server kiểm tra
- [ ] **T6.2** Test API endpoints
- [ ] **T6.3** Test export Excel
- [ ] **T6.4** Test import

---

## File Structure Mapping

```
app/
  api/reports/
    stats/route.ts           (T2.1)
    drivers/route.ts         (T2.2)
    customers/route.ts       (T2.3)
    routes/route.ts           (T2.4)
    import/route.ts           (T2.5)
  dashboard/reports/
    page.tsx                 (T4.1)

components/reports/
  kpi-cards.tsx              (T3.1)
  revenue-chart.tsx          (T3.2)
  status-pie-chart.tsx       (T3.3)
  report-filters.tsx         (T3.4)
  report-table.tsx           (T3.5)
  driver-report-tab.tsx      (T3.6)
  customer-report-tab.tsx    (T3.7)
  route-report-tab.tsx      (T3.8)
  import-section.tsx         (T3.9)

components/dashboard/
  sidebar.tsx                (T4.2, T4.3)
```

## Test Strategy

1. API routes: Test với curl/Postman
2. UI: Manual test trên browser
3. Export: Verify Excel file opens correctly
4. Import: Test với file mẫu

## Notes

- Sử dụng `createTenantPrisma` cho multi-tenant isolation
- Dùng `getSession` cho authentication
- Revenue = SUM(price), Profit = SUM(profit) từ công thức
- Unassigned trips = status="scheduled" AND driverId IS NULL
