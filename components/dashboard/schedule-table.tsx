"use client";

import { useState } from "react";
import { MoreHorizontal, MapPin, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Trip {
  id: number;
  time: string;
  customerName: string;
  customerPhone: string;
  departure: string;
  destination: string;
  vehicleType: "4 chỗ" | "7 chỗ";
  status: "pending" | "assigned" | "in_progress" | "completed";
  driverName?: string;
}

const mockTrips: Trip[] = [
  {
    id: 1,
    time: "14:30",
    customerName: "Nguyễn Văn A",
    customerPhone: "0912 345 678",
    departure: "Hà Nội - Quận Cầu Giấy",
    destination: "Sân bay Nội Bài",
    vehicleType: "4 chỗ",
    status: "pending",
  },
  {
    id: 2,
    time: "15:00",
    customerName: "Trần Thị B",
    customerPhone: "0987 654 321",
    departure: "Hà Nội - Quận Ba Đình",
    destination: "Hải Phòng - TP Hải Phòng",
    vehicleType: "7 chỗ",
    status: "assigned",
    driverName: "Nguyễn Minh",
  },
  {
    id: 3,
    time: "15:30",
    customerName: "Lê Văn C",
    customerPhone: "0934 567 890",
    departure: "Hà Nội - Quận Hoàn Kiếm",
    destination: "Hạ Long - TP Hạ Long",
    vehicleType: "4 chỗ",
    status: "in_progress",
    driverName: "Trần Đức",
  },
  {
    id: 4,
    time: "16:00",
    customerName: "Phạm Thị D",
    customerPhone: "0978 123 456",
    departure: "Hà Nội - Quận Đống Đa",
    destination: "Nam Định - TP Nam Định",
    vehicleType: "7 chỗ",
    status: "completed",
    driverName: "Lê Hùng",
  },
  {
    id: 5,
    time: "16:30",
    customerName: "Hoàng Văn E",
    customerPhone: "0969 246 813",
    departure: "Hà Nội - Quận Thanh Xuân",
    destination: "Ninh Bình - TP Ninh Bình",
    vehicleType: "4 chỗ",
    status: "pending",
  },
];

const statusConfig = {
  pending: { label: "Chờ gán", className: "bg-orange-100 text-orange-700" },
  assigned: { label: "Đã gán", className: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Đang chạy", className: "bg-green-100 text-green-700" },
  completed: { label: "Hoàn thành", className: "bg-slate-100 text-slate-700" },
};

export function ScheduleTable() {
  const [trips] = useState<Trip[]>(mockTrips);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Lịch trình hôm nay</h2>
        <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
          Xem tất cả
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Thời gian
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Khách hàng
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lộ trình
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Loại xe
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-800">{trip.time}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{trip.customerName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="text-sm text-slate-500">{trip.customerPhone}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate max-w-[150px]">{trip.departure}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-300">→</span>
                        <p className="text-sm text-slate-600 truncate max-w-[150px]">{trip.destination}</p>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      trip.vehicleType === "7 chỗ"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-cyan-100 text-cyan-700"
                    }`}
                  >
                    {trip.vehicleType}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusConfig[trip.status].className
                      }`}
                    >
                      {statusConfig[trip.status].label}
                    </span>
                    {trip.driverName && (
                      <p className="text-xs text-slate-500 mt-1">TX: {trip.driverName}</p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
