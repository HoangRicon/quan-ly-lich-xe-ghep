"use client";

import { useState, useEffect } from "react";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  MessageSquare,
  Bell,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Smartphone,
  Clock,
  Car,
  Users,
  Check,
  X,
  AlertCircle,
  Copy,
  RefreshCw,
  Zap,
  Save,
  Mail,
  Moon,
  Sun,
  Network,
  Eye,
  EyeOff,
} from "lucide-react";

// Toast Component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slide-in-right ${
        type === "success"
          ? "bg-green-50 border-green-200 text-green-800"
          : type === "error"
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-blue-50 border-blue-200 text-blue-800"
      }`}
    >
      {type === "success" && <CheckCircle2 className="w-5 h-5" />}
      {type === "error" && <AlertCircle className="w-5 h-5" />}
      {type === "info" && <Bell className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/10 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Clipboard copy function - works on HTTP/HTTPS/localhost/IP
function copyToClipboard(text: string, onSuccess?: () => void, onError?: () => void) {
  // Method 1: Try Clipboard API with permission check
  if (navigator.clipboard && navigator.permissions) {
    navigator.permissions.query({ name: 'clipboard-write' as PermissionName }).then((result) => {
      if (result.state === 'granted' || result.state === 'prompt') {
        navigator.clipboard!.writeText(text).then(() => {
          if (onSuccess) onSuccess();
        }).catch(() => {
          fallbackCopy(text, onSuccess, onError);
        });
      } else {
        fallbackCopy(text, onSuccess, onError);
      }
    }).catch(() => {
      fallbackCopy(text, onSuccess, onError);
    });
    return;
  }
  
  // Method 2: Try Clipboard API without permissions check
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      if (onSuccess) onSuccess();
    }).catch(() => {
      fallbackCopy(text, onSuccess, onError);
    });
    return;
  }
  
  // Method 3: Fallback for HTTP/non-secure contexts
  fallbackCopy(text, onSuccess, onError);
}

function fallbackCopy(text: string, onSuccess?: () => void, onError?: () => void) {
  // Create textarea element
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  
  // Select and copy
  let success = false;
  if (el.selectionStart !== undefined && el.selectionEnd !== undefined) {
    el.selectionStart = 0;
    el.selectionEnd = text.length;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      success = false;
    }
  }
  
  document.body.removeChild(el);
  
  if (success && onSuccess) {
    onSuccess();
  } else if (onError) {
    onError();
  }
}

// Tab Components
function ConnectionSettings() {
  const [zaloConfig, setZaloConfig] = useState({
    oaId: "",
    appId: "",
    secretKey: "",
    accessToken: "",
  });
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "",
    fromName: "",
  });
  const [testEmailTo, setTestEmailTo] = useState("");
  const [zaloStatus, setZaloStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load settings from database on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system-settings?category=zalo");
      const data = await res.json();
      if (data.success && data.settings) {
        const settings: Record<string, string> = {};
        data.settings.forEach((s: { key: string; value: string }) => {
          settings[s.key] = s.value;
        });
        setZaloConfig({
          oaId: settings.zalo_oa_id || "",
          appId: settings.zalo_app_id || "",
          secretKey: settings.zalo_secret_key || "",
          accessToken: settings.zalo_access_token || "",
        });
      }

      const emailRes = await fetch("/api/system-settings?category=email");
      const emailData = await emailRes.json();
      if (emailData.success && emailData.settings) {
        const settings: Record<string, string> = {};
        emailData.settings.forEach((s: { key: string; value: string }) => {
          settings[s.key] = s.value;
        });
        setEmailConfig({
          smtpHost: settings.smtp_host || "",
          smtpPort: settings.smtp_port || "587",
          smtpUser: settings.smtp_user || "",
          // Giá trị secret được API mask thành "••••••••" => không dùng để lưu/gửi
          smtpPassword: settings.smtp_password?.includes("•") ? "" : (settings.smtp_password || ""),
          fromEmail: settings.from_email || "",
          fromName: settings.from_name || "Xe Ghép",
        });
        setTestEmailTo(settings.from_email || "");
      }
    } catch (error) {
      console.error("Load settings error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveZalo = async () => {
    setSaving(true);
    try {
      const keys = [
        { key: "zalo_oa_id", value: zaloConfig.oaId, category: "zalo" },
        { key: "zalo_app_id", value: zaloConfig.appId, category: "zalo" },
        { key: "zalo_secret_key", value: zaloConfig.secretKey, category: "zalo", isSecret: true },
        { key: "zalo_access_token", value: zaloConfig.accessToken, category: "zalo", isSecret: true },
      ];

      for (const k of keys) {
        await fetch("/api/system-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(k),
        });
      }
      showToast("Đã lưu cấu hình Zalo", "success");
    } catch (error) {
      showToast("Lỗi khi lưu cấu hình", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      const keys: Array<{ key: string; value: string; category: string; isSecret?: boolean }> = [
        { key: "smtp_host", value: emailConfig.smtpHost, category: "email" },
        { key: "smtp_port", value: emailConfig.smtpPort, category: "email" },
        { key: "smtp_user", value: emailConfig.smtpUser, category: "email" },
        { key: "from_email", value: emailConfig.fromEmail, category: "email" },
        { key: "from_name", value: emailConfig.fromName, category: "email" },
      ];
      // Chỉ lưu mật khẩu khi người dùng nhập mới (tránh ghi đè bằng chuỗi rỗng/mask)
      if (emailConfig.smtpPassword?.trim()) {
        keys.push({ key: "smtp_password", value: emailConfig.smtpPassword, category: "email", isSecret: true });
      }

      for (const k of keys) {
        await fetch("/api/system-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(k),
        });
      }
      showToast("Đã lưu cấu hình Email", "success");
    } catch (error) {
      showToast("Lỗi khi lưu cấu hình", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestZalo = async () => {
    if (!zaloConfig.oaId || !zaloConfig.accessToken) {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Lỗi: Vui lòng nhập đầy đủ OA ID và Access Token`]);
      setZaloStatus("error");
      return;
    }

    setZaloStatus("checking");
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Đang kiểm tra kết nối...`]);

    // Simulate API call
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      if (isSuccess) {
        setZaloStatus("success");
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✓ Kết nối thành công!`,
          `[${new Date().toLocaleTimeString()}] OA Info: Tên OA - Xe Ghép Official`,
          `[${new Date().toLocaleTimeString()}] Số tin nhắn gửi hôm nay: 45`,
          `[${new Date().toLocaleTimeString()}] Hạn mức ZNS còn lại: 955/1000`,
        ]);
      } else {
        setZaloStatus("error");
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✗ Lỗi kết nối: Invalid access token`,
          `[${new Date().toLocaleTimeString()}] Vui lòng kiểm tra lại Access Token`,
        ]);
      }
    }, 2000);
  };

  const handleTestEmail = async () => {
    if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.fromEmail) {
      showToast("Vui lòng nhập đầy đủ SMTP Host/Username và Email người gửi", "error");
      return;
    }
    if (!testEmailTo?.trim()) {
      showToast("Vui lòng nhập Email nhận để test", "error");
      return;
    }

    setEmailStatus("testing");
    try {
      const res = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "booking_confirmation",
          email: testEmailTo.trim(),
          data: {
            customer_name: "Test User",
            pickup_location: "Hà Nội",
            dropoff_location: "Hải Phòng",
            price: "150.000",
            booking_time: "15:00 - 15/03/2026"
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus("success");
        showToast("Email test đã được gửi", "success");
      } else {
        setEmailStatus("error");
        showToast(data.error || "Gửi email thất bại", "error");
      }
    } catch (error) {
      setEmailStatus("error");
      showToast("Lỗi kết nối", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zalo OA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Cấu hình Zalo OA
          </CardTitle>
          <CardDescription>Kết nối với Zalo Official Account để gửi tin nhắn ZNS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Banner */}
          <div
            className={`rounded-xl p-4 border ${
              zaloStatus === "success"
                ? "bg-green-50 border-green-200"
                : zaloStatus === "error"
                ? "bg-red-50 border-red-200"
                : zaloStatus === "checking"
                ? "bg-blue-50 border-blue-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {zaloStatus === "checking" ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                ) : zaloStatus === "success" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : zaloStatus === "error" ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <Settings className="w-6 h-6 text-slate-400" />
                )}
                <div>
                  <p className="font-semibold text-slate-800">
                    {zaloStatus === "checking"
                      ? "Đang kiểm tra..."
                      : zaloStatus === "success"
                      ? "Đã kết nối"
                      : zaloStatus === "error"
                      ? "Lỗi kết nối"
                      : "Chưa kết nối"}
                  </p>
                </div>
              </div>
              <Button
                variant={zaloStatus === "success" ? "outline" : "default"}
                size="sm"
                onClick={handleTestZalo}
                disabled={zaloStatus === "checking"}
              >
                {zaloStatus === "checking" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang kiểm tra...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Kiểm tra</>
                )}
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oaId">OA ID</Label>
              <Input
                id="oaId"
                placeholder="VD: 1234567890"
                value={zaloConfig.oaId}
                onChange={(e) => setZaloConfig({ ...zaloConfig, oaId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appId">App ID</Label>
              <Input
                id="appId"
                placeholder="VD: 1234567890123456789"
                value={zaloConfig.appId}
                onChange={(e) => setZaloConfig({ ...zaloConfig, appId: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Nhập Secret Key"
                value={zaloConfig.secretKey}
                onChange={(e) => setZaloConfig({ ...zaloConfig, secretKey: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="Nhập Access Token"
                value={zaloConfig.accessToken}
                onChange={(e) => setZaloConfig({ ...zaloConfig, accessToken: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveZalo} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Đang lưu..." : "Lưu cấu hình Zalo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email SMTP Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Cấu hình Email SMTP
          </CardTitle>
          <CardDescription>Cấu hình SMTP để gửi email thông báo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div
            className={`rounded-xl p-4 border ${
              emailStatus === "success"
                ? "bg-green-50 border-green-200"
                : emailStatus === "error"
                ? "bg-red-50 border-red-200"
                : emailStatus === "testing"
                ? "bg-blue-50 border-blue-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {emailStatus === "testing" ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                ) : emailStatus === "success" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : emailStatus === "error" ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <Mail className="w-6 h-6 text-slate-400" />
                )}
                <div>
                  <p className="font-semibold text-slate-800">
                    {emailStatus === "testing"
                      ? "Đang gửi test..."
                      : emailStatus === "success"
                      ? "Sẵn sàng gửi"
                      : emailStatus === "error"
                      ? "Lỗi kết nối"
                      : "Chưa cấu hình"}
                  </p>
                </div>
              </div>
              <Button
                variant={emailStatus === "success" ? "outline" : "default"}
                size="sm"
                onClick={handleTestEmail}
                disabled={emailStatus === "testing"}
              >
                {emailStatus === "testing" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi...</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" /> Gửi test</>
                )}
              </Button>
            </div>
            <div className="mt-3">
              <Label htmlFor="testEmailTo">Email nhận test</Label>
              <Input
                id="testEmailTo"
                placeholder="VD: ban@domain.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-slate-500">
                Gợi ý: để nhanh nhất, nhập chính email của bạn (hoặc trùng với Email người gửi).
              </p>
            </div>
          </div>

          {/* SMTP Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Host</Label>
              <Input
                id="smtpHost"
                placeholder="VD: smtp.gmail.com"
                value={emailConfig.smtpHost}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input
                id="smtpPort"
                placeholder="VD: 587"
                value={emailConfig.smtpPort}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUser">SMTP Username</Label>
              <Input
                id="smtpUser"
                placeholder="Email đăng nhập SMTP"
                value={emailConfig.smtpUser}
                onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">SMTP Password</Label>
              <div className="relative">
                <Input
                  id="smtpPassword"
                  type={showEmailPassword ? "text" : "password"}
                  placeholder="Mật khẩu SMTP"
                  value={emailConfig.smtpPassword}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Email người gửi</Label>
              <Input
                id="fromEmail"
                placeholder="VD: noreply@xeghep.com"
                value={emailConfig.fromEmail}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">Tên người gửi</Label>
              <Input
                id="fromName"
                placeholder="VD: Xe Ghép"
                value={emailConfig.fromName}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveEmail} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Đang lưu..." : "Lưu cấu hình Email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nhật ký kết nối</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <div key={index} className={`mb-1 ${log.includes("✓") ? "text-green-400" : log.includes("✗") ? "text-red-400" : "text-slate-400"}`}>
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ZNS Template Manager
function ZNSTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({});
  const [customMessages, setCustomMessages] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = (templateId: number) => {
    const message = customMessages[templateId] || "";
    if (!message) {
      showToast("Chưa có nội dung để sao chép", "error");
      return;
    }
    copyToClipboard(
      message,
      () => showToast("Đã sao chép vào clipboard", "success"),
      () => showToast("Sao chép thất bại, vui lòng thử lại", "error")
    );
  };

  const templates = [
    {
      id: 1,
      name: "Xác nhận đặt xe thành công",
      templateId: "e44f23k4m9023",
      status: "approved",
      createdAt: "2024-01-15",
      params: ["customer_name", "pickup_location", "dropoff_location", "price", "booking_time"],
      preview:
        "Xin chào {{customer_name}}!\n\nĐặt xe thành công!\n\n📍 Tuyến: {{pickup_location}} → {{dropoff_location}}\n💰 Giá: {{price}}đ\n🕐 Thời gian: {{booking_time}}\n\nCảm ơn bạn đã sử dụng dịch vụ Xe Ghép!",
    },
    {
      id: 2,
      name: "Thông tin tài xế nhận chuyến",
      templateId: "f55g34n5p1234",
      status: "approved",
      createdAt: "2024-01-18",
      params: ["customer_name", "driver_name", "license_plate", "phone_number", "eta"],
      preview:
        "Xin chào {{customer_name}}!\n\nTài xế {{driver_name}} đã nhận chuyến!\n\n🚗 Biển số: {{license_plate}}\n📞 Điện thoại: {{phone_number}}\n⏰ Đến trong: {{eta}} phút",
    },
    {
      id: 3,
      name: "Nhắc lịch khởi hành",
      templateId: "g66h45q6r3456",
      status: "approved",
      createdAt: "2024-01-20",
      params: ["customer_name", "departure_time", "pickup_location", "driver_name"],
      preview:
        "Xin chào {{customer_name}}!\n\n⏰ Lịch khởi hành: {{departure_time}}\n📍 Điểm đón: {{pickup_location}}\n🚗 Tài xế: {{driver_name}}\n\nVui lòng có mặt đúng giờ!",
    },
    {
      id: 4,
      name: "Hoàn thành chuyến đi",
      templateId: "h77i56s7t4567",
      status: "pending",
      createdAt: "2024-02-01",
      params: ["customer_name", "driver_name", "rating_link"],
      preview:
        "Xin chào {{customer_name}}!\n\nCảm ơn bạn đã sử dụng Xe Ghép!\n\nTài xế {{driver_name}} cảm ơn bạn đã đồng hành.\n\n⭐ Đánh giá ngay: {{rating_link}}",
    },
  ];

  const systemVariables = [
    { key: "customer_name", label: "Tên khách hàng", example: "Nguyễn Văn A" },
    { key: "pickup_location", label: "Điểm đón", example: "Hà Nội" },
    { key: "dropoff_location", label: "Điểm trả", example: "Hải Phòng" },
    { key: "price", label: "Giá tiền", example: "150.000" },
    { key: "booking_time", label: "Thời gian đặt", example: "14:30 - 15/03/2026" },
    { key: "driver_name", label: "Tên tài xế", example: "Trần Văn B" },
    { key: "license_plate", label: "Biển số xe", example: "29A-123.45" },
    { key: "phone_number", label: "Số điện thoại", example: "0912 345 678" },
    { key: "eta", label: "Thời gian đến", example: "15" },
    { key: "departure_time", label: "Giờ khởi hành", example: "15:00" },
    { key: "rating_link", label: "Link đánh giá", example: "xeghep.com/danh-gia/abc" },
    { key: "trip_date", label: "Ngày đi", example: "15/03/2026" },
    { key: "trip_time", label: "Giờ khởi hành", example: "15:00" },
    { key: "seats_booked", label: "Số ghế đặt", example: "2" },
    { key: "total_price", label: "Tổng tiền", example: "300.000" },
    { key: "vehicle_name", label: "Tên xe", example: "Toyota Innova" },
    { key: "company_name", label: "Tên công ty", example: "Xe Ghép Việt" },
    { key: "hotline", label: "Hotline", example: "1900 xxxx" },
  ];

  const insertVariable = (templateId: number, variableKey: string) => {
    const current = customMessages[templateId] || "";
    setCustomMessages({ ...customMessages, [templateId]: current + `{{${variableKey}}}` });
  };

  const getStatusBadge = (status: string) => {
    return status === "approved" ? (
      <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Đã duyệt
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        <Clock className="w-3 h-3 mr-1" />
        Chờ duyệt
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Template ZNS</CardTitle>
          <CardDescription>Quản lý các mẫu tin nhắn Zalo Notification Service</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên template</TableHead>
                <TableHead>Template ID</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  className={selectedTemplate === template.id ? "bg-blue-50" : ""}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="font-mono text-xs">{template.templateId}</TableCell>
                  <TableCell>{getStatusBadge(template.status)}</TableCell>
                  <TableCell>{template.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <ChevronRight className="w-4 h-4 mr-1" />
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Template Detail / Preview */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết & Preview Template</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const template = templates.find((t) => t.id === selectedTemplate);
              if (!template) return null;
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Preview */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-3">Xem trước tin nhắn</h4>
                    <div className="bg-slate-100 rounded-2xl p-4 max-w-sm mx-auto">
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <Smartphone className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Xe Ghép</p>
                            <p className="text-xs text-slate-400">Official Account</p>
                          </div>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-3 text-sm whitespace-pre-line text-slate-700">
                          {template.preview
                            .split("{{")
                            .map((part, i) =>
                              i === 0
                                ? part
                                : part.replace(/}}.*$/, "").replace(/}$/, (match, offset, string) => {
                                    const varName = string.substring(0, string.indexOf("}}"));
                                    return `{{${varName}}}`;
                                  })
                            )
                            .map((part, i) => {
                              const varMatch = part.match(/{{(\w+)}}/);
                              if (varMatch) {
                                const varName = varMatch[1];
                                const example =
                                  systemVariables.find((v) => v.key === varName)?.example || varName;
                                return (
                                  <span key={i} className="bg-blue-100 text-blue-600 px-1 rounded">
                                    {example}
                                  </span>
                                );
                              }
                              return part;
                            })}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-right">Zalo Notification Service</p>
                      </div>
                    </div>
                  </div>

                  {/* Variable Mapping */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-3">Gán biến hệ thống</h4>
                    <div className="space-y-3">
                      {template.params.map((param) => (
                        <div key={param} className="flex items-center gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-slate-500">{param}</Label>
                            <Input
                              placeholder="Chọn biến..."
                              value={variableMappings[param] || ""}
                              onChange={(e) =>
                                setVariableMappings({ ...variableMappings, [param]: e.target.value })
                              }
                            />
                          </div>
                          <div className="w-8 flex justify-center">
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-slate-500">Biến hệ thống</Label>
                            <select
                              className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                              value={variableMappings[param] || ""}
                              onChange={(e) =>
                                setVariableMappings({ ...variableMappings, [param]: e.target.value })
                              }
                            >
                              <option value="">-- Chọn --</option>
                              {systemVariables.map((v) => (
                                <option key={v.key} value={v.key}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Message Editor */}
                  <div className="lg:col-span-2 mt-4">
                    <h4 className="text-sm font-medium text-slate-600 mb-3">Tùy chỉnh nội dung tin nhắn</h4>
                    <div className="space-y-3">
                      <textarea
                        className="w-full h-32 rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="Nhập nội dung tin nhắn tùy chỉnh (để trống sẽ dùng mẫu mặc định từ Zalo)..."
                        value={customMessages[template.id] || ""}
                        onChange={(e) => setCustomMessages({ ...customMessages, [template.id]: e.target.value })}
                      />
                      
                      {/* Quick Insert Variables */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 font-medium">Chèn biến nhanh:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {systemVariables.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => insertVariable(template.id, v.key)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
                              title={`Click để chèn: ${v.label}`}
                            >
                              {`{{${v.key}}}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-xs text-slate-500">
                          Sử dụng biến: {template.params.map((p) => `{{${p}}}`).join(", ")}
                        </p>
                        <Button size="sm" variant="outline" onClick={() => handleCopy(template.id)}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
      
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Custom Toggle Switch Component
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-14 h-7 rounded-full transition-colors ${
        enabled ? "bg-blue-500" : "bg-slate-300"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
          enabled ? "translate-x-7" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// Auto Send Triggers
function AutoSendTriggers() {
  const [triggers, setTriggers] = useState([
    { 
      id: 1, 
      name: "Đặt xe thành công", 
      description: "Gửi xác nhận cho khách hàng khi đặt xe", 
      icon: Check, 
      enabled: true, 
      template: "Xác nhận đặt xe thành công",
      timing: "immediate",
      customMessage: ""
    },
    { 
      id: 2, 
      name: "Tài xế nhận chuyến", 
      description: "Gửi thông tin tài xế và biển số xe", 
      icon: Car, 
      enabled: true, 
      template: "Thông tin tài xế nhận chuyến",
      timing: "immediate",
      customMessage: ""
    },
    { 
      id: 3, 
      name: "Nhắc lịch khởi hành", 
      description: "Tự động gửi trước giờ khởi hành", 
      icon: Clock, 
      enabled: false, 
      template: "Nhắc lịch khởi hành",
      timing: "30",
      customMessage: ""
    },
    { 
      id: 4, 
      name: "Hoàn thành chuyến đi", 
      description: "Gửi lời cảm ơn và yêu cầu đánh giá", 
      icon: Users, 
      enabled: true, 
      template: "Hoàn thành chuyến đi",
      timing: "immediate",
      customMessage: ""
    },
  ]);

  const [expandedTrigger, setExpandedTrigger] = useState<number | null>(null);

  const toggleTrigger = (id: number) => {
    setTriggers(
      triggers.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const updateTrigger = (id: number, field: string, value: string) => {
    setTriggers(
      triggers.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const timingOptions = [
    { value: "immediate", label: "Ngay lập tức" },
    { value: "15", label: "15 phút trước" },
    { value: "30", label: "30 phút trước" },
    { value: "60", label: "1 giờ trước" },
    { value: "120", label: "2 giờ trước" },
    { value: "1440", label: "1 ngày trước" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sự kiện kích hoạt gửi tin tự động</CardTitle>
          <CardDescription>Cấu hình các trigger để gửi tin nhắn ZNS tự động</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {triggers.map((trigger) => (
            <div
              key={trigger.id}
              className={`rounded-lg border transition-all ${
                trigger.enabled ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
              }`}
            >
              {/* Main Row */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      trigger.enabled ? "bg-blue-100" : "bg-slate-200"
                    }`}
                  >
                    <trigger.icon
                      className={`w-5 h-5 ${trigger.enabled ? "text-blue-600" : "text-slate-400"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-slate-800 text-sm">{trigger.name}</h4>
                    <p className="text-xs text-slate-500">{trigger.description}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Template: {trigger.template}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <ToggleSwitch enabled={trigger.enabled} onChange={() => toggleTrigger(trigger.id)} />
                </div>
              </div>

              {/* Expanded Settings */}
              {trigger.enabled && (
                <div className="px-4 pb-4 border-t border-blue-100 pt-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Timing */}
                    {trigger.id === 3 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Thời gian gửi</Label>
                        <select
                          className="w-full h-8 rounded-lg border border-input bg-white px-2.5 text-sm"
                          value={trigger.timing}
                          onChange={(e) => updateTrigger(trigger.id, "timing", e.target.value)}
                        >
                          {timingOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Custom Message */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs text-slate-500">
                        Tin nhắn tùy chỉnh (để trống để dùng mẫu mặc định)
                      </Label>
                      <Input
                        placeholder="Nhập tin nhắn tùy chỉnh..."
                        value={trigger.customMessage || ""}
                        onChange={(e) => updateTrigger(trigger.id, "customMessage", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {trigger.customMessage && (
                    <div className="mt-3 p-2 bg-white rounded border border-blue-100">
                      <p className="text-xs text-slate-500 mb-1">Preview:</p>
                      <p className="text-sm text-slate-700">{trigger.customMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Tổng kết cấu hình</h3>
              <p className="text-blue-100 text-sm mt-1">
                {triggers.filter((t) => t.enabled).length} / {triggers.length} triggers đang hoạt động
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6" />
              <span className="text-2xl font-bold">
                {triggers.filter((t) => t.enabled).length * 15}
              </span>
              <span className="text-blue-100">tin/ngày ước tính</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}

// Notification Settings Tab Component
function NotificationSettingsTab() {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    reminderOffset: 60,
    emailEnabled: true,
    notificationHour: 8,
    quietHoursStart: null as number | null,
    quietHoursEnd: null as number | null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestEmail = async () => {
    const to = window.prompt("Nhập email nhận để test:");
    if (!to?.trim()) return;

    try {
      const res = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "booking_confirmation",
          email: to.trim(),
          data: {
            customer_name: "Test User",
            pickup_location: "Hà Nội",
            dropoff_location: "Hải Phòng",
            price: "150.000",
            booking_time: new Date().toLocaleString("vi-VN"),
          },
        }),
      });
      const data = await res.json();
      if (data?.success) {
        showToast("Email test đã được gửi", "success");
      } else {
        showToast(data?.error || "Gửi email thất bại", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối", "error");
    }
  };

  const REMINDER_OPTIONS = [
    { value: 15, label: "15 phút" },
    { value: 30, label: "30 phút" },
    { value: 60, label: "1 tiếng" },
    { value: 120, label: "2 tiếng" },
    { value: 300, label: "5 tiếng" },
    { value: 1440, label: "1 ngày" },
  ];

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

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Bạn cần cho phép thông báo trong trình duyệt");
        return;
      }
    }
    setSettings((prev) => ({ ...prev, pushEnabled: enabled }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                  <p className="text-sm text-slate-500 mt-0.5">Nhận thông báo trên trình duyệt</p>
                </div>
                <button
                  onClick={() => handlePushToggle(!settings.pushEnabled)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    settings.pushEnabled ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.pushEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {settings.pushEnabled && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/push/test", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: "Test Thông báo đẩy",
                            message: "Đây là tin nhắn test từ hệ thống Xe Ghép!"
                          })
                        });
                        const data = await res.json();
                        if (data.success) {
                          showToast(data.message || "Đã gửi thông báo test!", "success");
                        } else {
                          showToast(data.error || "Gửi thất bại", "error");
                        }
                      } catch (err) {
                        showToast("Lỗi kết nối", "error");
                      }
                    }}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Gửi test
                  </Button>
                </div>
              )}
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
                  <p className="text-sm text-slate-500 mt-0.5">Nhận thông báo qua email</p>
                </div>
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, emailEnabled: !prev.emailEnabled }))}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    settings.emailEnabled ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.emailEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {settings.emailEnabled && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestEmail}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Gửi email test
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reminder Time */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div>
                <h3 className="font-semibold text-slate-800">Thời gian nhắc hẹn</h3>
                <p className="text-sm text-slate-500 mt-0.5">Nhắc trước khi chuyến xe khởi hành</p>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REMINDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSettings((prev) => ({ ...prev, reminderOffset: option.value }))}
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

        {/* Notification Hour */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sun className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div>
                <h3 className="font-semibold text-slate-800">Giờ gửi thông báo</h3>
                <p className="text-sm text-slate-500 mt-0.5">Thời điểm gửi thông báo tự động trong ngày</p>
              </div>
              <div className="mt-4">
                <select
                  value={settings.notificationHour}
                  onChange={(e) => setSettings((prev) => ({ ...prev, notificationHour: parseInt(e.target.value) }))}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Moon className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Giờ yên lặng</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Tắt thông báo trong khung giờ này</p>
                </div>
                <button
                  onClick={() => {
                    if (settings.quietHoursStart !== null) {
                      setSettings((prev) => ({ ...prev, quietHoursStart: null, quietHoursEnd: null }));
                    } else {
                      setSettings((prev) => ({ ...prev, quietHoursStart: 22, quietHoursEnd: 7 }));
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    settings.quietHoursStart !== null ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.quietHoursStart !== null ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {settings.quietHoursStart !== null && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Từ</span>
                    <select
                      value={settings.quietHoursStart ?? 22}
                      onChange={(e) => setSettings((prev) => ({ ...prev, quietHoursStart: parseInt(e.target.value) }))}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">đến</span>
                    <select
                      value={settings.quietHoursEnd ?? 7}
                      onChange={(e) => setSettings((prev) => ({ ...prev, quietHoursEnd: parseInt(e.target.value) }))}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</> :
           saved ? <><Check className="w-4 h-4 mr-2" /> Đã lưu</> :
           <><Save className="w-4 h-4 mr-2" /> Lưu cài đặt</>}
        </Button>
        <Button variant="outline" onClick={fetchSettings}>
          <RefreshCw className="w-4 h-4 mr-2" /> Khôi phục
        </Button>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
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

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Main Settings Page
export default function NotificationSettingsPage() {
  const [activeTab, setActiveTab] = useState<"connections" | "templates" | "triggers" | "notifications">("connections");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const tabs = [
    { id: "connections", label: "Cấu hình kết nối", icon: Settings },
    { id: "templates", label: "Quản lý Template", icon: MessageSquare },
    // { id: "triggers", label: "Thiết lập gửi tin", icon: Bell },
    { id: "notifications", label: "Cài đặt thông báo", icon: Smartphone },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Cài đặt thông báo</h1>
            <p className="text-slate-500 mt-1">Quản lý kết nối Zalo và gửi tin nhắn tự động</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "connections" && <ConnectionSettings />}
          {activeTab === "templates" && <ZNSTemplates />}
          {/* {activeTab === "triggers" && <AutoSendTriggers />} */}
          {activeTab === "notifications" && <NotificationSettingsTab />}
        </div>
      </Sidebar>
      <BottomNav />

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
