"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, CheckCircle, Calendar, Users, BarChart3, Car, Bell } from "lucide-react";
import { Sidebar } from "@/components/dashboard";

const steps = [
  {
    icon: Car,
    title: "1. Thêm Zom (tài xế)",
    color: "bg-blue-100 text-blue-600",
    content: `Vào mục "Quản lý Zom" trong sidebar để thêm thông tin các tài xế như:
    • Tên zom
    • Cài đặt giá cước và công thức tính lợi nhuận
    • Ghi chú thêm (nếu có)

Mỗi Zom sẽ được gán vào các chuyến xe khi tạo lịch trình.`,
  },
  {
    icon: Calendar,
    title: "2. Tạo lịch trình chuyến xe",
    color: "bg-green-100 text-green-600",
    content: `Vào mục "Cuốc xe" để tạo cuốc xe mới:
    • Chọn điểm đi và điểm đến
    • Chọn ngày và giờ khởi hành
    • Chọn Zom (tài xế) cho chuyến xe
    • Thêm ghi chú nếu cần

Sau khi tạo, cuốc xe sẽ xuất hiện trong cuốc xe và có thể theo dõi trạng thái.`,
  },
    {
    icon: Bell,
    title: "3. Gửi thông báo nhắc lịch tự động",
    color: "bg-amber-100 text-amber-600",
    content: `Hệ thống sẽ tự động gửi thông báo nhắc lịch cho khách hàng và tài xế trước giờ khởi hành.`,
  },
  {
    icon: BarChart3,
    title: "4. Theo dõi báo cáo",
    color: "bg-cyan-100 text-cyan-600",
    content: `Vào mục "Báo cáo" để xem báo cáo cuốc xe:
    • Doanh thu theo ngày / tháng
    • Lợi nhuận từng cuốc xe (dựa trên công thức đã cấu hình)
    • Thống kê Zom hoạt động
    • Xuất dữ liệu ra file Excel`,
  },
  
];

export default function HelpPage() {
  const [openStep, setOpenStep] = useState<number | null>(0);

  return (
    <Sidebar>
      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard/schedule"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">Hướng dẫn sử dụng</h1>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Hướng dẫn từng bước để sử dụng phần mềm Quản Lý Lịch Xe Ghép từ cơ bản đến nâng cao.
        </p>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setOpenStep(openStep === idx ? null : idx)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${step.color}`}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-800">{step.title}</span>
                {openStep === idx ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openStep === idx && (
                <div className="px-4 pb-4 pt-0">
                  <div className="ml-[2.25rem]">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {step.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Lưu ý:</strong> Nếu cần hỗ trợ thêm, hãy liên hệ{" "}
            <a href="https://zalo.me/0878836354" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
              HTool qua Zalo: 0878836354
            </a>
          </p>
        </div>
      </div>
    </Sidebar>
  );
}
