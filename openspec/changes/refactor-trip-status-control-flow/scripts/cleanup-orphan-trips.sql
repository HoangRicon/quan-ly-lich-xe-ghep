# Cleanup Orphan Trips

Khi deploy change `refactor-trip-status-control-flow`, cần xử lý các trip cũ có
`status IN ('confirmed', 'running', 'in_progress')` nhưng `driver_id IS NULL`.
Đây là data "bẩn" do bug trước đó, không còn hợp lệ theo rule mới.

## Bước 1 — Detect (chạy trước để xem có bao nhiêu)

```sql
SELECT id, account_id, status, departure_time, created_at
FROM trips
WHERE status IN ('confirmed', 'running', 'in_progress')
  AND driver_id IS NULL
ORDER BY account_id, departure_time DESC;
```

## Bước 2 — Backup trước khi sửa

```sql
CREATE TABLE trips_orphan_backup AS
SELECT *
FROM trips
WHERE status IN ('confirmed', 'running', 'in_progress')
  AND driver_id IS NULL;
```

## Bước 3 — Fix: chuyển về `scheduled`

```sql
UPDATE trips
SET status = 'scheduled'
WHERE status IN ('confirmed', 'running', 'in_progress')
  AND driver_id IS NULL;
```

> **Cân nhắc**: Nếu muốn giữ nguyên lịch sử để audit, có thể chuyển sang
> `cancelled` thay vì `scheduled`. Tùy nghiệp vụ từng account.

## Bước 4 — Verify

```sql
SELECT COUNT(*)
FROM trips
WHERE status IN ('confirmed', 'running', 'in_progress')
  AND driver_id IS NULL;
-- Expected: 0
```

## Rollback (nếu cần)

```sql
UPDATE trips t
SET status = b.status
FROM trips_orphan_backup b
WHERE t.id = b.id;
```
