import { prisma } from "@/lib/prisma";

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: "booking_confirmation",
    name: "Xác nhận đặt xe thành công",
    subject: "Xác nhận đặt xe thành công - Xe Ghép",
    body: `Xin chào {{customer_name}},

Đặt xe thành công!

📍 Tuyến: {{pickup_location}} → {{dropoff_location}}
💰 Giá: {{price}}đ
🕐 Thời gian: {{booking_time}}

Cảm ơn bạn đã sử dụng dịch vụ Xe Ghép!`,
    params: ["customer_name", "pickup_location", "dropoff_location", "price", "booking_time"],
  },
  {
    key: "driver_assigned",
    name: "Tài xế đã nhận chuyến",
    subject: "Tài xế đã nhận chuyến - Xe Ghép",
    body: `Xin chào {{customer_name}},

Tài xế {{driver_name}} đã nhận chuyến!

🚗 Biển số: {{license_plate}}
📞 Điện thoại: {{phone_number}}
⏰ Đến trong: {{eta}} phút`,
    params: ["customer_name", "driver_name", "license_plate", "phone_number", "eta"],
  },
  {
    key: "trip_reminder",
    name: "Nhắc lịch khởi hành",
    subject: "Nhắc lịch khởi hành - Xe Ghép",
    body: `Xin chào {{customer_name}},

⏰ Lịch khởi hành: {{departure_time}}
📍 Tuyến: {{pickup_location}} → {{dropoff_location}}

Vui lòng có mặt đúng giờ!`,
    params: ["customer_name", "departure_time", "pickup_location", "dropoff_location"],
  },
  {
    key: "trip_completed",
    name: "Chuyến đi hoàn thành",
    subject: "Chuyến đi hoàn thành - Xe Ghép",
    body: `Xin chào {{customer_name}},

Cảm ơn bạn đã sử dụng Xe Ghép!

⭐ Đánh giá ngay: {{rating_link}}`,
    params: ["customer_name", "rating_link"],
  },
] as const;

/**
 * Seed email templates if DB has none yet.
 * Safe to call multiple times.
 */
export async function ensureDefaultEmailTemplates() {
  const count = await prisma.emailTemplate.count();
  if (count > 0) return false;

  await prisma.emailTemplate.createMany({
    data: DEFAULT_EMAIL_TEMPLATES.map((t) => ({
      key: t.key,
      name: t.name,
      subject: t.subject,
      body: t.body,
      params: { params: t.params },
      isActive: true,
    })),
    skipDuplicates: true,
  });
  return true;
}

