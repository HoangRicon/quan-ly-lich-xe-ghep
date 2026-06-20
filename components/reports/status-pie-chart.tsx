"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";

interface StatusDistributionItem {
  bucket: string;
  label?: string;
  count: number;
  percent: number;
}

interface StatusPieChartProps {
  distribution: StatusDistributionItem[];
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unassigned: { label: "Chưa gán", color: "#f97316" },
  scheduled: { label: "Chưa gán", color: "#f97316" },
  assigned: { label: "Đã gán", color: "#3b82f6" },
  confirmed: { label: "Đã gán", color: "#3b82f6" },
  completed: { label: "Hoàn thành", color: "#22c55e" },
  cancelled: { label: "Đã hủy", color: "#ef4444" },
  unknown: { label: "Không xác định", color: "#94a3b8" },
};

interface ChartDataItem {
  name: string;
  label: string;
  value: number;
  percent: number;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function getStatusConfig(bucket: string) {
  return STATUS_CONFIG[bucket] || STATUS_CONFIG.unknown;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0].payload;
  const config = getStatusConfig(entry.name);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <span className="font-semibold text-slate-700">{entry.label}</span>
      </div>
      <p className="mt-1 text-slate-500">
        Số cuốc:{" "}
        <span className="font-semibold text-slate-700">
          {entry.value.toLocaleString("vi-VN")}
        </span>
      </p>
      <p className="text-slate-500">
        Tỷ trọng:{" "}
        <span className="font-semibold text-slate-700">
          {formatPercent(entry.percent)}
        </span>
      </p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string; payload?: ChartDataItem }> }) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-3">
      {payload.map((entry) => {
        const item = entry.payload;
        const label = item?.label || getStatusConfig(entry.value).label;
        const percent = item ? ` (${formatPercent(item.percent)})` : "";
        return (
          <div key={entry.value} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">
              {label}
              {percent}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChartShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2">
          <PieIcon className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              Phân bổ cuốc theo trạng thái
            </h3>
            <p className="text-[11px] text-slate-400">
              Số lượng và tỷ trọng trên tổng cuốc tạo
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function StatusPieChart({ distribution, loading }: StatusPieChartProps) {
  if (loading) {
    return (
      <ChartShell>
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </ChartShell>
    );
  }

  const chartData = (distribution || [])
    .filter((item) => Number(item.count) > 0)
    .map((item) => {
      const config = getStatusConfig(item.bucket);
      return {
        name: item.bucket,
        label: item.label || config.label,
        value: Number(item.count) || 0,
        percent: Number(item.percent) || 0,
      };
    });

  if (chartData.length === 0) {
    return (
      <ChartShell>
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Chưa có dữ liệu trạng thái cuốc
        </div>
      </ChartShell>
    );
  }

  return (
    <ChartShell>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={getStatusConfig(entry.name).color}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
