"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";

interface StatusPieChartProps {
  revenueByStatus: Record<string, number>;
  totalTrips: number;
  loading: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  scheduled: { label: "Chưa gán", color: "#f97316" },
  in_progress: { label: "Đang chạy", color: "#3b82f6" },
  completed: { label: "Hoàn thành", color: "#22c55e" },
  cancelled: { label: "Đã hủy", color: "#ef4444" },
  unknown: { label: "Không xác định", color: "#94a3b8" },
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const config = STATUS_CONFIG[entry.name] || STATUS_CONFIG.unknown;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <span className="font-semibold text-slate-700">{config.label}</span>
      </div>
      <p className="mt-1 text-slate-500">
        Doanh thu:{" "}
        <span className="font-semibold text-slate-700">
          {new Intl.NumberFormat("vi-VN").format(entry.value)} đ
        </span>
      </p>
      <p className="text-slate-500">
        Tỷ lệ:{" "}
        <span className="font-semibold text-slate-700">
          {(entry.payload.percent * 100).toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-3">
      {payload.map((entry) => {
        const config = STATUS_CONFIG[entry.value] || STATUS_CONFIG.unknown;
        return (
          <div key={entry.value} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-slate-600">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StatusPieChart({
  revenueByStatus,
  totalTrips,
  loading,
}: StatusPieChartProps) {
  const hasData =
    revenueByStatus &&
    Object.values(revenueByStatus).some((v) => v > 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-800 text-sm">
            Phân bổ theo trạng thái
          </h3>
        </div>
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-800 text-sm">
            Phân bổ theo trạng thái
          </h3>
        </div>
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Chưa có dữ liệu
        </div>
      </div>
    );
  }

  const total = Object.values(revenueByStatus).reduce((sum, v) => sum + v, 0);

  const chartData = Object.entries(revenueByStatus)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      percent: total > 0 ? value / total : 0,
    }));

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <PieIcon className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-800 text-sm">
          Phân bổ theo trạng thái
        </h3>
      </div>
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
            {chartData.map((entry) => {
              const config = STATUS_CONFIG[entry.name] || STATUS_CONFIG.unknown;
              return (
                <Cell
                  key={entry.name}
                  fill={config.color}
                  stroke="white"
                  strokeWidth={2}
                />
              );
            })}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
