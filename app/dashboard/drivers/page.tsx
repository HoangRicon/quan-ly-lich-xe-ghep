"use client";

import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import DriverList from "@/components/driver-list";
import ZomStatistics from "@/components/zom-statistics";
import { useState } from "react";
import { BarChart3, List } from "lucide-react";

export default function DriversPage() {
  const [activeTab, setActiveTab] = useState<"list" | "stats">("list");

  return (
    <div className="page-wrapper">
      <Sidebar>
        <Header />
        <div className="scroll-wrapper">
          <div className="p-4 lg:p-6 pb-24 lg:pb-0">
            {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="w-4 h-4" />
              Danh sách
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "stats"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Thống kê
            </button>
          </div>

          {activeTab === "list" ? <DriverList /> : <ZomStatistics />}
        </div>
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
