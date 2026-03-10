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
      {/* Chờ xe - Red */}
      <div className="bg-white rounded-[10px] p-3 border border-red-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-[9px] text-red-600 font-medium uppercase tracking-wide">Chờ xe</span>
        </div>
        <p className="text-2xl font-bold text-red-600">{stats.waiting}</p>
      </div>

      {/* Đang đi - Blue */}
      <div className="bg-white rounded-[10px] p-3 border border-blue-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-[9px] text-blue-600 font-medium uppercase tracking-wide">Đang đi</span>
        </div>
        <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
      </div>

      {/* Tài xế rảnh - Green */}
      <div className="bg-white rounded-[10px] p-3 border border-green-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-[9px] text-green-600 font-medium uppercase tracking-wide">TX rảnh</span>
        </div>
        <p className="text-2xl font-bold text-green-600">{stats.driverAvailable}</p>
      </div>
    </div>
  );
}
