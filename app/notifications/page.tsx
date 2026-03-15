"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Filter, Check, CheckCheck, Calendar, Car, User, AlertCircle, ArrowLeft, X } from "lucide-react";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";

interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

type FilterType = "all" | "unread" | "reminder" | "system";
type SortType = "newest" | "oldest";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("newest");
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [filter, sort]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const unreadParam = filter === "unread" ? "true" : "false";
      // Sử dụng API test không cần auth
      const res = await fetch(`/api/notifications/test-notifications?page=1&limit=100&unread=${unreadParam}&userId=1`);
      const data = await res.json();
      
      if (data.success) {
        let filteredNotifications = data.notifications;
        
        if (filter === "reminder") {
          filteredNotifications = filteredNotifications.filter((n: Notification) => n.type === "reminder");
        } else if (filter === "system") {
          filteredNotifications = filteredNotifications.filter((n: Notification) => n.type === "system");
        }
        
        if (sort === "oldest") {
          filteredNotifications = filteredNotifications.reverse();
        }
        
        setNotifications(filteredNotifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (ids: number[]) => {
    try {
      await fetch("/api/notifications/test-mark-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids, userId: 1 }),
      });

      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
      setSelectedNotifications([]);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const allIds = notifications.map((n) => n.id);
      await fetch("/api/notifications/test-mark-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: allIds, userId: 1 }),
      });
      
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map((n) => n.id));
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
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} tiếng trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "system":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "trip":
        return <Car className="w-5 h-5 text-green-500" />;
      case "booking":
        return <Car className="w-5 h-5 text-green-500" />;
      case "customer":
        return <User className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  // Lấy màu nền theo loại thông báo
  const getTypeBgColor = (type: string, isRead: boolean) => {
    if (isRead) return "bg-slate-100";
    switch (type) {
      case "reminder":
        return "bg-blue-100";
      case "system":
        return "bg-amber-100";
      case "trip":
      case "booking":
        return "bg-green-100";
      case "customer":
        return "bg-purple-100";
      default:
        return "bg-slate-100";
    }
  };

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const openDetail = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const closeDetail = () => {
    setSelectedNotification(null);
  };

  const filterOptions: { value: FilterType; label: string; count?: number }[] = [
    { value: "all", label: "Tất cả" },
    { value: "unread", label: "Chưa đọc", count: unreadCount },
    { value: "reminder", label: "Nhắc nhở" },
    { value: "system", label: "Hệ thống" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h1 className="text-xl font-bold text-slate-800">Thông báo</h1>
                {unreadCount > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-sm font-medium px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedNotifications.length > 0 && (
                  <>
                    <button
                      onClick={() => markAsRead(selectedNotifications)}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Đánh dấu đã đọc
                    </button>
                    <button
                      onClick={() => setSelectedNotifications([])}
                      className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Hủy
                    </button>
                  </>
                )}
                {selectedNotifications.length === 0 && unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    filter === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                  {option.count !== undefined && option.count > 0 && (
                    <span className="ml-1.5 bg-white/20 px-1.5 rounded-full text-xs">
                      {option.count}
                    </span>
                  )}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortType)}
                  className="text-sm border-0 bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-slate-500">Đang tải thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-800">Không có thông báo nào</h3>
              <p className="mt-2 text-slate-500">Bạn sẽ nhận được thông báo về các chuyến xe tại đây</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">
                  Chọn tất cả ({notifications.length})
                </span>
              </div>

              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => openDetail(notification)}
                  className={`bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    selectedNotifications.includes(notification.id)
                      ? "border-blue-500 ring-2 ring-blue-100"
                      : notification.isRead
                      ? "border-slate-200"
                      : "border-yellow-200 bg-yellow-50"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(notification.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />

                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        getTypeBgColor(notification.type, notification.isRead)
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${
                            notification.isRead ? "text-slate-700" : "text-slate-900"
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{notification.content}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                          <span>{formatTime(notification.createdAt)}</span>
                          <span className="px-2 py-0.5 bg-slate-100 rounded-full capitalize">
                            {notification.type === "reminder" ? "Nhắc nhở" : 
                             notification.type === "system" ? "Hệ thống" : 
                             notification.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead([notification.id])}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Đánh dấu đã đọc"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sidebar>

      {/* Modal Chi tiết thông báo */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeBgColor(selectedNotification.type, selectedNotification.isRead)}`}>
                  {getNotificationIcon(selectedNotification.type)}
                </div>
                <h3 className="font-semibold text-slate-800">{selectedNotification.title}</h3>
              </div>
              <button onClick={closeDetail} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="flex items-center gap-2 mb-4">
                {!selectedNotification.isRead && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    Chưa đọc
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {formatTime(selectedNotification.createdAt)}
                </span>
              </div>
              
              <p className="text-slate-700 whitespace-pre-wrap">
                {selectedNotification.content}
              </p>

              {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-2">Thông tin thêm:</p>
                  <pre className="text-xs text-slate-600 overflow-x-auto">
                    {JSON.stringify(selectedNotification.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={closeDetail}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
