# Reporting Overhaul

## Why

Trang bao cao hien tai chua du chuan nghiep vu ke toan/quan tri:

1. Doanh thu dang loc/nhom theo `departureTime`, trong khi yeu cau la ghi nhan theo ngay tao cuoc (`createdAt`) neu cuoc da hoan thanh.
2. Bieu do trang thai dang cong doanh thu theo status, bao gom ca cuoc chua hoan thanh/huy, gay lech y nghia.
3. Bao cao tai xe thieu ty le hoan thanh, ty le huy, diem/cong, doanh thu/lai binh quan va thoi diem gan tai xe gan nhat.
4. He thong chua co lich su gan/doi/bo gan tai xe, nen khong the tinh "lan gan tai xe gan nhat" dung nghiep vu.
5. Diem/cong Zom can doi soat theo gio gan tai xe, trong khi doanh thu cong ty van theo ngay tao cuoc.
6. Logic tinh bao cao dang nam truc tiep trong API routes, kho khoi tao test va de lech giua tong quan/tai xe/tuyen/khach.

## What Changes

### 1. Trip event history

- Them bang `trip_events` de luu cac su kien nghiep vu cua cuoc xe.
- Ghi event khi gan tai xe, doi tai xe, bo gan tai xe, doi trang thai, hoan thanh, huy.
- Backfill du lieu cu: voi cuoc co `driverId`, tao event gan tai xe tai `Trip.createdAt` neu chua co event.
- Event gan/doi tai xe luu snapshot diem, cong, ty le cong va cong thuc tai luc gan.

### 2. Reporting layer

- Tao `lib/reports/*` de gom logic tinh toan bao cao.
- API reports chi con parse request, auth, goi service va tra JSON.
- Tat ca bao cao dung chung quy tac status bucket va rate.

### 3. Revenue recognition

- Loc ky bao cao theo `Trip.createdAt`.
- Chi cong doanh thu/lai cua cuoc `completed`.
- Bieu do ngay/thang nhom theo `Trip.createdAt`.
- So sanh ky truoc cung dung `Trip.createdAt`.

### 4. Driver analytics

- Them cac chi so tai xe:
  - `completionRate`
  - `cancelRate`
  - `avgTripValue`
  - `avgProfitPerCompletedTrip`
  - `totalPoints`
  - `lastAssignedAt`
  - `lastCompletedAt`
- Diem/cong va lich su doi chieu tai xe loc theo `trip_events.createdAt` cua lan gan, khong theo `Trip.createdAt`.
- Default sort theo doanh thu da ghi nhan.

### 5. UI reports

- Tong quan chia thanh nhom tien, van hanh, chat luong.
- Bieu do trang thai doi sang so luong/ty le cuoc theo bucket.
- Them label/tooltip ro rang "Theo ngay tao cuoc".
- Tab tai xe them cot ty le va thoi gian gan gan nhat.

## Rollback

- Co the revert UI/API ve fields cu trong khi giu bang `trip_events` khong doc.
- Neu migration chua dua production, rollback bang cach drop `trip_events`.
- Backfill script idempotent, co the chay lai sau khi fix neu gap loi.

## Out Of Scope

- Khong xay data warehouse/materialized view.
- Khong lam man hinh audit chi tiet tung su kien.
- Khong them schema khung gio cho bang cong thuc; change nay chi chot snapshot cong thuc tai luc gan va hien thi de doi chieu.
- Khong sua toan bo lint pre-existing cua repo.
