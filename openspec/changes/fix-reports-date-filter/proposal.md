# Fix: Bộ lọc ngày trên trang Báo cáo không hoạt động đúng

## Mô tả Bug

**Mô tả:** Bộ lọc "Đến ngày" chỉ hoạt động khi có "Từ ngày". Nếu chỉ chọn "Đến ngày" mà không chọn "Từ ngày", kết quả lọc không đúng hoặc bị delay.

## Phân tích nguyên nhân

### Nguyên nhân 1: `fetchData` không được memoize bằng `useCallback`

Trong `app/dashboard/reports/page.tsx`, hàm `fetchData` được định nghĩa như một closure thông thường. Mỗi khi component re-render (do state thay đổi), `fetchData` được tạo lại với reference mới. `useEffect` phụ thuộc `[startDate, endDate, selectedDriver, statusFilter]` không phải là dependency ổn định, dẫn đến:

- Effect chạy nhiều lần không cần thiết
- Race condition giữa các API calls
- **Possible delay khi chỉ set `endDate`**

### Nguyên nhân 2: Quick filter buttons update applied state trực tiếp (mobile)

```typescript
// Quick filter = áp dụng ngay, không qua draft
setDateFilter(filter);
setStartDate(nextStart);
setEndDate(nextEnd);
```

Trên mobile (`filtersOpen = false`), draft state không được sync với applied state, dẫn đến:
- Draft state = giá trị cũ
- Applied state = giá trị mới
- `isDraftDirty` = true → UI hiển thị nút "Áp dụng" màu xanh dương
- User nhấn "Áp dụng" → draft được apply lại → API gọi lại cùng params → không thay đổi kết quả

### Nguyên nhân 3: Date input `type="date"` không validate đầy đủ

Khi user chỉ nhập "Đến ngày":
- `draftEndDate` = giá trị mới
- `draftDateFilter` = "custom"  
- `draftStartDate` = giá trị cũ (có thể là ngày trong quá khứ)

Sau khi Apply:
- `startDate` = giá trị cũ (không mong muốn)
- `endDate` = giá trị mới
- API: `endDate` được gửi nhưng có thể bị overqualified bởi giá trị `startDate` cũ từ draft

## Giải pháp

### Fix 1: Memoize `fetchData` bằng `useCallback`

```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    // ... existing logic ...
  } finally {
    setLoading(false);
  }
}, [selectedDriver, statusFilter, startDate, endDate]);

// Effect phụ thuộc vào stable fetchData reference
useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Fix 2: Sync draft state trong quick filter handlers

```typescript
const handleQuickFilter = (filter: DateFilter) => {
  // ... existing logic ...
  setDraftDateFilter(filter);
  setDraftStartDate(nextStart);
  setDraftEndDate(nextEnd);
  setDateFilter(filter);
  setStartDate(nextStart);
  setEndDate(nextEnd);
};
```

### Fix 3: Reset startDate khi chỉ chọn endDate trong custom filter

Trong `applyDraftFilters`, nếu `draftDateFilter === "custom"` và chỉ có `draftEndDate` mà không có `draftStartDate`, nên set `startDate = ""` (không có constraint TỪ ngày):

```typescript
const applyDraftFilters = () => {
  if (draftDateRangeInvalid) return;
  setDateFilter(draftDateFilter);
  setStartDate(draftStartDate); // có thể là "" nếu user chỉ chọn đến ngày
  setEndDate(draftEndDate);
  setSelectedDriver(draftSelectedDriver);
  setStatusFilter(draftStatusFilter);
};
```

Backend đã xử lý đúng case `endDate` không có `startDate` (Prisma query có `lte: end`), nên chỉ cần frontend gửi đúng giá trị.

## Hành vi mong đợi sau fix

1. Chọn **chỉ** "Đến ngày" (không có Từ ngày) → chỉ hiển thị trips **đến ngày đó** ✅
2. Chọn **chỉ** "Từ ngày" (không có Đến ngày) → chỉ hiển thị trips **từ ngày đó** ✅  
3. Chọn cả hai → hiển thị trips trong khoảng ✅
4. Quick filter buttons hoạt động đúng trên cả desktop và mobile ✅
5. Không còn delay khi apply filter ✅

## Scope

- **File sửa:** `app/dashboard/reports/page.tsx`
- **Không sửa:** API routes (đã hoạt động đúng), UI layout
