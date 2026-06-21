# Quick Create Page (Tạo nhanh cuốc xe)

## Why

Người dùng hiện tại phải mở form đầy đủ (`/dashboard/schedule/add`) để tạo từng cuốc xe, hoặc dùng quick-entry nhưng thiếu khả năng quản lý nhiều phiên làm việc, nhiều bản nháp cùng lúc, và chuyển draft thành cuốc xe chỉ bằng 1 click. Trang mới này tập trung vào tốc độ thao tác mobile-first — người dùng có thể tạo nhiều bản nháp qua AI chat, quản lý theo phiên, và tạo cuốc xe chỉ bằng 1 lần bấm, giống cảm giác thao tác trên `/dashboard/schedule`.

## What Changes

- Tạo route `/dashboard/quick-create` với layout riêng (không dùng dashboard layout) để tối ưu full-screen mobile
- Component tree: `QuickCreatePage` → `BackButton` + `SessionSwitcher` + `DraftList` + `AIComposer` + `DraftCard` + `DraftEditorSheet` + `QuickActionsBar`
- **No bottom-nav**: Trang dùng nút back `←` trong header thay vì bottom navigation bar
- Tái sử dụng API routes `/api/quick-trip-entry/sessions/*` và `/api/quick-trip-entry/items/*` đã có
- Tái sử dụng backend service `lib/quick-trip-entry/service.ts`
- Draft card lấy style tham chiếu từ `components/schedule-list.tsx` card (`bg-white rounded-lg border border-slate-200 p-2`)
- Bottom navigation riêng cho trang này: Quick Create + Cuốc xe + Zom + Báo cáo

## Rollback

- Xóa route `/dashboard/quick-create` và component files
- Không ảnh hưởng API routes hoặc backend service

## Out Of Scope

- Không thay đổi schema database
- Không thay đổi AI parser service
- Không tạo tính năng đồng bộ offline
- Không tạo tính năng push notification
