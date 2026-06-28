"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface RevenueDayData {
  date: string;
  revenue: number;
  profit: number;
  trips: number;
}

interface RevenueChartProps {
  data: RevenueDayData[];
  loading: boolean;
  dateFilter?: string;
  dateBasisLabel?: string;
}

function formatVNDShort(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

function formatDayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(day)}/${parseInt(month)}`;
}

function formatMonthLabel(dateStr: string): string {
  const [, month] = dateStr.split("-");
  const monthNames = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
  return monthNames[parseInt(month) - 1] || dateStr;
}

const CHART_TITLE_MAP: Record<string, string> = {
  today: "Doanh thu dự kiến theo ngày",
  week: "Doanh thu dự kiến theo ngày",
  month: "Doanh thu dự kiến theo ngày",
  year: "Doanh thu dự kiến theo tháng",
  all: "Doanh thu dự kiến theo tháng",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-500">
              {entry.name === "revenue" ? "Doanh thu" : "Lợi nhuận"}
            </span>
          </div>
          <span className="font-bold text-slate-800 text-right whitespace-nowrap">
            {new Intl.NumberFormat("vi-VN").format(entry.value)}đ
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartHeader({
  title,
  helper,
  showLegend = false,
}: {
  title: string;
  helper: string;
  showLegend?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 mb-4">
      <TrendingUp className="w-4 h-4 text-slate-500 mt-0.5" />
      <div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        <p className="text-[11px] text-slate-400">{helper}</p>
      </div>
      {showLegend && (
        <div className="ml-auto flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-500">Doanh thu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-500">Lợi nhuận</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function RevenueChart({
  data,
  loading,
  dateFilter = "month",
  dateBasisLabel = "Ngày gán tài xế",
}: RevenueChartProps) {
  const chartTitle = `${CHART_TITLE_MAP[dateFilter] || "Doanh thu dự kiến theo ngày"} - ${dateBasisLabel.toLowerCase()}`;
  const chartHelper = "Gồm cuốc hoàn thành và cuốc đã gán tài xế";
  const useMonthLabels = dateFilter === "year" || dateFilter === "all";
  const hasData = data.length > 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <ChartHeader title={chartTitle} helper={chartHelper} />
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <ChartHeader title={chartTitle} helper={chartHelper} />
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Chưa có dữ liệu trong khoảng thời gian này
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    dateLabel: useMonthLabels ? formatMonthLabel(d.date) : formatDayLabel(d.date),
  }));

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue));
  const yAxisTickCount = 5;
  const yTicks = Array.from({ length: yAxisTickCount }, (_, i) =>
    Math.round((maxRevenue / (yAxisTickCount - 1)) * i)
  );

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <ChartHeader title={chartTitle} helper={chartHelper} showLegend />
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tickFormatter={formatVNDShort}
            ticks={yTicks}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#10b981" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#3b82f6" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
