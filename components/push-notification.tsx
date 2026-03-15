"use client";

import { useEffect, useState } from "react";

interface PushNotificationProps {
  onSubscribe?: (subscription: PushSubscription) => void;
  onError?: (error: Error) => void;
}

export default function PushNotification({ onSubscribe, onError }: PushNotificationProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [publicKey, setPublicKey] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Kiểm tra hỗ trợ
    if ("Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true);
      fetchPublicKey();
      checkSubscription();
    }
  }, []);

  const fetchPublicKey = async () => {
    try {
      const res = await fetch("/api/push/send");
      const data = await res.json();
      if (data.publicKey) {
        setPublicKey(data.publicKey);
      }
    } catch (error) {
      console.error("Failed to fetch public key:", error);
    }
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Failed to check subscription:", error);
    }
  };

  const subscribe = async () => {
    if (!publicKey) {
      onError?.(new Error("Chưa có public key"));
      return;
    }

    setLoading(true);
    try {
      // Đăng ký service worker
      const registration = await navigator.serviceWorker.ready;

      // Chuyển publicKey từ base64 sang Uint8Array
      const vapidPublicKey = urlBase64ToUint8Array(publicKey);

      // Đăng ký push notification
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey as BufferSource,
      });

      // Lưu subscription vào server
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      const data = await res.json();

      if (data.success) {
        setIsSubscribed(true);
        onSubscribe?.(subscription);
        
        // Yêu cầu quyền hiển thị notification
        if (Notification.permission === "granted") {
          console.log("Push notification subscribed successfully");
        }
      } else {
        onError?.(new Error(data.error || "Failed to subscribe"));
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Xóa khỏi server
        await fetch(`/api/push?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        });

        // Hủy subscription khỏi browser
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Unsubscribe error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm chuyển base64 sang Uint8Array
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

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          isSubscribed
            ? "bg-red-100 text-red-600 hover:bg-red-200"
            : "bg-blue-600 text-white hover:bg-blue-700"
        } disabled:opacity-50`}
      >
        {loading ? "Đang xử lý..." : isSubscribed ? "Tắt thông báo" : "Bật thông báo"}
      </button>
      
      {Notification.permission === "denied" && (
        <span className="text-xs text-red-500">
          (Đã chặn thông báo)
        </span>
      )}
    </div>
  );
}

// Hook để sử dụng push notification
export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    }
    return false;
  };

  return {
    permission,
    subscription,
    isSupported: typeof window !== "undefined" && "Notification" in window,
    requestPermission,
  };
}
