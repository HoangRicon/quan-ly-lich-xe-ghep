# Design

## Data Model
Them 2 cot nullable dang `TEXT` tren bang `trips`:
- `pickup_location`: dia chi don chinh xac tu ban do.
- `dropoff_location`: dia chi tra chinh xac tu ban do.

Trong Prisma map thanh camelCase `pickupLocation` va `dropoffLocation`. Hai truong la optional de cuoc xe cu khong can migrate du lieu.

## API Flow
`POST /api/trips` nhan 2 truong moi, trim gia tri chuoi, luu `null` khi bo trong. `PUT /api/trips/:id` chi cap nhat khi field duoc gui len. `GET /api/trips` va `GET /api/trips/:id` tra ve 2 truong moi de form sua va danh sach dung lai.

## UI Flow
Trong form them moi, dat `Vi tri don` ngay sau `Diem don`, va `Vi tri tra` ngay sau `Diem den`. Trong sheet sua cuoc xe dung cung vi tri de nguoi dung de thay doi. Danh sach bang hien them dong neu co du lieu, kem nut copy nhu diem don/diem den.

## Testing
Chay Prisma generate de cap nhat client types, sau do chay lint. Neu lint hien loi cu khong lien quan, ghi lai ro trong ket qua.
