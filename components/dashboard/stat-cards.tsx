import { Clock, Car, Users, UserPlus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "blue" | "green" | "orange" | "purple";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-500",
    text: "text-blue-600",
  },
  green: {
    bg: "bg-green-50",
    icon: "bg-green-500",
    text: "text-green-600",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "bg-orange-500",
    text: "text-orange-600",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-500",
    text: "text-purple-600",
  },
};

export function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              trend.isPositive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{title}</p>
      </div>
    </div>
  );
}

export function StatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        color="purple"
        trend={{ value: 12, isPositive: true }}
      />
    </div>
  );
}
