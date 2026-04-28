# SPEC: Đán Giá Khả Năng Nâng Cấp Lên Đa Tài Khoản (Multi-Tenant)

## 1. Tổng Quan Đề Xuất Thay Đổi

**Tên thay đổi:** `multi-account-feasibility`

**Loại:** Architecture Assessment — Đánh giá kiến trúc hệ thống hiện tại và đề xuất phương án nâng cấp lên đa tài khoản (mỗi tài khoản dùng dữ liệu riêng biệt).

**Bối cảnh dự án:**
- App "Quản Lý Lịch Xe Ghép" — ứng dụng quản lý xe ghép, tài xế, khách hàng, thông báo
- Tech stack: Next.js 16 (App Router) + Prisma ORM + PostgreSQL (Neon) + JWT (httpOnly cookie) + TypeScript + Tailwind CSS + shadcn/ui
- Đã triển khai: 13 bảng database, 25+ API route handlers, authentication system, dashboard UI
- Quy mô: codebase ~40-60 files nguồn, database 13 bảng

## 2. Định Nghĩa Yêu Cầu

### 2.1 Mục tiêu nghiệp vụ

Người dùng muốn nâng cấp ứng dụng để hỗ trợ **đa tài khoản**, trong đó mỗi tài khoản sử dụng một bộ dữ liệu hoàn toàn riêng biệt (trips, drivers, customers, notifications, settings, formulas).

**Các câu hỏi cần trả lời:**
1. Việc nâng cấp có khả thi không? (Feasibility)
2. Việc nâng cấp có dễ dàng không? (Effort estimation)
3. Có những phương án nào? (Options)
4. Nên chọn phương án nào? (Recommendation)
5. Cần thay đổi những gì? (Change catalog)

### 2.2 Các mô hình đa tài khoản có thể áp dụng

#### Mô hình A: Shared Database + Schema Isolation (Tenant ID)
- Tất cả tài khoản dùng chung 1 database, 1 schema
- Mỗi bảng có thêm trường `tenantId` / `accountId`
- Tất cả query đều phải filter theo `tenantId`
- **Ưu điểm:** Migration đơn giản, dễ quản lý backup, chi phí database thấp
- **Nhược điểm:** Cần sửa mọi query, risk data leak nếu filter thiếu, cần thêm index

#### Mô hình B: Separate Database per Tenant
- Mỗi tài khoản có database riêng
- Có thể dùng connection string khác nhau hoặc schema PostgreSQL riêng
- **Ưu điểm:** Isolation hoàn toàn, security cao nhất, backup/restore độc lập
- **Nhược điểm:** Phức tạp hơn về infra (nhiều connection strings, migrations), khó query cross-account

#### Mô hình C: Hybrid — Shared DB + Row-Level Security (RLS)
- PostgreSQL Row-Level Security policy
- Database-level enforcement thay vì application-level
- **Ưu điểm:** Security ở tầng database, khó bypass
- **Nhược điểm:** Prisma hỗ trợ RLS hạn chế, phức tạp hơn setup

## 3. Acceptance Criteria

| # | Tiêu chí | Kết quả |
|---|---|---|
| AC1 | Xác định chính xác những gì cần thay đổi trong schema | Danh sách bảng cần thêm `accountId` |
| AC2 | Ước lượng effort cho từng phương án | Đánh giá Low/Medium/High cho mỗi mô hình |
| AC3 | Đề xuất phương án tối ưu cho ngữ cảnh hiện tại | Recommendation có lý do rõ ràng |
| AC4 | Cung cấp task list chi tiết cho phương án được chọn | Danh sách file cần sửa, thứ tự thực hiện |

## 4. Phạm Vi Đánh Giá

### Trong phạm vi:
- Prisma schema (13 models)
- API route handlers (trips, drivers, customers, notifications, auth, formulas, settings)
- Authentication flow (JWT session, cookie-based)
- Dashboard pages (Server Components + Client Components)
- State management patterns
- Database connection layer

### Ngoài phạm vi:
- Không triển khai code — chỉ đánh giá và đề xuất
- Không thay đổi CI/CD hoặc deployment
- Không đánh giá hiệu năng (performance benchmarking)
- Không thiết kế UI cho tính năng đăng ký/account management

## 5. Ràng Buộc & Giả Định

- Database hiện tại là **single-tenant** — tất cả dữ liệu dùng chung
- Không có middleware.ts — auth check thủ công trong từng Server Component
- Nhiều API routes **không có auth check** — trả về tất cả data
- Không có global state management — chỉ useState/useEffect
- PostgreSQL (Neon) — hỗ trợ đầy đủ schema per tenant hoặc RLS
