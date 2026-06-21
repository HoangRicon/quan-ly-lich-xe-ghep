# AI Quick Trip Entry

## Why

Nguoi van hanh can tao cuoc xe tren dien thoai voi toc do rat cao, muc tieu khoang 10 cuoc/phut. Luong nhap hien tai phu thuoc vao form day du truong, phu hop khi tao tung cuoc can than nhung qua cham khi phai xu ly nhieu tin nhan Zalo/nguon khac lien tuc.

Van de can giai quyet:

1. Nguoi dung can nhap nhanh tu mot dong text, nhieu dong text hoac voice realtime.
2. Moi nguon/cuoc hoi thoai can co phien nhap rieng de dang nhap do co the chuyen sang nguon khac ma khong mat hang doi.
3. AI/parser co the hieu sai hoac thieu du lieu, nen khong duoc am tham tao cuoc sai.
4. Mobile la thiet bi uu tien; UI can thiet ke cho thao tac mot tay, khong phai desktop thu nho.
5. Cuoc duoc tao tu luong nhanh van phai di qua logic tao trip hien co de giu dung khach hang, gia, ghe, loai cuoc, gan tai xe, cong thuc va event gan tai xe.

## What Changes

### 1. Server-saved quick entry sessions

- Them kha nang tao va quan ly phien nhap nhanh theo nguon/cuoc hoi thoai.
- Moi phien co ten, trang thai, thoi diem cap nhat gan nhat va danh sach draft item.
- Phien luu server theo account de refresh trang, doi thiet bi hoac quay lai sau van con du lieu.
- Phien da xu ly xong co the xoa de don dung luong server; thao tac nay chi xoa session/draft/raw text, khong xoa cac Trip da tao.

### 2. Text and browser voice input

- Them man hinh mobile-first "Tao cuoc nhanh".
- Nguoi dung co the nhap mot dong, paste nhieu dong, hoac doc voice realtime tren trinh duyet de tao transcript.
- Enter hoac nut gui tao mot item tu input hien tai; transcript voice chi tao item sau khi user gui/xac nhan. Paste nhieu dong co the tach thanh nhieu item.

### 3. AI-assisted parsing with safety gates

- Them API parse text thanh cac draft trip candidate.
- Parser tra ve du lieu chuan hoa, diem tin cay va danh sach truong thieu/mau thuan.
- Cuoc du dieu kien va diem tin cay cao co the tu dong luu.
- Cuoc mo ho hoac thieu du lieu nam trong hang doi de sua nhanh.

### 4. Mobile-only optimized workflow

- Thanh phien dang chip ngang o tren cung.
- Vung nhap nhanh va nut micro/gui nam trong tam tay.
- Hang doi draft hien bang card ngan, khong dung bang.
- Sua nhanh bang bottom sheet, khong chuyen trang.
- Co nut "Luu tat ca hop le" va trang thai ro rang: da luu, cho sua, dang xu ly, loi.

### 5. Reuse existing trip creation rules

- Draft hop le khi luu phai goi chung validation/service voi `/api/trips`.
- Neu draft co driver, logic tinh diem/cong va ghi event gan tai xe van phai duoc ap dung.
- Khong tao duong ghi trip rieng bo qua nghiep vu hien co.

## Rollback

- Co the an link/man hinh "Tao cuoc nhanh" ma khong anh huong form tao cuoc hien tai.
- Co the giu bang session/draft ma khong doc neu rollback UI/API.
- Neu migration chua len production, co the drop bang quick entry session/item.

## Out Of Scope

- Khong lam audio upload/transcription server trong vong dau; voice realtime dung kha nang trinh duyet de chuyen thanh text.
- Khong lam workflow nhieu nguoi phan cong xu ly/phien.
- Khong luu file audio goc.
- Khong thay the form tao/sua cuoc hien tai.
- Khong bat buoc AI cloud o vong dau; co the trien khai provider adapter va fallback rule parser neu chua cau hinh API key.
- Khong xoa Trip that khi xoa phien nhap nhanh.
