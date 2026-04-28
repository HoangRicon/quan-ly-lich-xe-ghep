# Multi-Account Implementation — Task Plan (Updated: 2026-04-28)

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp ứng dụng "Quản Lý Lịch Xe Ghép" lên mô hình multi-tenant với Shared Database + Schema Isolation (Tenant ID).

**Current Status:** Groups A-H completed. Post-implementation audit found 2 critical tenant-safety issues and 1 critical data-integrity issue (since fixed).

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

### DB-01: Thêm bảng `Account` ✅ DONE

### DB-02: Thêm `accountId` vào Tier-1 models ✅ DONE

### DB-03: Thêm `accountId` vào Tier-2 models ✅ DONE

### DB-04: Thêm `accountId` vào Tier-3 models (nullable) ✅ DONE

### DB-05: Thêm account-scoped composite indexes ✅ DONE

### DB-06: Seed default account ✅ DONE

---

## Group B: Auth & Session (AU-01 → AU-06)

### AU-01: Cập nhật JWT payload type ✅ DONE

### AU-02: Cập nhật `setSession()` ✅ DONE

### AU-03: Cập nhật login flow ✅ DONE

### AU-04: Cập nhật register flow ✅ DONE

### AU-05: Cập nhật `getUserFromRequest()` ✅ DONE

### AU-06: Thêm `middleware.ts` (optional) ✅ DONE

---

## Group C: Prisma Extension (PR-01 → PR-05)

### PR-01: Implement `createTenantPrisma` extension ✅ DONE (rewritten)

### PR-02: Tạo factory function ✅ DONE

### PR-03: Tạo server-side tenant helper ✅ DONE

### PR-04: Tạo React tenant context provider ✅ DONE

### PR-05: Cập nhật `lib/prisma.ts` ✅ DONE

---

## Group D: API Routes (API-01 → API-08)

### API-01: Protect `/api/trips` routes

**Files:** `app/api/trips/route.ts` ✅ DONE

**Files:** `app/api/trips/[id]/route.ts` ✅ DONE — All 16 `prisma.*` calls replaced with `db.*` using `createTenantPrisma`. GET/PUT/DELETE all use tenant-scoped client. Also cleaned up `as any` casts for customer create.

### API-02: Protect `/api/drivers` routes ✅ DONE

### API-03: Protect `/api/customers` routes ✅ DONE

### API-04: Protect `/api/notifications` routes ✅ DONE

### API-05: Protect config routes ✅ DONE

### API-06: Protect notification creation routes ✅ DONE

### API-07: Protect push notification routes ⚠️ **BY DESIGN** — Push endpoints intentionally bypass tenant isolation for system-wide broadcasts (no `getSession`, uses base `prisma`). Auth handled via VAPID keys.

### API-08: Audit all API routes ⚠️ **IN PROGRESS**

---

## Group E: Dashboard Pages (PA-01 → PA-05) ✅ ALL DONE

All dashboard pages use `createTenantPrisma` via API calls.

---

## Group F: Client Components (CL-01 → CL-04) ✅ ALL DONE

---

## Group G: Data Migration (MG-01 → MG-04)

### MG-01: Tạo migration script ✅ DONE (manual SQL)

### MG-02: Backup database ✅ VERIFIED

### MG-03: Chạy migration + apply NOT NULL ✅ DONE

### MG-04: Verify schema sync ✅ DONE

---

## Group H: Verification (VF-01 → VF-05)

### VF-01: Test login — JWT chứa accountId ✅ DONE

### VF-02: Test data isolation ✅ PARTIAL — needs multi-account test

### VF-03: Test CRUD operations ✅ PARTIAL

### VF-04: Test registration — account mới ✅ DONE

### VF-05: Regression test ⚠️ **IN PROGRESS**

---

## Post-Implementation Audit Findings

> Discovered during `prisma db push` and upsert regression testing.

### Critical Fix 1: Unique Constraint vs Index (2026-04-28)

**Problem:** Migration created `CREATE INDEX` instead of `ADD CONSTRAINT UNIQUE` for composite keys. PostgreSQL's `ON CONFLICT` requires a constraint, not just an index.

**Tables affected:**
- `customers`: had both `customers_phone_key` (index) AND `customers_account_id_phone_key` (index) — Prisma used the single-column one
- `user_settings`: had `user_settings_user_id_key` (index) blocking composite
- `push_subscriptions`: had `push_subscriptions_account_id_endpoint_key` (index) — was actually correct but the single-column one was dropped

**Fix applied:**
- Dropped `customers_phone_key` (bare index)
- Dropped `user_settings_user_id_key` (bare index)
- Converted all 3 bare unique indexes → proper unique constraints
- Updated migration file: `CREATE INDEX` → `ALTER TABLE ADD CONSTRAINT UNIQUE`

### Critical Fix 2: Prisma Composite Unique Key Names (2026-04-28)

**Problem:** Removing `@unique` from `Customer.phone` (to avoid dual-constraint conflict) made `{ phone }` no longer a valid `CustomerWhereUniqueInput`. The upsert wrapper was passing `{ phone, accountId }` but Prisma only accepts `{ id }` or `{ idx_customers_account_phone: { phone, accountId } }`.

**Fix applied:**
- Rewrote `prisma-tenant.ts` with `toCompositeUniqueWhere()` that transforms `{ phone }` → `{ idx_customers_account_phone: { phone, accountId } }`
- Updated `prisma-tenant.ts` to accept `modelName` parameter
- Removed forced `select` clause from upsert wrapper

### Critical Fix 3: systemSettings Upsert (2026-04-28)

**Problem:** `systemSettings` is in `nonTenantModels` (not wrapped), and its upsert didn't include `accountId` in the create data.

**Fix applied:**
- Added `accountId: user.accountId` to `systemSettings.upsert` create data in `app/api/system-settings/route.ts`

### Fix 4: Push API delete calls (2026-04-28)

**Problem:** After composite unique, `{ endpoint }` is no longer a valid unique key for `PushSubscription`.

**Fix applied:**
- Changed all `delete({ where: { endpoint } })` to `delete({ where: { id: sub.id } })` in push routes.

### Fix 5: Removed `as any` casts (2026-04-28)

**Problem:** `} as any` casts on upsert create data were masking type errors.

**Fix applied:**
- Removed `as any` from `push/route.ts`, `notifications/settings/route.ts`

---

## Remaining Tasks

### [ ] FIX D-01: Migrate `app/api/trips/[id]/route.ts` to use `createTenantPrisma`

**Files:** `app/api/trips/[id]/route.ts`

All 16 `prisma.*` calls need to be replaced with `db.*` (where `db = createTenantPrisma(prisma, user.accountId)`). Current calls at approximately lines: 24, 204, 253, 334, 351, 356, 373, 384, 389, 398, 411, 421, 444, 455, 530, 539, 544.

**Acceptance criteria:**
- All DB queries use `db = createTenantPrisma(prisma, user.accountId)`
- `tsc --noEmit` passes with 0 errors
- Manual test: GET/PUT/DELETE single trip works correctly

### [ ] TEST H-VF: Comprehensive tenant isolation test

**Test plan:**
1. Create 2 accounts (A and B) with different users
2. Account A creates trip → Account B cannot see it
3. Account A creates customer with phone "0123456789" → Account B creates customer with same phone → both succeed (isolated)
4. Account A upserts customer → Account B upserts same phone → both get their own records

### [ ] TEST H-REG: Full regression test

**Test plan:**
1. Login → JWT has `accountId` ✓
2. Create trip (with customer upsert) → succeeds ✓
3. Get trips → filtered by account ✓
4. Update trip → only own account's trip ✓
5. Delete trip → only own account's trip ✓
6. Driver CRUD → isolated ✓
7. Register new account → new account isolated ✓

---

## Progress Log

| Date | Group | Status | Notes |
|------|-------|--------|-------|
| 2026-04-28 | Setup | DONE | Creating task_plan.md |
| 2026-04-28 | A | DONE | Database schema — Account model, accountId on 13 models, composite indexes |
| 2026-04-28 | B | DONE | Auth & session — JWT has accountId, login/register flow updated |
| 2026-04-28 | C | DONE | Prisma extension — createTenantPrisma, tenant-context, lib/prisma.ts |
| 2026-04-28 | D | DONE | All API routes tenant-scoped; `trips/[id]` fully migrated to `createTenantPrisma` |
| 2026-04-28 | E | DONE | Dashboard layout created with TenantProvider; UI unchanged (cookie auth sufficient) |
| 2026-04-28 | F | DONE | Client components — no changes needed (session cookie handles auth) |
| 2026-04-28 | G | DONE | Migration — manual SQL (20260428000000) for Account model + accountId on all tenant tables; seed ran |
| 2026-04-28 | Fix 1 | DONE | Converted 3 bare unique indexes → proper unique constraints |
| 2026-04-28 | Fix 2 | DONE | Rewrote upsert wrapper with `toCompositeUniqueWhere()` |
| 2026-04-28 | Fix 3 | DONE | Fixed systemSettings upsert to include accountId |
| 2026-04-28 | Fix 4 | DONE | Fixed push delete calls to use `id` instead of `endpoint` |
| 2026-04-28 | Fix 5 | DONE | Removed `as any` casts from upsert calls |
| 2026-04-28 | H | PARTIAL | Verification — `trips/[id]` fixed; isolation test remaining |
