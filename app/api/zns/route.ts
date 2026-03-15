import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, templateId, data, oaId, accessToken } = body;

    if (!phone || !templateId) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Nếu chưa có config, trả về thông báo cần cấu hình
    if (!oaId || !accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Chưa cấu hình Zalo OA. Vui lòng vào Cài đặt > Thông báo để cấu hình." 
        },
        { status: 400 }
      );
    }

    // Zalo ZNS API endpoint
    const zaloApiUrl = "https://openapi.zalo.me/v3.0/oa/message/template";
    
    // Chuẩn bị dữ liệu theo template
    const templateData = {
      phone: phone.replace(/\D/g, ""), // Chỉ lấy số
      template_id: templateId,
      template_data: data || {},
    };

    // Gọi Zalo API
    const response = await fetch(zaloApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(templateData),
    });

    const result = await response.json();

    if (result.error === 0) {
      return NextResponse.json({
        success: true,
        message: "Gửi ZNS thành công",
        data: result,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || "Lỗi khi gửi ZNS",
        details: result,
      });
    }
  } catch (error) {
    console.error("ZNS API Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi server khi gửi ZNS" },
      { status: 500 }
    );
  }
}

// GET - Lấy danh sách template đã đăng ký
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oaId = searchParams.get("oa_id");
  const accessToken = searchParams.get("access_token");

  if (!oaId || !accessToken) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Thiếu OA ID hoặc Access Token",
        templates: getDefaultTemplates() 
      },
      { status: 400 }
    );
  }

  try {
    // Gọi API lấy danh sách template từ Zalo
    const response = await fetch(
      `https://openapi.zalo.me/v3.0/oa/template/list?oa_id=${oaId}`,
      {
        headers: {
          "Access-Token": accessToken,
        },
      }
    );

    const result = await response.json();

    if (result.error === 0) {
      return NextResponse.json({
        success: true,
        templates: result.data || [],
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
        templates: getDefaultTemplates(),
      });
    }
  } catch (error) {
    console.error("ZNS Templates API Error:", error);
    return NextResponse.json({
      success: false,
      error: "Không thể lấy danh sách template",
      templates: getDefaultTemplates(),
    });
  }
}

// Template mặc định khi chưa có kết nối
function getDefaultTemplates() {
  return [
    {
      id: "trip_reminder",
      name: "Nhắc lịch chuyến xe",
      content: "Nhắc nhở: Chuyến xe {{departure}} → {{destination}} vào ngày {{date}} lúc {{time}}",
      variables: ["departure", "destination", "date", "time"],
    },
    {
      id: "trip_confirmed",
      name: "Xác nhận đặt xe",
      content: "Cảm ơn bạn! Chuyến xe {{departure}} → {{destination}} đã được xác nhận.",
      variables: ["departure", "destination"],
    },
    {
      id: "trip_cancelled",
      name: "Hủy chuyến xe",
      content: "Chuyến xe {{departure}} → {{destination}} ngày {{date}} đã bị hủy.",
      variables: ["departure", "destination", "date"],
    },
    {
      id: "driver_assigned",
      name: "Phân công tài xế",
      content: "Tài xế {{driver_name}} sẽ đón bạn lúc {{time}} tại {{location}}.",
      variables: ["driver_name", "time", "location"],
    },
  ];
}
