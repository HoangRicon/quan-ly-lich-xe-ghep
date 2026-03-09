import { AlertTriangle, Clock, Car, User } from "lucide-react";

interface AlertCard {
  id: number;
  type: "warning" | "info" | "success";
  title: string;
  message: string;
  time: string;
}

const mockAlerts: AlertCard[] = [
  {
    id: 1,
    type: "warning",
    title: "Sắp đến giờ đón",
    message: "Chuyến Hà Nội - Hải Phòng khởi hành sau 15 phút",
    time: "14:45",
  },
  {
    id: 2,
    type: "info",
    title: "Tài xế chưa xác nhận",
    message: "Tài xế Minh chưa xác nhận lịch trình 15:30",
    time: "14:40",
  },
  {
    id: 3,
    type: "success",
    title: "Khách hàng mới",
    message: "Đăng ký thành công: anh Tuấn - 0912 345 678",
    time: "14:30",
  },
];

const alertConfig = {
  warning: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: "text-orange-600",
    iconBg: "bg-orange-100",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "text-green-600",
    iconBg: "bg-green-100",
  },
};

export function AlertCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {mockAlerts.map((alert) => {
        const config = alertConfig[alert.type];
        return (
          <div
            key={alert.id}
            className={`${config.bg} border ${config.border} rounded-xl p-4`}
          >
            <div className="flex items-start gap-3">
              <div className={`${config.iconBg} p-2 rounded-lg`}>
                {alert.type === "warning" ? (
                  <AlertTriangle className={`w-4 h-4 ${config.icon}`} />
                ) : alert.type === "info" ? (
                  <Clock className={`w-4 h-4 ${config.icon}`} />
                ) : (
                  <User className={`w-4 h-4 ${config.icon}`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 text-sm">{alert.title}</p>
                  <span className="text-xs text-slate-500">{alert.time}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
