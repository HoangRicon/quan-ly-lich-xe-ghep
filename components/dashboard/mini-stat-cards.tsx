"use client";

import { Clock, Zap, Users } from "lucide-react";

interface DashboardStats {
  waiting: number;
  running: number;
  driverAvailable: number;
}

export function MiniStatCards({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      label: "Chờ xe",
      value: stats.waiting,
      color: "rose",
      dotColor: "bg-rose-500",
      dotAnimate: true,
    },
    {
      label: "Đang đi",
      value: stats.running,
      color: "blue",
      dotColor: "bg-blue-500",
      dotAnimate: false,
    },
    {
      label: "TX rảnh",
      value: stats.driverAvailable,
      color: "emerald",
      dotColor: "bg-emerald-500",
      dotAnimate: false,
    },
  ];

  const colorMap: Record<string, { text: string; border: string; label: string; dot: string }> = {
    rose: { text: "text-rose-600", border: "border-rose-100 bg-rose-50/60", label: "text-rose-500", dot: "bg-rose-500" },
    blue: { text: "text-blue-600", border: "border-blue-100 bg-blue-50/60", label: "text-blue-500", dot: "bg-blue-500" },
    emerald: { text: "text-emerald-600", border: "border-emerald-100 bg-emerald-50/60", label: "text-emerald-500", dot: "bg-emerald-500" },
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const c = colorMap[item.color];
        return (
          <div
            key={item.label}
            className={`${c.border} rounded-2xl p-3 border shadow-sm`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-2 h-2 rounded-full ${item.dotColor} ${item.dotAnimate ? "animate-pulse" : ""}`} />
              <span className={`text-[10px] ${c.label} font-semibold uppercase tracking-wide truncate`}>
                {item.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${c.text}`}>{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
