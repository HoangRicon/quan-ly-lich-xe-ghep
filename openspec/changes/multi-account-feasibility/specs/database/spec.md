# SPECS: Đán Giá Khả Năng Nâng Cấp Đa Tài Khoản

## Domain 1: Database Schema

### SPEC-001: Current Schema Analysis

**Tình trạng hiện tại:**

App hiện tại có 13 bảng trong PostgreSQL, hoạt động theo mô hình **single-tenant** (tất cả người dùng chia sẻ chung dữ liệu). Không có khái niệm `accountId`, `tenantId`, hay `organizationId` ở bất kỳ đâu trong schema.

| Bảng | records có `accountId`? | Isolation level hiện tại |
|---|---|---|
| `users` | Không | Global — mọi user thuộc 1 pool |
| `trips` | Không (chỉ có `driverId`, `createdById`) | Global — tất cả trips chia sẻ |
| `bookings` | Không | Global |
| `customers` | Không | Global — tất cả KH chia sẻ |
| `trip_customers` | Không | Global |
| `push_subscriptions` | Không (chỉ có `userId`) | Global |
| `notifications` | Không (chỉ có `userId`) | Per-user — chỉ notification của mình |
| `user_settings` | Không (chỉ có `userId` 1-1) | Per-user — tự nhiên đã tách |
| `system_settings` | Không | Global — chia sẻ toàn cục |
| `trip_statuses` | Không | Global — có thể chia sẻ hợp lý |
| `email_templates` | Không | Global — có thể chia sẻ hợp lý |
| `pricing_formulas` | Không | Global — có thể chia sẻ hoặc per-account |
| `password_resets` | Không (chỉ có `email`) | Global |

**Đặc điểm quan trọng:**
- `createdById` trên `Trip` đã được ghi nhận nhưng **không bao giờ được dùng** để filter dữ liệu trả về
- `userId` trên `Notification` đã cho phép filter per-user — nhưng API `/api/notifications` vẫn đọc user từ header, không từ session
- `UserSettings` đã ở dạng 1-1 với User — tự nhiên per-user
- `PricingFormula` có thể muốn chia sẻ giữa các account hoặc per-account tùy nhu cầu

---

### SPEC-002: Required Schema Changes by Model

**Tier 1 — Bắt buộc phải có `accountId` (core business data):**

```
User        → accountId (required)
Trip        → accountId (required)
Customer    → accountId (required)
TripCustomer → accountId (required, dẫn xuất từ Trip)
Booking     → accountId (required, dẫn xuất từ Trip)
```

**Tier 2 — Nên có `accountId` (user-preference / notification data):**

```
Notification       → accountId (required, dẫn xuất từ User)
PushSubscription   → accountId (required, dẫn xuất từ User)
UserSettings       → accountId (required, dẫn xuất từ User)
```

**Tier 3 — Có thể giữ shared hoặc thêm `accountId` tùy chiến lược:**

```
SystemSettings     → accountId (nullable: null = global, có value = per-account override)
TripStatus         → accountId (nullable: null = shared, có value = per-account)
EmailTemplate      → accountId (nullable: null = shared, có value = per-account)
PricingFormula     → accountId (nullable: null = shared, có value = per-account)
PasswordReset      → accountId (nullable: null = global, có value = per-account)
```

**Note quan trọng:** Không cần thêm bảng `Account` riêng ngay — có thể dùng chính `User` có role="admin" làm root của mỗi account. Việc tách `Account` model là optional optimization.

---

## Domain 2: Authentication & Authorization

### SPEC-003: Auth Flow Changes Required

**Hiện tại:**

JWT payload = `{ id, email, fullName, role, passwordVersion }`

Session được tạo khi login và lưu trong `httpOnly` cookie `session`. Mỗi user có 1 record trong `users`.

**Cần thay đổi:**

```
JWT payload → { id, email, fullName, role, passwordVersion, accountId }
```

- Thêm `accountId` vào JWT payload — mọi API route handler có thể đọc từ session
- Server Component pages cần đọc `accountId` từ `getSessionFromCookie()` và truyền xuống
- Client-side fetch cần gửi `x-account-id` header

**Auth flow scenarios:**

| Scenario | Xử lý |
|---|---|
| Login → tạo session | JWT chứa accountId |
| User thuộc nhiều account | Cần thêm bảng `AccountMembership` (user có thể thuộc nhiều account với vai trò khác nhau) |
| Chưa login / session hết hạn | Redirect /login như hiện tại |
| User cố truy cập data của account khác | API trả 403 Unauthorized |

**Câu hỏi decision point:** User có thể thuộc nhiều account không?

- **Nếu CÓ (Many-to-Many):** Cần bảng trung gian `AccountMembership { userId, accountId, role, joinedAt }`
- **Nếa KHÔNG (One-to-Many):** Mỗi user chỉ thuộc 1 account → `User.accountId` (1-1 hoặc 1-n)
- **Recommendation:** Bắt đầu với **1 user = 1 account** (đơn giản nhất), sau đó nâng cấp lên many-to-many nếu cần

---

### SPEC-004: API Authorization Pattern

**Hiện tại:** Hầu hết API routes **không có auth check**.

```typescript
// Hiện tại — API trả TẤT CẢ trips
export async function GET(request: Request) {
  const trips = await prisma.trip.findMany({ ... }); // Không filter theo account
  return Response.json({ success: true, data: trips });
}
```

**Cần thay đổi thành:**

```typescript
// Tương lai — API chỉ trả trips của account hiện tại
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  
  const accountId = session.accountId; // ← THÊM MỚI
  const trips = await prisma.trip.findMany({
    where: { accountId }, // ← THÊM MỚI
    ...
  });
  return Response.json({ success: true, data: trips });
}
```

**Pattern thống nhất cho tất cả API:**

```typescript
// Pattern A: Middleware-style helper
async function getAccountId(request: Request): Promise<number | null> {
  const session = await getSession(request);
  return session?.accountId ?? null;
}

// Pattern B: Utility Prisma client với auto-tenant
// Tạo prisma client wrapper chứa accountId context
// Tất cả query dùng context này tự động thêm WHERE accountId = ?
```

**Recommendation:** Pattern B (Prisma middleware / extensions) là cleanest approach — dùng Prisma Client Extensions để tự động inject `accountId` vào mọi query mà không cần sửa từng API route.

---

## Domain 3: API Routes Inventory

### SPEC-005: API Routes Requiring Changes

| API Route | GET | POST | PUT | DELETE | Auth cần thêm? | Data filter cần thêm? |
|---|---|---|---|---|---|---|
| `/api/auth/login` | | ✅ | | | Không | Không |
| `/api/auth/logout` | | | | ✅ | Không | Không |
| `/api/auth/session` | ✅ | | | | Cập nhật JWT | Không |
| `/api/auth/register` | | ✅ | | | Không | Thêm account creation |
| `/api/auth/profile` | ✅ | | ✅ | | ✅ | ✅ accountId filter |
| `/api/auth/change-password` | | ✅ | | | ✅ | Không |
| `/api/auth/forgot-password` | | ✅ | | | Không | Không |
| `/api/auth/reset-password` | | ✅ | | | Không | Không |
| `/api/trips` | ✅ | ✅ | | | ✅ | ✅ accountId |
| `/api/trips/[id]` | ✅ | | ✅ | ✅ | ✅ | ✅ accountId |
| `/api/drivers` | ✅ | ✅ | | | ✅ | ✅ accountId + role filter |
| `/api/drivers/[id]` | ✅ | | ✅ | ✅ | ✅ | ✅ accountId |
| `/api/customers` | ✅ | ✅ | | | ✅ | ✅ accountId |
| `/api/customers/[id]` | ✅ | | ✅ | ✅ | ✅ | ✅ accountId |
| `/api/notifications` | ✅ | | | | ✅ | ✅ accountId |
| `/api/trip-statuses` | ✅ | | | | ✅ | ✅ accountId (nullable) |
| `/api/formulas` | ✅ | | | | ✅ | ✅ accountId (nullable) |
| `/api/system-settings` | ✅ | | | | ✅ | ✅ accountId (nullable) |
| `/api/notifications/create-*` | | ✅ | | | ✅ | ✅ accountId |
| `/api/push/*` | Varies | | | | ✅ | ✅ accountId |

**Summary:** ~20 API route files cần thay đổi, trong đó:
- ~4 route chỉ cần cập nhật JWT payload
- ~2 route cần thêm logic account creation (register, login)
- ~14 route cần thêm auth check + accountId filter

---

## Domain 4: Pages & Components

### SPEC-006: Dashboard Pages Requiring Changes

**Server Components (auth guard):**

| Page | Auth check cần thêm | accountId từ session | Data fetch cần filter |
|---|---|---|---|
| `/dashboard/schedule` | ✅ (có) | ✅ cần thêm | ✅ trips.filter by accountId |
| `/dashboard/schedule/add` | ✅ (có) | ✅ cần thêm | ✅ drivers.filter by accountId |
| `/dashboard/drivers` | ✅ (có) | ✅ cần thêm | ✅ users.filter by accountId + role |
| `/dashboard/drivers/add` | ✅ (có) | ✅ cần thêm | Không |
| `/dashboard/drivers/[id]/edit` | ✅ (có) | ✅ cần thêm | ✅ driver by accountId |
| `/dashboard/reports` | ✅ (có) | ✅ cần thêm | ✅ all data by accountId |
| `/dashboard/analytics` | ✅ (có) | ✅ cần thêm | ✅ all data by accountId |
| `/dashboard/profile` | ✅ (có) | ✅ cần thêm | ✅ profile by accountId |
| `/dashboard/settings` | ✅ (có) | ✅ cần thêm | ✅ settings by accountId |
| `/dashboard/notifications` | ✅ (có) | ✅ cần thêm | ✅ notifications by accountId |

**Client Components (API calls):**

| Component | Client fetch cần thêm header | accountId context |
|---|---|---|
| `schedule-list.tsx` | ✅ x-account-id | ✅ đọc từ props hoặc context |
| `driver-list.tsx` | ✅ x-account-id | ✅ đọc từ props |
| `trip-form.tsx` | ✅ x-account-id | ✅ đọc từ props |
| `notification-bell.tsx` | ✅ x-account-id | ✅ đọc từ props |
| `header.tsx` | ✅ (notifications, user menu) | ✅ đọc từ props |

**Note quan trọng:** Hiện tại `schedule-list.tsx` (2064 lines) là component lớn nhất — nó fetch data từ API và hiển thị. Cần đảm bảo accountId được truyền vào và filter đúng.

---

## Domain 5: Data Migration Strategy

### SPEC-007: Migration Plan for Existing Data

Khi thêm `accountId` vào schema, dữ liệu hiện có cần được migrate vào một **default account**.

**Migration steps:**

1. Tạo bảng `accounts` (hoặc dùng `User` có role="admin" làm account root)
2. Tạo 1 record account mặc định (id=1, name="Default Account")
3. Tạo migration thêm `accountId` vào các bảng (nullable → required sau migration)
4. Chạy migration script: UPDATE all existing rows SET accountId = 1
5. Thêm NOT NULL constraint
6. Thêm index trên `accountId`
7. Verify không có row nào có accountId = null

**Lưu ý:**
- Migration cần chạy với downtime tối thiểu (dùng `pg` transaction)
- Backup database TRƯỚC KHI migrate
- Test migration trên staging trước

---

## Domain 6: Boundary Analysis — Không Cần Thay Đổi

Những phần sau **không cần thay đổi** khi nâng cấp:

| Phần | Lý do |
|---|---|
| `lib/prisma.ts` | Connection pool không đổi; chỉ cần wrapper extensions |
| `lib/jwt.ts` | Chỉ cần thêm field vào payload |
| `lib/email.ts` | Không liên quan đến data isolation |
| `lib/formula-engine.ts` | Logic tính điểm không thay đổi |
| `public/` assets | Không thay đổi |
| `tailwind.config.*` | Không thay đổi |
| `next.config.ts` | Không thay đổi |
| `components/ui/*` | Library components, không thay đổi |
