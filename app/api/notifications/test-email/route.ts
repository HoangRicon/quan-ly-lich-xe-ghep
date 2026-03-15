import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/notifications/test-email - Test gửi email thông báo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type = "booking_confirmation", 
      email = "test@example.com",
      data = {} 
    } = body;

    // Email templates - có thể mở rộng sau
    const emailTemplates: Record<string, { subject: string; body: string }> = {
      booking_confirmation: {
        subject: "Xác nhận đặt xe thành công - Xe Ghép",
        body: `Xin chào {{customer_name}},

Đặt xe thành công!

📍 Tuyến: {{pickup_location}} → {{dropoff_location}}
💰 Giá: {{price}}đ
🕐 Thời gian: {{booking_time}}

Cảm ơn bạn đã sử dụng dịch vụ Xe Ghép!`,
      },
      driver_assigned: {
        subject: "Tài xế đã nhận chuyến - Xe Ghép",
        body: `Xin chào {{customer_name}},

Tài xế {{driver_name}} đã nhận chuyến!

🚗 Biển số: {{license_plate}}
📞 Điện thoại: {{phone_number}}
⏰ Đến trong: {{eta}} phút`,
      },
      trip_reminder: {
        subject: "Nhắc lịch khởi hành - Xe Ghép",
        body: `Xin chào {{customer_name}},

⏰ Lịch khởi hành: {{departure_time}}
📍 Điểm đón: {{pickup_location}}
🚗 Tài xế: {{driver_name}}

Vui lòng có mặt đúng giờ!`,
      },
      trip_completed: {
        subject: "Chuyến đi hoàn thành - Xe Ghép",
        body: `Xin chào {{customer_name}},

Cảm ơn bạn đã sử dụng Xe Ghép!

Tài xế {{driver_name}} cảm ơn bạn đã đồng hành.

⭐ Đánh giá ngay: {{rating_link}}`,
      },
    };

    const template = emailTemplates[type] || emailTemplates.booking_confirmation;
    
    // Replace placeholders với actual data
    let emailBody = template.body;
    let emailSubject = template.subject;
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      emailBody = emailBody.replaceAll(placeholder, String(value));
      emailSubject = emailSubject.replaceAll(placeholder, String(value));
    });

    // Log email (trong production sẽ gửi qua SMTP)
    console.log("=== EMAIL TEST ===");
    console.log(`To: ${email}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Body:\n${emailBody}`);
    console.log("====================");

    // Lưu vào database để test
    const notification = await prisma.notification.create({
      data: {
        userId: 1, // Test user
        type: "email",
        title: emailSubject,
        content: emailBody,
        isRead: false,
        data: { 
          email, 
          type, 
          sentAt: new Date().toISOString(),
          status: "test"
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email test đã được gửi (log)",
      email: {
        to: email,
        subject: emailSubject,
        body: emailBody,
      },
      notification,
    });
  } catch (error) {
    console.error("Email test error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Gửi email thất bại" 
    }, { status: 500 });
  }
}

// GET /api/notifications/test-email - Lấy danh sách email templates
export async function GET() {
  const templates = [
    { 
      id: "booking_confirmation", 
      name: "Xác nhận đặt xe thành công",
      params: ["customer_name", "pickup_location", "dropoff_location", "price", "booking_time"]
    },
    { 
      id: "driver_assigned", 
      name: "Tài xế đã nhận chuyến",
      params: ["customer_name", "driver_name", "license_plate", "phone_number", "eta"]
    },
    { 
      id: "trip_reminder", 
      name: "Nhắc lịch khởi hành",
      params: ["customer_name", "departure_time", "pickup_location", "driver_name"]
    },
    { 
      id: "trip_completed", 
      name: "Chuyến đi hoàn thành",
      params: ["customer_name", "driver_name", "rating_link"]
    },
  ];

  return NextResponse.json({
    success: true,
    templates,
    note: "Đây là API test - email sẽ được log trong console. Cần cấu hình SMTP để gửi thực sự."
  });
}
