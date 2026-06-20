# Add Trip Map Locations

## Why
Nguoi dung can luu dia chi chinh xac copy tu Zalo Map rieng voi diem don/diem den hien co. Hai truong hien tai dang dung cho tuyen/diem tong quat, nen can them truong chi tiet de khong mat du lieu dia chi.

## What Changes
- Them 2 truong tuy chon vao Trip: `pickupLocation` va `dropoffLocation`.
- Form them moi va sua cuoc xe cho phep nhap `Vi tri don` va `Vi tri tra`.
- API tao/sua/danh sach/chi tiet cuoc xe doc ghi va tra ve 2 truong moi.
- Giao dien danh sach hien thi va copy nhanh 2 vi tri khi co du lieu.

## Rollback
- An 2 input tren frontend.
- Bo doc/ghi `pickupLocation` va `dropoffLocation` trong API.
- Neu can rollback DB, drop 2 cot `pickup_location` va `dropoff_location` sau khi backup du lieu.
