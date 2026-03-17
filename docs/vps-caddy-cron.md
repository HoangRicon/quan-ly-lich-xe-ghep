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

### 3) Tạo systemd timer gọi cron mỗi phút (khuyến nghị)

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

