"use client";

import { useEffect, useState } from "react";
import { Bell, Clock, Mail, Smartphone, Save, RefreshCw, Check } from "lucide-react";

interface UserSettings {
  pushEnabled: boolean;
  reminderOffset: number;
  emailEnabled: boolean;
}

// Options cho thời gian nhắc trước
const REMINDER_OPTIONS = [
  { value: 15, label: "15 phút" },
  { value: 30, label: "30 phút" },
  { value: 60, label: "1 tiếng" },
  { value: 120, label: "2 tiếng" },
  { value: 300, label: "5 tiếng" },
  { value: 1440, label: "1 ngày" },
];

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    pushEnabled: true,
    reminderOffset: 60,
    emailEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lấy cài đặt hiện tại
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError("Không thể tải cài đặt");
    } finally {
      setLoading(false);
    }
  };

  // Lưu cài đặt
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Lỗi khi lưu cài đặt");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("Lỗi khi lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  // Xử lý bật/tắt push notification
  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      // Yêu cầu quyền notification
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError("Bạn cần cho phép thông báo trong trình duyệt");
          return;
        }
      }

      // Đăng ký push subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = localStorage.getItem("vapid_public_key");

        if (vapidPublicKey) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
          });

          // Lưu subscription
          await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription.toJSON()),
          });
        }
      } catch (err) {
        console.error("Failed to subscribe push:", err);
      }
    }

    setSettings((prev) => ({ ...prev, pushEnabled: enabled }));
  };

  // Helper: Chuyển base64 sang Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-500 mt-3">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Cài đặt thông báo</h1>
          <p className="text-slate-500 mt-1">
            Quản lý cách bạn nhận thông báo từ hệ thống
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Push Notifications */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">Thông báo đẩy</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Nhận thông báo trên trình duyệt
                    </p>
                  </div>
                  <button
                    onClick={() => handlePushToggle(!settings.pushEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.pushEnabled ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.pushEnabled ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">Thông báo Email</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Nhận thông báo qua email
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, emailEnabled: !prev.emailEnabled }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.emailEnabled ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.emailEnabled ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reminder Time */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div>
                  <h3 className="font-semibold text-slate-800">Thời gian nhắc hẹn</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Nhắc trước khi chuyến xe khởi hành
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REMINDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, reminderOffset: option.value }))
                      }
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        settings.reminderOffset === option.value
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang lưu...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Đã lưu
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu cài đặt
              </>
            )}
          </button>

          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Khôi phục
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Lưu ý:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Thông báo đẩy chỉ hoạt động trên trình duyệt hỗ trợ</li>
                <li>Bạn cần cho phép thông báo trong trình duyệt</li>
                <li>Thông báo sẽ được gửi tự động khi có lịch hẹn mới</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
