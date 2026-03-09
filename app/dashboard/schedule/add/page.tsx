import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import TripForm from "@/components/trip-form";

export default function AddTripPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header - Fixed */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <Link 
            href="/dashboard/schedule" 
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Thêm cuốc xe mới</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/schedule" 
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Thêm cuốc xe mới</h1>
        </div>
      </header>

      {/* Form Content */}
      <div className="pt-16 lg:pt-20 px-4 lg:px-6 pb-6">
        <div className="max-w-2xl mx-auto">
          <TripForm />
        </div>
      </div>
    </div>
  );
}
