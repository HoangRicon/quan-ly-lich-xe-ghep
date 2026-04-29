# Design: Reports Page Mobile UX Upgrade

## 1. Layout Strategy

### Mobile-First Responsive Grid

```
Mobile (< 768px):  grid-cols-2 → 4 KPI cards / row
Tablet (768–1024): md:grid-cols-2 → 4 KPI cards / row  
Desktop (> 1024):  lg:grid-cols-4 → 8 KPI cards / row
```

### Page Structure

```
┌──────────────────────────────────────┐
│ Header: Title + Export buttons        │
├──────────────────────────────────────┤
│ Tab Row: [Tổng quan] [Chi tiết]      │  ← Add "Chi tiết" tab
├──────────────────────────────────────┤
│ Quick Filters: Hôm nay|Tuần|Tháng|All │  ← overflow-x-auto
├──────────────────────────────────────┤
│ KPI Cards (4 primary):               │
│ [Doanh thu] [Lợi nhuận]             │
│ [Tổng cuốc] [Chưa gán Zom]          │
│ (remaining 4 scroll horizontally)    │
├──────────────────────────────────────┤
│ Charts (mobile: stacked):            │
│ [Revenue Trend    ]                  │
│ [Profit Chart    ]                  │
├──────────────────────────────────────┤
│ [Status Breakdown] [Top Zom] [Top Routes] │
├──────────────────────────────────────┤
│ Data Table / Trip Cards              │
├──────────────────────────────────────┤
│ Pagination                           │
├──────────────────────────────────────┤
│ 🟧 STICKY: Mobile Filter Panel       │  ← 1 panel duy nhất
│   Date Range | Zom | Status | Apply  │
└──────────────────────────────────────┘
```

## 2. Color & Typography

### Font Sizes
- Minimum: `text-xs` (12px) — tất cả body text trên mobile
- Headings: `text-sm` (14px) — section titles
- KPI values: `text-xl` (20px) → `text-2xl` trên tablet
- Labels: `text-xs text-slate-500`

### Touch Targets
- Minimum: 36×36px (Apple HIG minimum)
- Primary buttons: `px-4 py-2.5` (44px+ height)
- Icon buttons: `w-10 h-10` hoặc `p-2`

## 3. Component Specifications

### Tab Row
```
┌─────────────────┬─────────────────┐
│ Tổng quan       │ Chi tiết        │  ← border-b-2 blue when active
│ (active blue)   │ (inactive gray) │
└─────────────────┴─────────────────┘
```
- Height: 48px tap target
- Active: `border-blue-600 text-blue-600`
- Inactive: `border-transparent text-slate-500`

### KPI Card
```
┌──────────────────────────┐
│ 🔵 icon    [trend %]    │  ← 10×10 icon, trend indicator
│ Doanh thu thực tế        │  ← text-xs text-slate-500
│ 12.345.678 ₫             │  ← text-xl font-bold
└──────────────────────────┘
```
- Padding: `p-3`
- Border: `border border-slate-200 rounded-xl`
- Background: `bg-white`

### Mobile Filter Panel (Sticky Bottom)
```
┌──────────────────────────────────────┐
│ 🔽 Bộ lọc chi tiết     [Mở rộng]   │  ← Toggle
├──────────────────────────────────────┤
│ [Từ ngày] [Đến ngày]              │  ← 2-col grid
│ [Zom ▾]    [Trạng thái ▾]          │
├──────────────────────────────────────┤
│ [Xóa lọc]              [Áp dụng]   │
└──────────────────────────────────────┘
                    ↑
           mb-[180px] padding bottom
           để không bị BottomNav che
```

## 4. Responsive Breakpoints

| Component | Mobile | Tablet (md) | Desktop (lg) |
|-----------|--------|-------------|--------------|
| KPI grid | cols-2 | cols-2 | cols-4 |
| Charts | cols-1 | cols-2 | cols-3 |
| Top lists | cols-1 | cols-2 | cols-3 |
| Data table | cards | table | table |
| Filter panel | sticky bottom | inline | inline |
