# Smart AI Quick Trip Parser

## Why

Nguoi dung muon nhap cuoc bang ngon ngu tu nhien nhu tin nhan Zalo, khong phai nho dung cu phap `8h HN - HP 150k`. Parser hien tai chu yeu dua vao regex nen bo sot cac cach noi pho bien nhu `8 gio sang`, `150 nghin`, `di tu Ha Noi den Hai Phong`, va chua co co che AI tra ve nhieu draft tu mot doan noi dung dai.

## What Changes

- Nang cap AI provider de ho tro parse mot hoac nhieu draft tu cung mot input.
- Cho service quick-entry tu dong uu tien AI khi input la ngon ngu tu nhien, nhieu cuoc trong mot doan, hoac rule parser thieu truong quan trong.
- Giu rule parser lam fallback nhanh khi AI chua cau hinh hoac AI loi.
- Va rule parser cho mot so mau tieng Viet pho bien: `nghin/ngan`, `gio sang/chieu/toi`, `tu ... den ...`, `ve ...`.
- Tra ve draft can review khi AI/rule khong du thong tin; khong auto-save khi co warning hoac missing field.

## Rollback

- Co the tat AI bang cach go bo `QUICK_TRIP_AI_*`; rule parser van hoat dong.
- Neu can rollback code, provider `parseMany` co the quay ve `parse` tung chunk ma khong doi schema/database.

## Out Of Scope

- Khong them server audio transcription.
- Khong thay doi schema quick-entry.
- Khong cho AI tu tao thong tin khong co trong input.
