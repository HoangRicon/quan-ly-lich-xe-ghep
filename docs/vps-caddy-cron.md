## VPS + Caddy: cấu hình `CRON_SECRET` và chạy cron reminders

Endpoint đã có sẵn:
- `GET /api/cron/reminders`
- Bắt buộc header: `x-cron-secret: <CRON_SECRET>`

### 1) Tạo secret mạnh

Chạy ngay trong source code:

```bash
npm run gen:cron-secret
```

Bạn sẽ nhận được dạng:

```bash
CRON_SECRET=...chuỗi_dài...
```

### 2) Set `CRON_SECRET` cho app Next.js trên VPS

Bạn cần đảm bảo process chạy `next start` (pm2/systemd/docker) có env `CRON_SECRET`.

**Nếu VPS Windows**: set `CRON_SECRET` dưới dạng **System Environment Variable** (System Properties → Environment Variables), rồi **restart** process/service chạy app để nhận env mới.

Ví dụ nếu bạn dùng systemd để chạy app:
- Tạo file `/etc/quan-ly-lich-xe-ghep.env`:

```bash
CRON_SECRET=...dán secret ở bước 1...
DATABASE_URL=...
JWT_SECRET=...
# các env khác...
```

- Trong service chạy app, thêm:

```ini
EnvironmentFile=/etc/quan-ly-lich-xe-ghep.env
```

Sau đó restart service app.

### 3) Chạy cron trên VPS Linux (systemd timer) – khuyến nghị nếu VPS Linux

Repo có sẵn 2 file mẫu:
- `deploy/systemd/cron-reminders.service`
- `deploy/systemd/cron-reminders.timer`

Copy lên VPS:

```bash
sudo cp deploy/systemd/cron-reminders.service /etc/systemd/system/cron-reminders.service
sudo cp deploy/systemd/cron-reminders.timer /etc/systemd/system/cron-reminders.timer
```

Sửa `/etc/systemd/system/cron-reminders.service`:
- `APP_URL`: trỏ vào localhost nơi app đang listen (thường `http://127.0.0.1:3000`)
- `CRON_SECRET`: set bằng secret của bạn

Sau đó enable & start timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cron-reminders.timer
```

Check log:

```bash
sudo systemctl status cron-reminders.timer
sudo journalctl -u cron-reminders.service -n 50 --no-pager
```

### 3b) Chạy cron trên VPS **Windows** (Task Scheduler) – khuyến nghị nếu VPS Windows

Repo có sẵn script mẫu:
- `deploy/windows/cron-reminders.ps1`

**Ý tưởng**: Task Scheduler chạy mỗi 1 phút, script sẽ gọi:
- `http://127.0.0.1:3000/api/cron/reminders` (khuyến nghị gọi localhost)
- Gửi header `x-cron-secret` bằng env `CRON_SECRET`

#### B1) Set `CRON_SECRET` trên Windows (System Environment Variable)

- Mở **System Properties** → **Environment Variables…**
- Tạo **System variable**:
  - Name: `CRON_SECRET`
  - Value: (dán secret ở bước 1)

Sau đó **restart** service/process chạy app Next.js (và **re-run task** nếu đang test), để nó nhận env mới.

Bạn có thể verify nhanh Machine env trong PowerShell (Admin):

```powershell
[Environment]::GetEnvironmentVariable("CRON_SECRET","Machine")
```

Nếu bạn chỉ set theo **User variable** (tài khoản đang login), verify bằng:

```powershell
[Environment]::GetEnvironmentVariable("CRON_SECRET","User")
```

Nếu chưa có, set nhanh (chạy PowerShell **Admin**):

```powershell
# Cách 1 (khuyến nghị): set Machine env ngay lập tức (không cần logout)
[Environment]::SetEnvironmentVariable("CRON_SECRET","PASTE_SECRET_HERE","Machine")

# Cách 2: setx (cũng set Machine env, nhưng các process đã chạy cần restart để nhận)
setx CRON_SECRET "PASTE_SECRET_HERE" /M
```

#### B2) Chạy app Next.js dạng service (gợi ý)

Bạn có thể dùng **NSSM** hoặc **PM2 Windows** để chạy `next start` như service. Quan trọng nhất là process phải có đủ env (`DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, ...).

#### B3) Tạo task chạy mỗi phút

Mở PowerShell (Run as Administrator) và chạy (sửa đúng đường dẫn repo của bạn):

```powershell
$repo = "C:\Users\Admin\Desktop\outsrc\quan-ly-lich-xe-ghep"
$ps1  = Join-Path $repo "deploy\windows\cron-reminders.ps1"

schtasks /Create /F /TN "QuanLyLichXeGhep - Cron Reminders" `
  /SC MINUTE /MO 1 `
  /RU "SYSTEM" `
  /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ps1`""
```

#### B4) Xem log & debug nhanh

Script có ghi log vào:
- `deploy/windows/logs/cron-reminders.log`

Bạn cũng có thể chạy tay để test:

```powershell
cd "C:\Users\Admin\Desktop\outsrc\quan-ly-lich-xe-ghep"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\deploy\windows\cron-reminders.ps1" -DryRun 1
```

#### Lưu ý quan trọng: đừng để `CRON_SECRET` bị lệch giữa `.env` và Machine env

- Next.js khi chạy `npm run dev` / `next start` thường sẽ load `.env` / `.env.local`.
- Task Scheduler (khuyến nghị chạy bằng `SYSTEM`) lại đọc **Machine env**.

Vì vậy nếu bạn set `CRON_SECRET` ở **cả 2 nơi** mà **khác nhau**, cron sẽ gặp `401 Unauthorized`.

Khuyến nghị:
- **Production/Task Scheduler**: chỉ dùng **Machine env** (hoặc ensure `.env` trùng đúng giá trị), rồi **restart** process/service chạy app để nhận env mới.
- **Local dev**: có thể dùng `.env`, nhưng vẫn nên đồng bộ cùng 1 secret để tránh nhầm.

Dev-only (nếu bạn đã có `CRON_SECRET=...` trong `.env` ở repo): bật load `.env` khi chạy tay:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\deploy\windows\cron-reminders.ps1" -LoadDotEnv 1 -DryRun 1
```

### 4) Caddy có cần “config đặc biệt” không?

Không bắt buộc.

Khuyến nghị: **cron gọi localhost** (`127.0.0.1`) để không phụ thuộc domain/SSL của Caddy.

Nếu bạn vẫn muốn gọi qua domain (đi qua Caddy), dùng curl:

```bash
curl -fsS -H "x-cron-secret: <CRON_SECRET>" "https://YOUR_DOMAIN/api/cron/reminders"
```

### 5) Test nhanh (không gửi email thật)

Endpoint hỗ trợ `dryRun=1`:

```bash
curl -fsS -H "x-cron-secret: <CRON_SECRET>" "http://127.0.0.1:3000/api/cron/reminders?dryRun=1"
```

