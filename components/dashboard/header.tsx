"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, User, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface HeaderProps {
  user?: {
    name: string;
    email: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from API
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?page=1&limit=5");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes}p`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}ngày`;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "reminder":
        return "bg-blue-500";
      case "trip_update":
        return "bg-green-500";
      default:
        return "bg-slate-500";
    }
  };

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
      <div className="flex items-center gap-4" ref={dropdownRef}>
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
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    Không có thông báo nào
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer ${
                        !notif.isRead ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 mt-2 rounded-full ${getNotificationColor(notif.type)}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notif.content}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Xem tất cả thông báo
                </Link>
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
                <Link href="/dashboard/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Cài đặt
                </Link>
                <hr className="my-1 border-slate-200" />
                <Link href="/api/auth/logout" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  Đăng xuất
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
