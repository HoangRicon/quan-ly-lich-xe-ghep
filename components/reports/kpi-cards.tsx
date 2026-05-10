"use client";

import {
  TrendingUp, TrendingDown, Car, DollarSign, Clock,
  CheckCircle, XCircle, UserCheck, Wallet, BarChart3
} from "lucide-react";

interface KpiData {
  totalRevenue: number;
  totalProfit: number;
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  inProgressTrips: number;
  cancelledTrips: number;
  avgTripValue: number;
  avgProfitPerTrip: number;
  revenueChangePercent: number;
  profitChangePercent: number;
  tripsChangePercent: number;
}

interface KpiCardsProps {
  data: KpiData | null;
  loading: boolean;
}

function formatVND(amount: number): string {
  if (amount >= 1000000000) {
    const billions = amount / 1000000000;
    return (
      billions.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) +
      " tỷ"
    );
  }
  return amount.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

function formatVNDCompact(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace(".", ",") + "M";
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(0) + "K";
  }
  return amount.toString();
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded-full shrink-0 ${
        isPositive
          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
          : "bg-red-50 text-red-500 border border-red-100"
      }`}
    >
      {isPositive ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
      {isPositive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-100 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-6 w-20 bg-slate-100 rounded" />
        <div className="h-3 w-12 bg-slate-50 rounded" />
      </div>
    </div>
  );
}

type StatType = "money" | "count";

interface StatItem {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorKey: string;
  trend?: number | null;
  type: StatType;
  prefix?: string;
}

export function KpiCards({ data, loading }: KpiCardsProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const stats: StatItem[] = [
    {
      label: "Doanh thu",
      value: data.totalRevenue,
      icon: DollarSign,
      colorKey: "emerald",
      trend: data.revenueChangePercent,
      type: "money",
    },
    {
      label: "Lợi nhuận",
      value: data.totalProfit,
      icon: Wallet,
      colorKey: "blue",
      trend: data.profitChangePercent,
      type: "money",
    },
    {
      label: "Tổng cuốc",
      value: data.totalTrips,
      icon: Car,
      colorKey: "violet",
      trend: data.tripsChangePercent,
      type: "count",
    },
    {
      label: "Chưa gán",
      value: data.unassignedTrips,
      icon: Clock,
      colorKey: "amber",
      type: "count",
    },
    {
      label: "Hoàn thành",
      value: data.completedTrips,
      icon: CheckCircle,
      colorKey: "teal",
      type: "count",
    },
    {
      label: "Đã gán",
      value: data.assignedTrips,
      icon: UserCheck,
      colorKey: "sky",
      type: "count",
    },
    {
      label: "Đã hủy",
      value: data.cancelledTrips,
      icon: XCircle,
      colorKey: "rose",
      type: "count",
    },
    {
      label: "TB cuốc",
      value: data.avgTripValue,
      icon: BarChart3,
      colorKey: "slate",
      type: "money",
    },
    {
      label: "TB lợi nhuận",
      value: data.avgProfitPerTrip,
      icon: TrendingUp,
      colorKey: "cyan",
      type: "money",
    },
  ];

  const colorMap: Record<string, { iconBg: string; icon: string; text: string; border: string }> = {
    emerald: { iconBg: "bg-emerald-500", icon: "text-white", text: "text-emerald-600", border: "border-emerald-200/50" },
    blue: { iconBg: "bg-blue-500", icon: "text-white", text: "text-blue-600", border: "border-blue-200/50" },
    violet: { iconBg: "bg-violet-500", icon: "text-white", text: "text-violet-600", border: "border-violet-200/50" },
    amber: { iconBg: "bg-amber-500", icon: "text-white", text: "text-amber-600", border: "border-amber-200/50" },
    teal: { iconBg: "bg-teal-500", icon: "text-white", text: "text-teal-600", border: "border-teal-200/50" },
    sky: { iconBg: "bg-sky-500", icon: "text-white", text: "text-sky-600", border: "border-sky-200/50" },
    rose: { iconBg: "bg-rose-500", icon: "text-white", text: "text-rose-600", border: "border-rose-200/50" },
    cyan: { iconBg: "bg-cyan-500", icon: "text-white", text: "text-cyan-600", border: "border-cyan-200/50" },
    slate: { iconBg: "bg-slate-500", icon: "text-white", text: "text-slate-600", border: "border-slate-200/50" },
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-1.5">
      {stats.map((item) => {
        const c = colorMap[item.colorKey];
        const isMoney = item.type === "money";
        const displayValue = isMoney
          ? formatVND(item.value)
          : item.value.toLocaleString("vi-VN");

        return (
          <div
            key={item.label}
            className={`bg-white rounded-xl p-2.5 border ${c.border} hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 cursor-default group flex flex-col gap-1.5`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-1.5 rounded-lg ${c.iconBg} group-hover:scale-110 transition-transform duration-150 shadow-sm`}>
                <item.icon className={`w-3 h-3 ${c.icon}`} />
              </div>
              {item.trend != null && <TrendBadge value={item.trend} />}
            </div>
            <div>
              <p className={`font-bold ${isMoney ? "text-slate-800 text-sm" : "text-slate-800 text-base"} leading-tight`}>
                {displayValue}
                {isMoney && <span className="text-[10px] font-normal text-slate-400 ml-0.5">đ</span>}
              </p>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
