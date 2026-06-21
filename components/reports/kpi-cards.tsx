"use client";

import {
  BarChart3,
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  Gauge,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";

interface KpiData {
  totalRevenue: number;
  totalProfit: number;
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  cancelRate: number;
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

type StatType = "money" | "count" | "percent";

interface StatItem {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorKey: string;
  trend?: number | null;
  type: StatType;
}

interface StatGroup {
  title: string;
  helper: string;
  columns: string;
  items: StatItem[];
}

function formatVND(amount: number): string {
  if (amount >= 1000000000) {
    const billions = amount / 1000000000;
    return billions.toLocaleString("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + " tỷ";
  }
  return amount.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
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

const colorMap: Record<string, { iconBg: string; icon: string; border: string }> = {
  emerald: { iconBg: "bg-emerald-500", icon: "text-white", border: "border-emerald-200/50" },
  blue: { iconBg: "bg-blue-500", icon: "text-white", border: "border-blue-200/50" },
  violet: { iconBg: "bg-violet-500", icon: "text-white", border: "border-violet-200/50" },
  amber: { iconBg: "bg-amber-500", icon: "text-white", border: "border-amber-200/50" },
  teal: { iconBg: "bg-teal-500", icon: "text-white", border: "border-teal-200/50" },
  sky: { iconBg: "bg-sky-500", icon: "text-white", border: "border-sky-200/50" },
  rose: { iconBg: "bg-rose-500", icon: "text-white", border: "border-rose-200/50" },
  cyan: { iconBg: "bg-cyan-500", icon: "text-white", border: "border-cyan-200/50" },
  slate: { iconBg: "bg-slate-500", icon: "text-white", border: "border-slate-200/50" },
};

export function KpiCards({ data, loading }: KpiCardsProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1.35fr_0.8fr] gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-2.5">
            <div className="h-3 w-20 bg-slate-100 rounded mb-2 animate-pulse" />
            <div className="grid grid-cols-2 gap-1.5">
              {Array.from({ length: i === 1 ? 5 : i === 0 ? 4 : 2 }).map((_, j) => (
                <SkeletonCard key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const groups: StatGroup[] = [
    {
      title: "Tiền",
      helper: "doanh thu sau khi hoàn thành nhưng sẽ tính cho ngày đã gán cuối cùng",
      columns: "grid-cols-2",
      items: [
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
          label: "TB cuốc HT",
          value: data.avgTripValue,
          icon: BarChart3,
          colorKey: "slate",
          type: "money",
        },
        {
          label: "TB lợi nhuận HT",
          value: data.avgProfitPerTrip,
          icon: TrendingUp,
          colorKey: "cyan",
          type: "money",
        },
      ],
    },
    {
      title: "Vận hành",
      helper: "theo ngày tạo cuốc",
      columns: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5",
      items: [
        {
          label: "Tổng cuốc tạo",
          value: data.totalTrips,
          icon: Car,
          colorKey: "violet",
          trend: data.tripsChangePercent,
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
          label: "Đã hủy",
          value: data.cancelledTrips,
          icon: XCircle,
          colorKey: "rose",
          type: "count",
        },
      ],
    },
    {
      title: "Chất lượng",
      helper: "trên tổng cuốc tạo",
      columns: "grid-cols-2",
      items: [
        {
          label: "Tỷ lệ HT",
          value: data.completionRate,
          icon: Gauge,
          colorKey: "teal",
          type: "percent",
        },
        {
          label: "Tỷ lệ hủy",
          value: data.cancelRate,
          icon: XCircle,
          colorKey: "rose",
          type: "percent",
        },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1.35fr_0.8fr] gap-2">
      {groups.map((group) => (
        <section key={group.title} className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-sm">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
              {group.title}
            </h3>
            <p className="text-[10px] text-slate-400 whitespace-nowrap">{group.helper}</p>
          </div>
          <div className={`grid ${group.columns} gap-1.5`}>
            {group.items.map((item) => {
              const c = colorMap[item.colorKey];
              const isMoney = item.type === "money";
              const displayValue =
                item.type === "money"
                  ? formatVND(item.value)
                  : item.type === "percent"
                    ? formatPercent(item.value)
                    : item.value.toLocaleString("vi-VN");

              return (
                <div
                  key={item.label}
                  className={`rounded-xl p-2.5 border ${c.border} bg-slate-50/40 hover:bg-white hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 cursor-default group flex flex-col gap-1.5`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className={`p-1.5 rounded-lg ${c.iconBg} group-hover:scale-110 transition-transform duration-150 shadow-sm`}>
                      <item.icon className={`w-3 h-3 ${c.icon}`} />
                    </div>
                    {item.trend != null && <TrendBadge value={item.trend} />}
                  </div>
                  <div>
                    <p className={`font-bold text-slate-800 ${isMoney ? "text-sm" : "text-base"} leading-tight tabular-nums`}>
                      {displayValue}
                      {isMoney && <span className="text-[10px] font-normal text-slate-400 ml-0.5">đ</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
