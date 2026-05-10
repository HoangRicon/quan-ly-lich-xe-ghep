import { Clock, Car, Users, UserPlus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "blue" | "green" | "orange" | "violet";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50/70",
    iconBg: "bg-blue-500",
    icon: "text-white",
    border: "border-blue-200/60",
    text: "text-blue-600",
  },
  green: {
    bg: "bg-emerald-50/70",
    iconBg: "bg-emerald-500",
    icon: "text-white",
    border: "border-emerald-200/60",
    text: "text-emerald-600",
  },
  orange: {
    bg: "bg-amber-50/70",
    iconBg: "bg-amber-500",
    icon: "text-white",
    border: "border-amber-200/60",
    text: "text-amber-600",
  },
  violet: {
    bg: "bg-violet-50/70",
    iconBg: "bg-violet-500",
    icon: "text-white",
    border: "border-violet-200/60",
    text: "text-violet-600",
  },
};

export function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`bg-white rounded-2xl p-4 border ${colors.border} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${colors.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        {trend && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
              trend.isPositive
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                : "bg-red-50 text-red-500 border border-red-100"
            }`}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{title}</p>
      </div>
    </div>
  );
}

export function StatCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      <StatCard
        title="Cuốc xe chờ gán"
        value={12}
        icon={Clock}
        color="orange"
        trend={{ value: 8, isPositive: false }}
      />
      <StatCard
        title="Cuốc xe đang chạy"
        value={28}
        icon={Car}
        color="blue"
        trend={{ value: 15, isPositive: true }}
      />
      <StatCard
        title="Tài xế đang rảnh"
        value={8}
        icon={Users}
        color="green"
      />
      <StatCard
        title="Khách hàng mới"
        value={24}
        icon={UserPlus}
        color="violet"
        trend={{ value: 12, isPositive: true }}
      />
    </div>
  );
}
