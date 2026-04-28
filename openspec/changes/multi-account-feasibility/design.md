# DESIGN: Kiến Trúc Đa Tài Khoản — Phân Tích Chi Tiết

## 1. Executive Summary

### Câu trả lời trực tiếp

**Khả thi không?** ✅ **CÓ — Khả thi 100%**, nhưng đòi hỏi thay đổi trên diện rộng vì codebase hiện tại hoàn toàn không có khái niệm tenant isolation.

**Dễ dàng không?** ❌ **KHÔNG — Nỗ lực ước tính ước: ~40-60 giờ** (Medium-High effort). Đây không phải là "thêm một tính năng nhỏ" mà là **refactor kiến trúc hệ thống**.

**Lý do chính:**
- 0 → 1: Phải thêm `accountId` vào 13 bảng
- 0 → N: Phải sửa ~20 API route handlers
- 0 → N: Phải sửa ~10 dashboard pages
- 0 → 1: Phải xây dựng middleware / context layer để inject accountId
- 0 → 1: Phải migrate dữ liệu hiện có vào default account
- Nhiều API hiện tại không có auth check — phải thêm toàn bộ

---

## 2. So Sánh 3 Phương Án Kiến Trúc

### Option A: Shared Database + Row-Level Tenant ID (Recommended ⭐)

```
┌─────────────────────────────────────────────────────┐
│              PostgreSQL (Neon)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ accounts (id, name, created_at)              │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │ 1:N                          │
│  ┌──────────────────▼───────────────────────────┐  │
│  │ users (id, accountId, email, role, ...)      │  │
│  │ trips (id, accountId, driverId, ...)         │  │
│  │ customers (id, accountId, phone, ...)        │  │
│  │ notifications (id, accountId, userId, ...)    │  │
│  │ ... (tất cả bảng có accountId)               │  │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Cách hoạt động:**
- Thêm bảng `accounts` (hoặc dùng User làm account root)
- Thêm `accountId` vào mọi bảng business data
- Prisma Client Extension tự động inject `accountId` vào mọi query
- JWT chứa `accountId`, được đọc ở mọi nơi cần data

**Điểm mạnh:**
- ✅ Đơn giản nhất trong 3 phương án
- ✅ Migration đơn giản, dùng chung database
- ✅ Dễ backup/restore toàn bộ dữ liệu
- ✅ Dễ query cross-account nếu cần (reporting)
- ✅ Prisma ORM hỗ trợ tốt — thêm field là xong
- ✅ Chi phí infra thấp (1 database duy nhất)
- ✅ Prisma Client Extension giảm boilerplate đáng kể

**Điểm yếu:**
- ⚠️ Risk data leak nếu dev quên filter `accountId` (dùng extension giảm thiểu)
- ⚠️ Cần thêm index trên `accountId` để tránh slow queries
- ⚠️ Shared resource → cần quản lý connection pool cẩn thận hơn

---

### Option B: Separate Database per Account

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Account A DB   │  │   Account B DB   │  │   Account C DB   │
│  ┌────────────┐  │  │  ┌────────────┐  │  │  ┌────────────┐  │
│  │  users    │  │  │  │  users     │  │  │  │  users    │  │
│  │  trips    │  │  │  │  trips     │  │  │  │  trips    │  │
│  │ customers │  │  │  │ customers  │  │  │  │ customers │  │
│  └────────────┘  │  │  └────────────┘  │  │  └────────────┘  │
│  DATABASE_URL_A  │  │  DATABASE_URL_B  │  │  DATABASE_URL_C  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Cách hoạt động:**
- Mỗi account có database riêng trên Neon (hoặc schema riêng trong 1 database)
- Connection routing theo accountId từ JWT
- Schema giống hệt nhau, dùng chung Prisma schema file

**Điểm mạnh:**
- ✅ Isolation hoàn toàn — không thể leak data giữa các account
- ✅ Dễ delete/reset entire account
- ✅ Backup/restore per account độc lập

**Điểm yếu:**
- ⚠️ Migration phức tạp — phải chạy migration cho mỗi database khi schema đổi
- ⚠️ Quản lý nhiều database connection strings
- ⚠️ Không thể query cross-account (reporting, analytics)
- ⚠️ Chi phí Neon: mỗi database có billing riêng
- ⚠️ Setup connection pool per account phức tạp
- ⚠️ **Không khuyến khích cho quy mô nhỏ-trung bình**

---

### Option C: PostgreSQL Row-Level Security (RLS)

```
┌──────────────────────────────────────────────────────┐
│              PostgreSQL (Neon)                      │
│                                                      │
│  CREATE POLICY tenant_isolation ON trips             │
│    USING (account_id = current_setting('app.tenant_id'));
│                                                      │
│  -- Prisma gọi: SET app.tenant_id = '123'           │
│  -- Mọi query trong session tự động bị filter       │
└──────────────────────────────────────────────────────┘
```

**Cách hoạt động:**
- PostgreSQL RLS policy ở database level
- Mỗi session đặt `app.tenant_id` = accountId hiện tại
- Database tự động filter tất cả query theo tenant

**Điểm mạnh:**
- ✅ Security ở tầng database — không thể bypass từ application
- ✅ Không cần sửa từng query trong code

**Điểm yếu:**
- ⚠️ Prisma ORM hỗ trợ RLS **rất hạn chế** — Prisma Client không tự động set session variables
- ⚠️ Phức tạp khi setup và maintain
- ⚠️ Khó debug (RLS policy errors khó đọc)
- ⚠️ Cần raw SQL hoặc Prisma `$queryRaw` thay vì ORM methods
- ⚠️ **Không khuyến khích với Prisma + Next.js**

---

## 3. Recommended Architecture: Option A — Chi Tiết

### 3.1 Database Design

**Thêm bảng `Account`:**

```prisma
model Account {
  id        Int       @id @default(autoincrement())
  name      String    @db.VarChar(255)  // Tên công ty/tổ chức
  slug      String    @unique @db.VarChar(100)  // subdomain-friendly
  settings  Json?     // Logo, màu sắc, etc.
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  
  users     User[]
  trips     Trip[]
  customers Customer[]
  
  @@map("accounts")
}
```

**Sửa `User`:**

```prisma
model User {
  // ... existing fields ...
  
  accountId Int     @map("account_id")
  account   Account @relation(fields: [accountId], references: [id])
  
  @@index([accountId], name: "idx_users_account")
}
```

**Sửa các bảng còn lại** thêm `accountId Int @map("account_id")` + relation + index.

**Quyết định quan trọng — User có thuộc nhiều account?**

→ **Bắt đầu với: 1 User = 1 Account (đơn giản nhất)**
→ Sau đó nâng cấp lên Many-to-Many nếu cần (thêm `AccountMembership`)

### 3.2 Authentication Design

**JWT Payload mới:**

```typescript
interface UserPayload {
  id: number;
  email: string;
  fullName: string;
  role: "admin" | "user" | "driver";
  passwordVersion: number;
  accountId: number;  // ← THÊM MỚI
}
```

**Account resolution flow:**

```
1. User login với email/password
2. Lấy user từ DB → extract accountId
3. Tạo JWT với accountId
4. Gửi cookie về client
5. Mọi request sau: đọc accountId từ JWT → filter data
```

**Multi-account scenario (future):** Khi user có thể thuộc nhiều account, JWT cần chứa `accountId` hiện tại. User có thể switch account từ UI.

### 3.3 Prisma Client Extension — Auto-Tenant

**Key architectural decision:** Dùng **Prisma Client Extension** để tự động inject `accountId` vào mọi query.

```typescript
// lib/prisma-tenant.ts
import { Prisma } from "@prisma/client";

export function createTenantPrisma(prisma: PrismaClient, accountId: number) {
  return prisma.$extends({
    model: {
      $allModels: {
        async findMany(args, ...rest) {
          return this.findMany({ ...args, where: { ...args.where, accountId } }, ...rest);
        },
        async findFirst(args, ...rest) {
          return this.findFirst({ ...args, where: { ...args.where, accountId } }, ...rest);
        },
        async findUnique(args, ...rest) {
          // findUnique dùng composite key (id + accountId)
          return this.findUnique({ ...args, ...rest });
        },
        async create(args, ...rest) {
          return this.create({ ...args, data: { ...args.data, accountId } }, ...rest);
        },
        async update(args, ...rest) {
          return this.update({ ...args, where: { ...args.where, accountId } }, ...rest);
        },
        async delete(args, ...rest) {
          return this.delete({ ...args, where: { ...args.where, accountId } }, ...rest);
        },
        // ... count, updateMany, deleteMany, aggregate
      },
    },
  });
}
```

**Sử dụng trong API routes:**

```typescript
// app/api/trips/route.ts
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = createTenantPrisma(prisma, session.accountId);
  const trips = await db.trip.findMany({  // ← Không cần tự thêm where accountId!
    include: { driver: true, customers: true },
    orderBy: { departureTime: "desc" },
  });
  
  return Response.json({ success: true, data: trips });
}
```

### 3.4 Middleware Pattern (Optional Enhancement)

Tạo `middleware.ts` để auth-guard tất cả `/dashboard/*` routes thay vì check trong từng Server Component:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  const payload = await decrypt(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  // Inject account info vào headers cho downstream
  const headers = new Headers(request.headers);
  headers.set("x-user-id", String(payload.id));
  headers.set("x-account-id", String(payload.accountId));
  headers.set("x-user-role", payload.role);
  
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

---

## 4. Effort Estimation (Ước Lượng Công Việc)

### Theo Phase

| Phase | Task | Effort | Ghi chú |
|---|---|---|---|
| 1 | Database: Thêm bảng Account + accountId vào 13 bảng | ~4h | Prisma migration + seeding default account |
| 2 | Auth: Cập nhật JWT payload + login/register flow | ~3h | Thêm accountId vào session, account creation |
| 3 | Prisma Extension: Tạo tenant-aware Prisma client | ~6h | Core architecture — quan trọng nhất |
| 4 | API Routes: Thêm auth + accountId filter vào ~20 routes | ~10h | Auth check + Prisma extension usage |
| 5 | Dashboard Pages: Cập nhật ~10 Server Components | ~4h | Đọc accountId từ session |
| 6 | Client Components: Truyền accountId context | ~3h | schedule-list, driver-list, header |
| 7 | Migration: Migrate existing data → default account | ~2h | One-time data migration |
| 8 | Testing: Smoke test tất cả flows | ~4h | Login, CRUD, data isolation |
| **Tổng** | | **~36 giờ** | Trung bình, có thể ±50% tùy dev |

### Theo Mức Độ Phức Tạp

| Component | Files | Effort | Notes |
|---|---|---|---|
| Prisma Schema | 1 | Medium | Thêm accountId, relations, indexes |
| Auth Layer | 2-3 | Low | Cập nhật JWT, login, register |
| Prisma Extension | 1 | High | Core abstraction — cần design cẩn thận |
| API Routes | ~20 | High | Pattern đồng nhất nhưng nhiều files |
| Dashboard Pages | ~10 | Medium | Auth guard + session reading |
| Client Components | ~5 | Medium | Prop drilling hoặc context |
| Data Migration | 1 script | Low | One-time run |

### Risk Areas (Những Vị Trí Dễ Bug Nhất)

1. **Prisma Extension edge cases** — `findUnique`, `update`, `delete` cần composite key `(id, accountId)` thay vì chỉ `id`. Nếu không cẩn thận có thể cross-account access.
2. **API routes quên filter** — Cần audit tất cả API routes để đảm bảo không có route nào bypass tenant filter.
3. **Dashboard SSR** — Server Components fetch data server-side, cần đảm bảo accountId được truyền đúng vào Prisma extension.
4. **Client-side fetch** — Client components gọi API với `x-account-id` header, cần đảm bảo header luôn được set.
5. **Foreign key cascades** — Khi xóa account, cần cascade xóa tất cả related data.

---

## 5. Decision Matrix

| Tiêu chí | Option A (Shared DB) | Option B (Separate DB) | Option C (RLS) |
|---|---|---|---|
| Độ phức tạp setup | ⭐⭐ (Medium) | ⭐⭐⭐⭐ (Very High) | ⭐⭐⭐⭐ (Very High) |
| Effort ước tính | ~36h | ~80h+ | ~60h+ |
| Dễ maintain | ⭐⭐⭐⭐ (Easy) | ⭐⭐ (Hard) | ⭐⭐ (Hard) |
| Prisma compatibility | ⭐⭐⭐⭐⭐ (Native) | ⭐⭐⭐ (OK) | ⭐ (Poor) |
| Migration effort | ⭐⭐ (Medium) | ⭐⭐⭐⭐⭐ (Very High) | ⭐⭐⭐⭐ (High) |
| Chi phí infra | ⭐⭐⭐⭐ (Low) | ⭐⭐ (High) | ⭐⭐⭐⭐ (Low) |
| Security isolation | ⭐⭐⭐ (Good) | ⭐⭐⭐⭐⭐ (Best) | ⭐⭐⭐⭐⭐ (Best) |
| Cross-account queries | ⭐⭐⭐⭐⭐ (Easy) | ⭐ (Impossible) | ⭐⭐⭐ (OK) |
| **Recommendation** | ✅ **CHỌN** | ❌ Không | ❌ Không |
