"use client";

import { 
  Clock, Zap, Users, ChevronRight, RefreshCw,
  Phone, MessageCircle
} from "lucide-react";

interface DashboardStats {
  waiting: number;
  running: number;
  driverAvailable: number;
}

export function MiniStatCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Chờ gán - Red */}
      <div className="bg-white rounded-[10px] p-3 border border-red-100">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          <span className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Chờ gán</span>
        </div>
        <p className="text-xl font-bold text-red-600">{stats.waiting}</p>
      </div>

      {/* Đang chạy - Blue */}
      <div className="bg-white rounded-[10px] p-3 border border-blue-100">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          <span className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Đang chạy</span>
        </div>
        <p className="text-xl font-bold text-blue-600">{stats.running}</p>
      </div>

      {/* TX Rảnh - Green */}
      <div className="bg-white rounded-[10px] p-3 border border-green-100">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <span className="text-[10px] text-green-600 font-medium uppercase tracking-wide">TX Rảnh</span>
        </div>
        <p className="text-xl font-bold text-green-600">{stats.driverAvailable}</p>
      </div>
    </div>
  );
}
