"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Building2,
  Star,
  Clock,
  CheckCircle,
  Car,
  BookOpen,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import NotificationBell from "@/components/notification-bell";

interface SidebarProps {
  children?: React.ReactNode;
}

const menuItems: Array<{
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: string;
}> = [
  { href: "/dashboard/schedule", icon: Calendar, label: "Lịch trình" },
  { href: "/dashboard/drivers", icon: Users, label: "Quản lý Zom" },
  { href: "/dashboard/reports", icon: BarChart3, label: "Báo cáo" },
  { href: "/notifications", icon: Bell, label: "Thông báo" },
  { href: "/dashboard/profile", icon: User, label: "Tài khoản" },
  { href: "/dashboard/settings", icon: Settings, label: "Cài đặt" },
  { href: "/login", icon: LogOut, label: "Đăng xuất", onClick: "handleLogout" },
];

export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 lg:relative lg:inset-auto lg:h-auto">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-slate-200 h-full">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Xe Ghép</h1>
              <p className="text-xs text-slate-500">Fleet Management</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <InfoButton />
            <NotificationBell />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            
            if (item.onClick === "handleLogout") {
              return (
                <button
                  key={item.label}
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
                >
                  <item.icon className="w-5 h-5 text-red-500" />
                  {item.label}
                </button>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileOpen(false)}>
          <div className="absolute left-0 top-0 w-64 h-full bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Xe Ghép</h1>
                  <p className="text-xs text-slate-500">Fleet Management</p>
                </div>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="p-1">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1 overflow-y-auto flex-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                
                if (item.onClick === "handleLogout") {
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setIsMobileOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
                    >
                      <item.icon className="w-5 h-5 text-red-500" />
                      {item.label}
                    </button>
                  );
                }
                
                return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  {item.label}
                </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content - scrollable on mobile, overflow-hidden on desktop */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 h-full">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 safe-area-inset-top flex-shrink-0">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">Xe Ghép</span>
          </div>
          <div className="flex items-center gap-1">
            <InfoButton />
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden h-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function InfoButton() {
  const [open, setOpen] = useState(false);

  const features = [
    { icon: Calendar, label: "Quản lý lịch xe", desc: "Tạo & sắp xếp chuyến xe dễ dàng" },
    { icon: Users, label: "Phân công tài xế", desc: "Gán tài xế nhanh chóng" },
    { icon: BarChart3, label: "Tính lợi nhuận", desc: "Tự động theo công thức" },
    { icon: Clock, label: "Nhắc lịch tự động", desc: "Thông báo trước giờ khởi hành" },
    { icon: CheckCircle, label: "Nhiều tài khoản", desc: "Hỗ trợ nhiều đơn vị kinh doanh" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="Giới thiệu sản phẩm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)} />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-full z-50 bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Phần mềm Xe Ghép</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-slate-800 text-sm">Giới thiệu sản phẩm</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sản phẩm kết hợp <strong className="text-slate-800">kỹ thuật của HTool</strong> và{" "}
              <strong className="text-slate-800">ý tưởng từ Lê Cường</strong> — giúp quản lý lịch xe ghép,
              phân công tài xế, tính lợi nhuận và theo dõi doanh thu một cách hiệu quả.
            </p>
          </div>

          <div className="space-y-1.5">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-slate-600 leading-relaxed">
              Đội ngũ kỹ thuật: <strong className="text-slate-800">HTool</strong>
              <br />
              Sản phẩm ý tưởng: <strong className="text-slate-800">Lê Cường</strong>
            </p>
          </div>

          <a
            href="/dashboard/help"
            className="flex items-center gap-2 mt-3 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-xs"
          >
            <BookOpen className="w-4 h-4" />
            Hướng dẫn sử dụng
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>

          <a
            href="https://zalo.me/0878836354"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-3 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold rounded-xl shadow transition-all text-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="30" fill="#fff" />
              <path d="M30 14c-8.8 0-16 5.8-16 12.9 0 3.4 1.5 6.5 4.2 8.9L16 46l10.6-3.7c1.3.4 2.7.6 4.1.6 8.8 0 16-5.8 16-12.9S38.8 14 30 14z" fill="#0068FF" />
              <path d="M25.5 25.5c.3-2.2 1.7-3.2 3-4.1.4-.3.6-.2.9 0 .4.3 1.7 1.2 1.9 1.5.3.3.4.5.1.9-.3.4-1.1 1.8-2.1 2.9-1.6 1.8-2.2 2-2.7 2-.5 0-.6-.4-1.2-.7-.6-.4-1.7-1.3-2.6-2.4-.7-.8-1.2-1.8-1.3-2-.3-.5 0-.8.2-1 .2-.2.4-.5.6-.7.2-.2.4-.4.2-.7-.2-.3-1.6-2.2-2.2-3-.5-.7-1-.6-1.3-.4z" fill="#0068FF" />
            </svg>
            Liên hệ HTool qua Zalo: 0878836354
          </a>
        </div>
      </div>
    </>
  );
}

