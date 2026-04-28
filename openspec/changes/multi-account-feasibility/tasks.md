# TASKS: Danh Sách Công Việc — Nâng Cấp Đa Tài Khoản

## Task Groups Overview

| Group | Phase | Tasks | Total |
|-------|-------|-------|-------|
| A | Database & Schema | DB-01 → DB-06 | 6 |
| B | Auth & Session | AU-01 → AU-06 | 6 |
| C | Prisma Extension (Core) | PR-01 → PR-05 | 5 |
| D | API Routes | API-01 → API-08 | 8 |
| E | Dashboard Pages | PA-01 → PA-05 | 5 |
| F | Client Components | CL-01 → CL-04 | 4 |
| G | Data Migration | MG-01 → MG-04 | 4 |
| H | Verification | VF-01 → VF-05 | 5 |
| **Tổng** | | | **43 tasks** |

---

## Group A: Database & Schema

### DB-01: Thêm bảng `Account`
**File:** `prisma/schema.prisma` (thêm model mới)

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

**Acceptance criteria:**
- [ ] Model `Account` thêm vào schema với fields trên
- [ ] `User`, `Trip`, `Customer` có relation `account Account`
- [ ] Migrations chạy thành công trên dev database

---

### DB-02: Thêm `accountId` vào Tier-1 models
**File:** `prisma/schema.prisma`

Thêm `accountId Int @map("account_id")` + `account Account @relation(...)` vào:

| Model | Relation | Index |
|---|---|---|
| `User` | `account Account @relation(fields: [accountId], references: [id])` | `@@index([accountId])` |
| `Trip` | `account Account @relation(fields: [accountId], references: [id])` | `@@index([accountId])` |
| `Customer` | `account Account @relation(fields: [accountId], references: [id])` | `@@index([accountId])` |
| `TripCustomer` | Dẫn xuất từ `Trip` → không cần riêng | `@@index([accountId])` |
| `Booking` | Dẫn xuất từ `Trip` → không cần riêng | `@@index([accountId])` |

**Acceptance criteria:**
- [ ] Tất cả 5 models trên có `accountId` field
- [ ] Migrations chạy thành công
- [ ] Prisma Client regenerate thành công

---

### DB-03: Thêm `accountId` vào Tier-2 models
**File:** `prisma/schema.prisma`

Thêm `accountId Int @map("account_id")` vào:

| Model | Notes |
|---|---|
| `Notification` | Dẫn xuất từ User |
| `PushSubscription` | Dẫn xuất từ User |
| `UserSettings` | Dẫn xuất từ User |

**Acceptance criteria:**
- [ ] 3 models Tier-2 có `accountId`
- [ ] Migrations chạy thành công

---

### DB-04: Thêm `accountId` vào Tier-3 models (nullable)
**File:** `prisma/schema.prisma`

Thêm `accountId Int? @map("account_id")` (nullable) vào:

| Model | Notes |
|---|---|
| `SystemSettings` | null = global, có value = per-account override |
| `TripStatus` | null = shared, có value = per-account |
| `EmailTemplate` | null = shared, có value = per-account |
| `PricingFormula` | null = shared, có value = per-account |

**Acceptance criteria:**
- [ ] 4 models Tier-3 có `accountId Int?`
- [ ] Migrations chạy thành công

---

### DB-05: Thêm account-scoped indexes
**File:** `prisma/schema.prisma`

Thêm composite indexes cho query performance:

```prisma
// Trên Trip
@@index([accountId, departureTime], name: "idx_trips_account_departure")
@@index([accountId, status], name: "idx_trips_account_status")
@@index([accountId, driverId], name: "idx_trips_account_driver")

// Trên Customer
@@index([accountId, phone], name: "idx_customers_account_phone")

// Trên Notification
@@index([accountId, userId, isRead], name: "idx_notifications_account_user_read")
```

**Acceptance criteria:**
- [ ] Composite indexes thêm vào schema
- [ ] Migration tạo indexes thành công

---

### DB-06: Seed default account
**File:** `seed.js` hoặc `prisma/seed.ts`

Tạo default account khi seed:

```javascript
const defaultAccount = await prisma.account.create({
  data: {
    name: "Default Organization",
    slug: "default",
  },
});
```

**Acceptance criteria:**
- [ ] Seed tạo được default account
- [ ] ID của default account = 1 (hoặc ghi nhận để dùng trong migration)

---

## Group B: Auth & Session

### AU-01: Cập nhật JWT payload type
**File:** `lib/jwt.ts`

```typescript
// lib/jwt.ts
export interface UserPayload {
  id: number;
  email: string;
  fullName: string;
  role: string;
  passwordVersion: number;
  accountId: number;  // ← THÊM
}
```

**Acceptance criteria:**
- [ ] `UserPayload` interface có `accountId`
- [ ] `encrypt()` và `decrypt()` hoạt động với payload mới
- [ ] Không break existing code (nếu token cũ thiếu accountId → handle gracefully)

---

### AU-02: Cập nhật `setSession()` để include accountId
**File:** `lib/auth.ts`

```typescript
export async function setSession(user: UserPayload): Promise<void> {
  // user.accountId phải có giá trị
  // ...
}
```

**Acceptance criteria:**
- [ ] JWT cookie chứa `accountId` sau khi login
- [ ] Decode JWT thấy `accountId` đúng

---

### AU-03: Cập nhật login flow — resolve account từ user
**File:** `app/api/auth/login/route.ts`

```typescript
// Khi login thành công, lấy accountId từ user và include vào session
const user = await prisma.user.findUnique({ where: { email } });
const sessionPayload: UserPayload = {
  id: user.id,
  email: user.email,
  fullName: user.fullName || "",
  role: user.role,
  passwordVersion: user.passwordVersion,
  accountId: user.accountId,  // ← THÊM
};
await setSession(sessionPayload);
```

**Acceptance criteria:**
- [ ] Login → session cookie chứa đúng `accountId`
- [ ] Session có thể decode ra `accountId`

---

### AU-04: Cập nhật register flow — tạo account + user
**File:** `app/api/auth/register/route.ts`

```typescript
// Khi đăng ký, tạo account mới + user thuộc account đó
// HOẶC: assign vào default account (tùy business requirement)

// Option A: Tạo account mới cho mỗi user
const account = await prisma.account.create({
  data: { name: `${email}'s Organization`, slug: generateSlug(email) },
});
const user = await prisma.user.create({
  data: { email, passwordHash, accountId: account.id },
});

// Option B: Assign vào default account (đơn giản hơn)
// const user = await prisma.user.create({
//   data: { email, passwordHash, accountId: DEFAULT_ACCOUNT_ID },
// });
```

**Acceptance criteria:**
- [ ] Register tạo được account + user
- [ ] User thuộc account đúng
- [ ] Login sau register hoạt động với accountId

---

### AU-05: Cập nhật `getUserFromRequest()` — trả về accountId
**File:** `lib/auth.ts`

```typescript
export async function getUserFromRequest(request: NextRequest): Promise<UserPayload | null> {
  // ... existing code ...
  // THÊM: accountId từ header
  const accountId = request.headers.get("x-account-id");
  
  return {
    id: parseInt(userId, 10),
    email: userEmail,
    role: userRole,
    fullName: userName || "",
    passwordVersion: userPasswordVersion ? parseInt(userPasswordVersion, 10) : 1,
    accountId: accountId ? parseInt(accountId, 10) : 0,  // ← THÊM
  };
}
```

**Acceptance criteria:**
- [ ] `getUserFromRequest()` trả về payload có `accountId`
- [ ] API routes có thể đọc `accountId` từ request headers

---

### AU-06: (Optional) Thêm `middleware.ts` cho route protection
**File:** `middleware.ts` (tạo mới)

Global route middleware thay thế auth checks rải rác trong Server Components.

**Acceptance criteria:**
- [ ] `/dashboard/*` routes redirect về `/login` nếu không có session
- [ ] `/api/*` routes trả 401 nếu không có session
- [ ] User info được inject vào request headers

---

## Group C: Prisma Extension (Core Architecture)

### PR-01: Thiết kế và implement `createTenantPrisma` extension
**File:** `lib/prisma-tenant.ts` (tạo mới)

Implement Prisma Client Extension để auto-inject `accountId` vào mọi query.

**Acceptance criteria:**
- [ ] `findMany` tự động thêm `where: { accountId }`
- [ ] `create` tự động thêm `accountId` vào data
- [ ] `update`/`delete` filter theo `accountId`
- [ ] `findUnique` dùng composite key `(id, accountId)`
- [ ] Extension không leak data giữa các account

---

### PR-02: Tạo Prisma client factory
**File:** `lib/prisma-tenant-factory.ts` (tạo mới)

Factory pattern để tạo tenant-aware Prisma instance:

```typescript
export function createTenantClient(accountId: number): TenantPrisma {
  return basePrisma.$extends({
    // ... tenant extension ...
  });
}

export function getTenantFromSession(): Promise<number | null> {
  // Read accountId from session cookie
}
```

**Acceptance criteria:**
- [ ] Có thể tạo tenant-aware client với accountId cụ thể
- [ ] Singleton pattern cho non-tenant operations (auth, system settings)

---

### PR-03: Tạo server-side tenant context helper
**File:** `lib/tenant-context.ts` (tạo mới)

Utility cho Server Components:

```typescript
// lib/tenant-context.ts
export async function getServerTenant(): Promise<number> {
  const session = await getSessionFromCookie();
  if (!session?.accountId) {
    throw new Error("Unauthorized: No account context");
  }
  return session.accountId;
}
```

**Acceptance criteria:**
- [ ] Server Components có thể lấy `accountId` từ session một cách thuận tiện

---

### PR-04: Tạo client-side tenant context provider
**File:** `contexts/tenant-context.tsx` (tạo mới)

React Context để truyền `accountId` xuống client components:

```typescript
// contexts/tenant-context.tsx
"use client";
import { createContext, useContext } from "react";

const TenantContext = createContext<{ accountId: number } | null>(null);

export function TenantProvider({ accountId, children }) {
  return (
    <TenantContext.Provider value={{ accountId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
```

**Acceptance criteria:**
- [ ] Client components có thể đọc `accountId` từ context
- [ ] Context được hydrate từ session trong Server Component parent

---

### PR-05: Cập nhật `lib/prisma.ts` — export factory
**File:** `lib/prisma.ts`

Export tenant-aware prisma factory và singleton:

```typescript
import { createTenantPrisma } from "./prisma-tenant";

export { prisma } from "./prisma";  // singleton
export { createTenantPrisma };      // factory cho tenant-aware
```

**Acceptance criteria:**
- [ ] Existing imports vẫn hoạt động (singleton `prisma`)
- [ ] Tenant-aware factory có thể import được

---

## Group D: API Routes

### API-01: Bảo vệ `/api/trips` routes — add auth + accountId filter
**Files:** `app/api/trips/route.ts`, `app/api/trips/[id]/route.ts`

```typescript
// Triển khai:
// 1. Auth check: if (!session) return 401
// 2. Dùng createTenantPrisma(prisma, session.accountId)
// 3. findMany, findUnique, create, update, delete dùng tenant-aware client
```

**Acceptance criteria:**
- [ ] GET /api/trips → chỉ trả trips của account hiện tại
- [ ] POST /api/trips → tạo trip với đúng accountId
- [ ] PUT /api/trips/[id] → chỉ update trip của account
- [ ] DELETE /api/trips/[id] → chỉ xóa trip của account
- [ ] Cố truy cập trip của account khác → 404 hoặc 403

---

### API-02: Bảo vệ `/api/drivers` routes
**Files:** `app/api/drivers/route.ts`, `app/api/drivers/[id]/route.ts`

```typescript
// Filter: user.role = "driver" HOẶC users thuộc account
// Lưu ý: "driver" là role="driver" trong bảng users
// Nhưng cần filter thêm: chỉ drivers thuộc account hiện tại
```

**Acceptance criteria:**
- [ ] GET /api/drivers → chỉ trả drivers thuộc account
- [ ] POST /api/drivers → tạo driver thuộc account
- [ ] PUT/DELETE → chỉ thao tác trên drivers thuộc account

---

### API-03: Bảo vệ `/api/customers` routes
**Files:** `app/api/customers/route.ts`, `app/api/customers/[id]/route.ts`

**Acceptance criteria:**
- [ ] GET /api/customers → chỉ trả customers thuộc account
- [ ] POST → tạo customer thuộc account
- [ ] PUT/DELETE → chỉ thao tác trên customers thuộc account

---

### API-04: Bảo vệ `/api/notifications` routes
**Files:** `app/api/notifications/route.ts`

```typescript
// Hiện tại đã đọc x-user-id từ headers
// Cần thêm: x-account-id header và filter theo accountId
// Notification đã có userId → cần thêm accountId filter
```

**Acceptance criteria:**
- [ ] GET /api/notifications → chỉ notifications của users thuộc account
- [ ] Auth check được thêm

---

### API-05: Bảo vệ `/api/trip-statuses`, `/api/formulas`, `/api/system-settings`
**Files:** `app/api/trip-statuses/route.ts`, `app/api/formulas/route.ts`, `app/api/system-settings/route.ts`

**Acceptance criteria:**
- [ ] Routes trả về data thuộc account (nullable accountId = shared)
- [ ] GET params cho phép filter `?accountId=me` vs `?accountId=all`

---

### API-06: Bảo vệ notification creation routes
**Files:** `app/api/notifications/create-*/route.ts`

**Acceptance criteria:**
- [ ] Tất cả notification creation routes có auth check
- [ ] Notification được tạo với đúng accountId

---

### API-07: Bảo vệ push notification routes
**Files:** `app/api/push/*/route.ts`

**Acceptance criteria:**
- [ ] Push subscription routes có auth check
- [ ] Subscriptions được tạo/update cho user thuộc account

---

### API-08: Audit tất cả API routes — đảm bảo không có blind spots
**Task:** Manual review tất cả `app/api/**/*.ts` files

```bash
# Script để kiểm tra: tìm tất cả prisma query không có accountId filter
rg "prisma\.(user|trip|customer|booking|notification)\.(findMany|findFirst|update|delete)" app/api/
```

**Acceptance criteria:**
- [ ] Không có Prisma query nào trong API routes bypass tenant filter
- [ ] Document danh sách các blind spots (nếu có) và cách xử lý

---

## Group E: Dashboard Pages

### PA-01: Cập nhật `/dashboard/schedule` page
**File:** `app/dashboard/schedule/page.tsx`

```typescript
export default async function SchedulePage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");
  
  const accountId = session.accountId;  // ← THÊM
  const db = createTenantPrisma(prisma, accountId);
  
  const trips = await db.trip.findMany({
    include: { driver: true, customers: true },
    orderBy: { departureTime: "desc" },
  });
  // ...
}
```

**Acceptance criteria:**
- [ ] Chỉ hiển thị trips thuộc account hiện tại
- [ ] Drivers dropdown chỉ show drivers thuộc account

---

### PA-02: Cập nhật `/dashboard/schedule/add` page
**File:** `app/dashboard/schedule/add/page.tsx`

```typescript
// Drivers list cần filter theo accountId
const drivers = await db.user.findMany({
  where: { role: "driver", accountId },
});
```

**Acceptance criteria:**
- [ ] Driver dropdown chỉ show drivers thuộc account
- [ ] Trip được tạo với đúng accountId

---

### PA-03: Cập nhật `/dashboard/drivers` page
**File:** `app/dashboard/drivers/page.tsx`

```typescript
// Chỉ hiển thị users có role="driver" thuộc account
const drivers = await db.user.findMany({
  where: { role: "driver", accountId },
});
```

**Acceptance criteria:**
- [ ] Driver list chỉ show drivers thuộc account

---

### PA-04: Cập nhật `/dashboard/reports` page
**File:** `app/dashboard/reports/page.tsx`

```typescript
// Tất cả aggregate queries cần accountId filter
const trips = await db.trip.findMany({ where: { accountId } });
const customers = await db.customer.findMany({ where: { accountId } });
```

**Acceptance criteria:**
- [ ] Reports chỉ hiển thị data thuộc account

---

### PA-05: Cập nhật `/dashboard/analytics` page
**File:** `app/dashboard/analytics/page.tsx`

**Acceptance criteria:**
- [ ] Analytics chỉ hiển thị data thuộc account

---

## Group F: Client Components

### CL-01: Truyền `accountId` vào `schedule-list.tsx`
**File:** `components/schedule-list.tsx` (2064 lines — file lớn nhất)

```typescript
// Thêm prop vào component
interface ScheduleListProps {
  accountId: number;  // ← THÊM
  // ... existing props ...
}

// Client fetch calls cần include header
const res = await fetch(`/api/trips?${params}`, {
  headers: {
    "x-account-id": String(accountId),  // ← THÊM
    // ... existing headers ...
  },
});
```

**Acceptance criteria:**
- [ ] `accountId` được truyền vào component
- [ ] Tất cả API fetch calls gửi `x-account-id` header
- [ ] Schedule list chỉ hiển thị trips của account

---

### CL-02: Truyền `accountId` vào `driver-list.tsx`
**File:** `components/driver-list.tsx`

**Acceptance criteria:**
- [ ] Driver list chỉ hiển thị drivers thuộc account
- [ ] API calls gửi `x-account-id` header

---

### CL-03: Cập nhật `header.tsx` — notification bell
**File:** `components/dashboard/header.tsx`

```typescript
// Notification bell fetch cần accountId
const notifRes = await fetch(`/api/notifications?unread=true`, {
  headers: {
    "x-account-id": String(accountId),  // ← THÊM
    // ...
  },
});
```

**Acceptance criteria:**
- [ ] Notification bell chỉ hiển thị notifications thuộc account
- [ ] User menu hiển thị đúng user thuộc account

---

### CL-04: Cập nhật `dashboard/layout.tsx` — inject tenant context
**File:** `app/dashboard/layout.tsx` (tạo mới hoặc sửa nếu có)

```typescript
export default async function DashboardLayout({ children }) {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");
  
  return (
    <TenantProvider accountId={session.accountId}>
      {/* existing dashboard layout */}
    </TenantProvider>
  );
}
```

**Acceptance criteria:**
- [ ] TenantProvider wrap toàn bộ dashboard
- [ ] Tất cả client components có thể đọc `accountId` từ context

---

## Group G: Data Migration

### MG-01: Tạo default account và migrate existing data
**File:** `scripts/migrate-to-multiaccount.ts` (tạo mới)

```typescript
// scripts/migrate-to-multiaccount.ts
async function migrate() {
  // 1. Tạo default account
  const account = await prisma.account.create({
    data: { name: "Default Organization", slug: "default" },
  });
  
  // 2. UPDATE all tables set accountId = account.id
  await prisma.user.updateMany({ where: {}, data: { accountId: account.id } });
  await prisma.trip.updateMany({ where: {}, data: { accountId: account.id } });
  await prisma.customer.updateMany({ where: {}, data: { accountId: account.id } });
  // ... Tier-2, Tier-3
  
  // 3. Verify no null accountId
  const nullUsers = await prisma.user.findMany({ where: { accountId: null } });
  if (nullUsers.length > 0) throw new Error("Migration incomplete!");
  
  console.log("Migration complete!");
}
```

**Acceptance criteria:**
- [ ] Script tạo được default account
- [ ] Script migrate tất cả existing data
- [ ] Không có row nào có accountId = null sau migration

---

### MG-02: Backup database trước migration
**Task:** Hướng dẫn backup qua Neon dashboard hoặc pg_dump

```bash
# Neon: export via dashboard hoặc
pg_dump $DATABASE_URL > backup_pre_multiaccount.sql
```

**Acceptance criteria:**
- [ ] Database backup được tạo trước khi migrate
- [ ] Backup verified (test restore trên staging nếu có)

---

### MG-03: Thêm NOT NULL constraint sau migration
**File:** `prisma/schema.prisma` (update sau khi migration xong)

```prisma
// Sau khi tất cả data có accountId:
// User: accountId Int @map("account_id")  // ← thêm @db.VarChar NOT NULL nếu cần
// Các bảng Tier-2, Tier-3: giữ nullable hoặc thêm @default(default_account_id)
```

**Acceptance criteria:**
- [ ] Migrations thêm NOT NULL constraint thành công
- [ ] Prisma schema sync với database

---

### MG-04: Verify Prisma schema matches database
**Task:**

```bash
npx prisma db pull
npx prisma generate
```

**Acceptance criteria:**
- [ ] `prisma db pull` không có drift giữa schema và database
- [ ] `prisma generate` thành công

---

## Group H: Verification

### VF-01: Test login flow — JWT chứa accountId
**Task:** Login → decode cookie → verify `accountId` tồn tại

```bash
# Login via browser or curl, then decode JWT
node -e "const { decrypt } = require('./lib/jwt'); decrypt('cookie_value').then(console.log)"
```

**Acceptance criteria:**
- [ ] JWT payload có `accountId` field
- [ ] `accountId` khớp với user.accountId trong database

---

### VF-02: Test data isolation — account A không thấy data account B
**Task:** Manual test hoặc viết test script

```typescript
// Test: Login với user thuộc account A
// GET /api/trips → verify không có trips tạo bởi account B
// 
// Login với user thuộc account B  
// GET /api/trips → verify không có trips tạo bởi account A
```

**Acceptance criteria:**
- [ ] Account A không thể đọc/update/delete data của account B
- [ ] API trả 404 (không phải empty array) cho data không thuộc account

---

### VF-03: Test CRUD operations — create/read/update/delete
**Task:** Smoke test tất cả CRUD flows

| Operation | Expected |
|---|---|
| Tạo trip | Trip có đúng accountId, visible trong list |
| Đọc trip | Chỉ trips thuộc account |
| Cập nhật trip | Chỉ update được trip thuộc account |
| Xóa trip | Chỉ xóa được trip thuộc account |
| Tạo driver | Driver có đúng accountId |
| Tạo customer | Customer có đúng accountId |

**Acceptance criteria:**
- [ ] Tất cả CRUD operations hoạt động đúng
- [ ] Không có unexpected side effects

---

### VF-04: Test registration — tạo account mới
**Task:** Đăng ký user mới → verify account + user được tạo

**Acceptance criteria:**
- [ ] Register tạo account riêng
- [ ] User mới login → chỉ thấy data trong account của mình
- [ ] Không thấy data từ default account hoặc account khác

---

### VF-05: Regression test — existing functionality không break
**Task:** Manual smoke test các flows hiện có

| Feature | Verify |
|---|---|
| Login | Đăng nhập thành công với user hiện có |
| Schedule list | Hiển thị đúng trips (giờ là tất cả trips) |
| Add trip | Tạo trip thành công |
| Driver management | CRUD drivers hoạt động |
| Notifications | Bell icon hoạt động |
| Settings pages | System settings, formulas load đúng |

**Acceptance criteria:**
- [ ] Không có regression trong features hiện có
- [ ] Existing users (sau migration) không bị logout hoặc mất data
