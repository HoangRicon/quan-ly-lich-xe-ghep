"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, BarChart2, Settings, Plus } from "lucide-react";

const navItems = [
  { href: "/dashboard/schedule", icon: Calendar, label: "Cuốc xe" },
  { href: "/dashboard/drivers", icon: Users, label: "Zom" },
  { href: "/dashboard/schedule/add", icon: Plus, label: "Thêm", isFab: true },
  { href: "/dashboard/reports", icon: BarChart2, label: "Báo cáo" },
  { href: "/dashboard/settings", icon: Settings, label: "Cài đặt" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          if (item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-6"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive ? "text-blue-600" : "text-slate-500"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
