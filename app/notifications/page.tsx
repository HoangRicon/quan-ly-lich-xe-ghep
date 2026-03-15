"use client";

import { useEffect, useState } from "react";
import { Bell, Calendar, Check, CheckCheck, Trash2, Filter } from "lucide-react";
import Link from "next/link";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";

interface NotificationData {
  id: number;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
  }, [filter, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?page=${page}&limit=20&unread=${filter === "unread"}`
      );
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setTotalPages(data.totalPages);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Đánh dấu một thông báo đã đọc
  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch("/api/notifications/mark-as-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-as-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Xóa thông báo
  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      setNotifications((prev) => {
        const deleted = prev.find((n) => n.id === id);
        if (deleted && !deleted.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // Format thời gian hiển thị
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
    });
  };

  // Lấy icon theo loại thông báo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "trip_update":
        return <Calendar className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  // Lấy màu border theo loại
  const getBorderColor = (type: string, isRead: boolean) => {
    if (isRead) return "border-slate-200";
    switch (type) {
      case "reminder":
        return "border-l-blue-500";
      case "trip_update":
        return "border-l-green-500";
      default:
        return "border-l-slate-500";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="lg:ml-64">
        <Header />
        <main className="pb-20 lg:pb-8">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {/* Page Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-slate-800">Thông báo</h1>
              <p className="text-sm text-slate-500 mt-1">
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : "Tất cả đã đọc"}
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFilter("all");
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => {
                    setFilter("unread");
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    filter === "unread"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Chưa đọc
                  {unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            {/* Notification List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                <p className="text-slate-500 mt-3">Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Bell className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-slate-500 mt-3">Không có thông báo nào</p>
                <Link
                  href="/dashboard"
                  className="text-blue-600 text-sm font-medium hover:underline mt-2 inline-block"
                >
                  Về trang chủ
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-white rounded-xl border-l-4 ${getBorderColor(
                      notification.type,
                      notification.isRead
                    )} border border-slate-200 p-4 hover:shadow-sm transition-shadow ${
                      !notification.isRead ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-semibold ${
                              !notification.isRead ? "text-slate-900" : "text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {notification.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Đánh dấu đã đọc"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trang trước
                </button>
                <span className="text-sm text-slate-600">
                  Trang {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
