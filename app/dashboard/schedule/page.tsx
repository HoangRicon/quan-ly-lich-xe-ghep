"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import ScheduleList from "@/components/schedule-list";

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function SchedulePage() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <>
      {toast && (
        <div className="fixed top-[calc(60px+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[99] max-w-xs w-auto px-3 py-1.5 rounded-lg shadow-xl text-xs font-medium bg-green-600 text-white">
          {toast.message}
        </div>
      )}
      <div className="page-wrapper">
        <Sidebar>
          <Header />
          <div className="p-2 lg:p-4 pb-24 lg:pb-0">
            <Link
              href="/dashboard/schedule/quick-entry"
              className="mb-3 flex min-h-[48px] items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition active:scale-[0.98] lg:hidden"
            >
              Tao cuoc nhanh
            </Link>
            <ScheduleList showToast={showToast} />
          </div>
        </Sidebar>
        <BottomNav />
      </div>
    </>
  );
}
