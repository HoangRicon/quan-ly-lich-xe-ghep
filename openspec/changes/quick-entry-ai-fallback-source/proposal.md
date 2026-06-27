# Quick Entry AI Fallback Source

## Summary

Cho phep tao ban nhap quick-create ngay ca khi API AI khong ket noi duoc, dong thoi hien thi ro ban nhap nao duoc AI phan tich va ban nhap nao chi duoc tach theo quy tac thuong.

## Problem

Nguoi dung dang hieu luong tao nhanh la "phai co AI moi tao duoc ban nhap". Khi AI API loi, khong ket noi, hoac treo lau, UI co the bao loi/cho xu ly ma khong noi ro he thong co fallback quy tac hay khong. Draft card cung chua co nhan nguon phan tich de nguoi dung biet muc do tin cay.

## Goals

- Tao duoc ban nhap bang parser quy tac khi AI loi, timeout, hoac khong cau hinh.
- Hien thi ro nguon phan tich tren moi draft: "AI phan tich" hoac "Quy tac thuong".
- Thong bao bang tieng Viet co dau khi he thong fallback do AI khong ket noi duoc.
- Khong them migration Prisma; metadata nam trong `parsedData`.
- Gioi han thoi gian doi AI de khong lam pending qua lau.

## Non-Goals

- Khong thay doi schema database.
- Khong thay doi luong luu/tai cuoc xe.
- Khong viet lai parser quy tac.

## Rollback Plan

Co the rollback bang cach xoa metadata `analysisSource`/`analysisMessage` khoi serializer/UI va bo timeout AI. Du lieu cu trong `parsedData` van an toan vi cac field moi la optional.
