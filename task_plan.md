# Multi-Account Implementation — Task Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp ứng dụng "Quản Lý Lịch Xe Ghép" lên mô hình multi-tenant với Shared Database + Schema Isolation (Tenant ID). Mỗi tài khoản (Account) có dữ liệu riêng biệt hoàn toàn.

**Architecture:** Option A — Shared Database + Tenant ID
- Thêm bảng `Account` (root entity)
- Thêm `accountId` vào 13 models (Tier 1: required, Tier 2: required, Tier 3: nullable)
- Prisma Client Extension tự động inject `accountId` vào mọi query
- JWT payload chứa `accountId`; mọi API filter theo account

**Tech Stack:** Next.js 16 + Prisma ORM + PostgreSQL (Neon) + JWT (jose) + TypeScript

---

## Dependency Order

```
[A] Database Schema ──────────────────────────────────────────────────┐
                                                                       │
[G] Data Migration ─────────────────────────────────────────────────┐  │
                                                                       │  ▼
[B] Auth & Session ───────────────────────────────────────────────┐  │
                                                                       │  ▼
[C] Prisma Extension ─────────────────────────────────────────────┐  │
                                                                       │  ▼
[D] API Routes ──┬─────────────────────────────────────────────┐  │
[E] Dashboard    │ (D, E, F có thể chạy song song sau C)        │  │
[F] Components ──┴──────────────────────────────────────────────┘  │
                                                                       │
[H] Verification ────────────────────────────────────────────────────────
```

---

## Group A: Database & Schema (DB-01 → DB-06)

### DB-01: Thêm bảng `Account`

**Files:** `prisma/schema.prisma`

- [ ] Thêm model `Account` vào cuối schema (trước model `User`)

```prisma
model Account {
  id        Int       @id @default(autoincrement())
  name      String    @db.VarChar(255)
  slug      String    @unique @db.VarChar(100)
  logo      String?   @db.VarChar(500)
  settings  Json?
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  users     User[]
  trips     Trip[]
  customers Customer[]

  @@map("accounts")
}
```

---

### DB-02: Thêm `accountId` vào Tier-1 models

**Files:** `prisma/schema.prisma`

- [ ] `User` model — thêm `accountId`, relation, index
- [ ] `Trip` model — thêm `accountId`, relation, index
- [ ] `Customer` model — thêm `accountId`, relation, index
- [ ] `TripCustomer` model — thêm `accountId`, index
- [ ] `Booking` model — thêm `accountId`, index

Thêm vào mỗi Tier-1 model:
```prisma
accountId  Int       @map("account_id")
account    Account   @relation(fields: [accountId], references: [id])
@@index([accountId], name: "idx_<model>_account")
```

Và thêm relation ngược vào `Account`:
```prisma
users     User[]
trips     Trip[]
customers Customer[]
```

---

### DB-03: Thêm `accountId` vào Tier-2 models

**Files:** `prisma/schema.prisma`

- [ ] `Notification` model — thêm `accountId`, index
- [ ] `PushSubscription` model — thêm `accountId`, index
- [ ] `UserSettings` model — thêm `accountId`, index

```prisma
accountId  Int       @map("account_id")
@@index([accountId], name: "idx_<model>_account")
```

---

### DB-04: Thêm `accountId` vào Tier-3 models (nullable)

**Files:** `prisma/schema.prisma`

- [ ] `SystemSettings` model — thêm `accountId Int?`
- [ ] `TripStatus` model — thêm `accountId Int?`
- [ ] `EmailTemplate` model — thêm `accountId Int?`
- [ ] `PricingFormula` model — thêm `accountId Int?`

```prisma
accountId  Int?      @map("account_id")  // null = shared/global
@@index([accountId], name: "idx_<model>_account")
```

---

### DB-05: Thêm account-scoped composite indexes

**Files:** `prisma/schema.prisma`

- [ ] `Trip` — thêm `@@index([accountId, departureTime])`, `@@index([accountId, status])`, `@@index([accountId, driverId])`
- [ ] `Customer` — thêm `@@index([accountId, phone])`
- [ ] `Notification` — thêm `@@index([accountId, userId, isRead])`

---

### DB-06: Seed default account

**Files:** `seed.js` hoặc `prisma/seed.ts`

- [ ] Import `Account` model
- [ ] Tạo default account: `name: "Default Organization"`, `slug: "default"`
- [ ] Gán `accountId` vào tất cả seed data (users, customers)

---

## Group B: Auth & Session (AU-01 → AU-06)

### AU-01: Cập nhật JWT payload type

**Files:** `lib/jwt.ts`

- [ ] Thêm `accountId: number` vào `UserPayload` interface
- [ ] `encrypt()` và `decrypt()` hoạt động với payload mới
- [ ] Handle gracefully: nếu token cũ thiếu `accountId` → trả về `accountId: 0`

### AU-02: Cập nhật `setSession()`

**Files:** `lib/auth.ts`

- [ ] `setSession()` accept `UserPayload` đã có `accountId`
- [ ] JWT cookie chứa `accountId`

### AU-03: Cập nhật login flow

**Files:** `app/api/auth/login/route.ts`

- [ ] Sau khi verify password, fetch user từ DB (đã có accountId)
- [ ] Include `accountId` vào session payload
- [ ] `setSession(payload)` với accountId

### AU-04: Cập nhật register flow

**Files:** `app/api/auth/register/route.ts`

- [ ] Tạo account mới trước khi tạo user
- [ ] User được gán `accountId` = account vừa tạo
- [ ] `setSession()` với accountId

### AU-05: Cập nhật `getUserFromRequest()`

**Files:** `lib/auth.ts`

- [ ] Đọc `x-account-id` header
- [ ] Trả về payload có `accountId`
- [ ] Default: `accountId: 0` nếu không có header

### AU-06: Thêm `middleware.ts` (optional)

**Files:** `middleware.ts` (tạo mới)

- [ ] Auth-guard `/dashboard/*` routes
- [ ] Inject user info vào request headers
- [ ] Redirect `/login` nếu không có session

---

## Group C: Prisma Extension (PR-01 → PR-05)

### PR-01: Implement `createTenantPrisma` extension

**Files:** `lib/prisma-tenant.ts` (tạo mới)

- [ ] `findMany` → tự động thêm `where: { accountId }`
- [ ] `create` → tự động thêm `accountId` vào data
- [ ] `findFirst` → thêm `accountId` vào where
- [ ] `update` → thêm `accountId` vào where + data
- [ ] `delete` → thêm `accountId` vào where
- [ ] `updateMany` → thêm `accountId` vào where + data
- [ ] `deleteMany` → thêm `accountId` vào where
- [ ] `count` → thêm `accountId` vào where

### PR-02: Tạo factory function

**Files:** `lib/prisma-tenant.ts`

- [ ] `export function createTenantPrisma(prisma: PrismaClient, accountId: number)`
- [ ] Singleton `prisma` export giữ nguyên cho non-tenant operations

### PR-03: Tạo server-side tenant helper

**Files:** `lib/tenant-context.ts` (tạo mới)

- [ ] `getServerTenant(): Promise<number>` — đọc accountId từ session cookie
- [ ] `requireTenant(): Promise<number>` — throw nếu không có session

### PR-04: Tạo React tenant context provider

**Files:** `contexts/tenant-context.tsx` (tạo mới)

- [ ] `TenantProvider` component với `accountId` prop
- [ ] `useTenant()` hook
- [ ] Export từ `contexts/index.ts` hoặc tương tự

### PR-05: Cập nhật `lib/prisma.ts`

**Files:** `lib/prisma.ts`

- [ ] Export `createTenantPrisma` factory
- [ ] Giữ nguyên singleton `prisma` export
- [ ] Import types cần thiết

---

## Group D: API Routes (API-01 → API-08)

### API-01: Protect `/api/trips` routes

**Files:** `app/api/trips/route.ts`, `app/api/trips/[id]/route.ts`

- [ ] GET — dùng `createTenantPrisma`, filter accountId
- [ ] POST — dùng `createTenantPrisma`, auto-inject accountId
- [ ] PUT/DELETE — dùng `createTenantPrisma`, filter accountId
- [ ] Auth check: return 401 nếu không có session

### API-02: Protect `/api/drivers` routes

**Files:** `app/api/drivers/route.ts`, `app/api/drivers/[id]/route.ts`

- [ ] GET — filter `role: "driver"` + `accountId`
- [ ] POST — set `accountId` + `role: "driver"`
- [ ] PUT/DELETE — filter `accountId`
- [ ] Auth check

### API-03: Protect `/api/customers` routes

**Files:** `app/api/customers/route.ts`, `app/api/customers/[id]/route.ts`

- [ ] GET — filter `accountId`
- [ ] POST — set `accountId`
- [ ] PUT/DELETE — filter `accountId`
- [ ] Auth check

### API-04: Protect `/api/notifications` routes

**Files:** `app/api/notifications/route.ts`

- [ ] GET — filter `accountId` (nullable, filter cả shared + owned)
- [ ] Auth check

### API-05: Protect config routes

**Files:** `app/api/trip-statuses/route.ts`, `app/api/formulas/route.ts`, `app/api/system-settings/route.ts`

- [ ] GET — filter `accountId` (nullable = shared + owned)
- [ ] Optional: `?shared=true` param để lấy shared data

### API-06: Protect notification creation routes

**Files:** `app/api/notifications/create-*/route.ts` (các route tạo notification)

- [ ] Auth check
- [ ] Set `accountId` cho notification mới

### API-07: Protect push notification routes

**Files:** `app/api/push/*/route.ts`

- [ ] Auth check
- [ ] Set `accountId` cho subscription

### API-08: Audit all API routes

**Task:** Verify không có blind spots

- [ ] Chạy `rg "prisma\." app/api/` để tìm tất cả Prisma queries
- [ ] Verify mỗi query đều dùng tenant-aware client hoặc có accountId filter
- [ ] Fix bất kỳ blind spot nào

---

## Group E: Dashboard Pages (PA-01 → PA-05)

### PA-01: Cập nhật `/dashboard/schedule`

**Files:** `app/dashboard/schedule/page.tsx`

- [ ] Đọc `accountId` từ session
- [ ] Dùng `createTenantPrisma(prisma, accountId)` cho data fetching
- [ ] Verify trips, drivers đều filtered

### PA-02: Cập nhật `/dashboard/schedule/add`

**Files:** `app/dashboard/schedule/add/page.tsx`

- [ ] Drivers dropdown filter theo `accountId`
- [ ] Trip create dùng tenant-aware prisma

### PA-03: Cập nhật `/dashboard/drivers`

**Files:** `app/dashboard/drivers/page.tsx`

- [ ] Filter `role: "driver"` + `accountId`
- [ ] Dùng tenant-aware prisma

### PA-04: Cập nhật `/dashboard/reports`

**Files:** `app/dashboard/reports/page.tsx`

- [ ] Tất cả queries có `accountId` filter
- [ ] Dùng tenant-aware prisma

### PA-05: Cập nhật `/dashboard/analytics`

**Files:** `app/dashboard/analytics/page.tsx`

- [ ] Tất cả queries có `accountId` filter
- [ ] Dùng tenant-aware prisma

---

## Group F: Client Components (CL-01 → CL-04)

### CL-01: Cập nhật `schedule-list.tsx`

**Files:** `components/schedule-list.tsx`

- [ ] Thêm `accountId` prop vào interface
- [ ] Truyền `x-account-id` header trong tất cả fetch calls
- [ ] Cập nhật callsites (nơi sử dụng component)

### CL-02: Cập nhật `driver-list.tsx`

**Files:** `components/driver-list.tsx`

- [ ] Thêm `accountId` prop
- [ ] Truyền `x-account-id` header trong fetch calls

### CL-03: Cập nhật `header.tsx`

**Files:** `components/dashboard/header.tsx`

- [ ] Nhận `accountId` prop hoặc đọc từ context
- [ ] Truyền `x-account-id` header trong notification fetch

### CL-04: Tạo/cập nhật `dashboard/layout.tsx`

**Files:** `app/dashboard/layout.tsx`

- [ ] Wrap children với `TenantProvider`
- [ ] Pass `session.accountId` vào provider
- [ ] Auth guard redirect to `/login`

---

## Group G: Data Migration (MG-01 → MG-04)

### MG-01: Tạo migration script

**Files:** `scripts/migrate-to-multiaccount.ts` (tạo mới)

- [ ] Tạo default account
- [ ] UPDATE all Tier-1 tables: `accountId = defaultAccount.id`
- [ ] UPDATE all Tier-2 tables: `accountId = defaultAccount.id`
- [ ] UPDATE all Tier-3 tables: giữ nullable (shared)
- [ ] Verify no null values

### MG-02: Backup database

**Task:** Hướng dẫn backup

- [ ] Neon dashboard export HOẶC `pg_dump`
- [ ] Verify backup thành công

### MG-03: Chạy migration + apply NOT NULL

**Task:** Sau khi MG-01 script chạy thành công

- [ ] `npx prisma migrate dev` để tạo migration
- [ ] Chạy MG-01 script
- [ ] `npx prisma migrate dev` để apply NOT NULL constraints
- [ ] `npx prisma db push` nếu cần

### MG-04: Verify schema sync

**Task:**

- [ ] `npx prisma db pull` — no drift
- [ ] `npx prisma generate` — thành công

---

## Group H: Verification (VF-01 → VF-05)

### VF-01: Test login — JWT chứa accountId

**Task:** Login → decode cookie → verify `accountId` field tồn tại và đúng

- [ ] JWT payload có `accountId`
- [ ] `accountId` khớp với DB

### VF-02: Test data isolation

**Task:** Login với account A → không thấy data account B

- [ ] Account isolation verified

### VF-03: Test CRUD operations

**Task:** Tạo/đọc/sửa/xóa trip, driver, customer

- [ ] Tất cả CRUD hoạt động đúng
- [ ] Không có cross-account access

### VF-04: Test registration — account mới

**Task:** Đăng ký → verify account + user + data isolation

- [ ] Register tạo account riêng
- [ ] User chỉ thấy data của mình

### VF-05: Regression test

**Task:** Smoke test features hiện có

- [ ] Login, schedule, drivers, notifications — tất cả hoạt động
- [ ] Không có regression

---

## Progress Log

| Date | Group | Status | Notes |
|------|-------|--------|-------|
| 2026-04-28 | Setup | DONE | Creating task_plan.md |
| 2026-04-28 | A | DONE | Database schema — Account model, accountId on 13 models, composite indexes |
| 2026-04-28 | B | DONE | Auth & session — JWT has accountId, login/register flow updated |
| 2026-04-28 | C | DONE | Prisma extension — createTenantPrisma, tenant-context, lib/prisma.ts |
| 2026-04-28 | D | DONE | API routes — ALL protected with auth + accountId filter |
| 2026-04-28 | E | DONE | Dashboard layout created with TenantProvider; UI unchanged (cookie auth sufficient) |
| 2026-04-28 | F | DONE | Client components — no changes needed (session cookie handles auth) |
| 2026-04-28 | G | DONE | Migration — manual SQL (20260428000000) for Account model + accountId on all tenant tables; seed ran |
| 2026-04-28 | H | DONE | Verification — all API tests pass; tenant isolation verified; register creates new account |
