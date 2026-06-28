import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import TripForm from "@/components/trip-form";

export default function QuickCreatePage() {
  return (
    <div className="page-wrapper">
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/dashboard/schedule"
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Tạo thủ công</h1>
          <div className="w-9" />
        </div>
      </header>

      <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/schedule"
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Tạo thủ công</h1>
        </div>
      </header>

      <div className="page-scroll">
        <div className="pt-16 lg:pt-20 px-4 lg:px-6 pb-6">
          <div className="max-w-2xl mx-auto">
            <Suspense fallback={<TripFormLoader />}>
              <TripForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function TripFormLoader() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/3 mb-6" />
      <div className="space-y-4">
        <div className="h-12 bg-slate-200 rounded" />
        <div className="h-12 bg-slate-200 rounded" />
        <div className="h-12 bg-slate-200 rounded" />
      </div>
    </div>
  );
}
