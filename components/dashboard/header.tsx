"use client";

import { useState } from "react";
import { Search, Bell, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: 1, title: "Cuốc xe mới", message: "Khách hàng Nguyễn Văn A đặt xe lúc 14:30", time: "5 phút trước", type: "new" },
    { id: 2, title: "Cảnh báo", message: "Tài xế Minh chưa xác nhận lịch trình", time: "15 phút trước", type: "warning" },
    { id: 3, title: "Hoàn thành", message: "Chuyến xe Hà Nội - Hải Phòng đã hoàn thành", time: "1 giờ trước", type: "success" },
  ];

  return (
    <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Tìm kiếm cuốc xe, khách hàng, tài xế..."
          className="pl-10 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">Thông báo</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 mt-2 rounded-full ${
                          notif.type === "new"
                            ? "bg-blue-500"
                            : notif.type === "warning"
                            ? "bg-orange-500"
                            : "bg-green-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Xem tất cả thông báo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden">
              <p className="text-sm font-medium text-slate-800">{user?.name || "Admin"}</p>
              <p className="text-xs text-slate-500">{user?.email || "admin@xeghep.com"}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
              <div className="py-1">
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                  Hồ sơ cá nhân
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                  Cài đặt
                </button>
                <hr className="my-1 border-slate-200" />
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
