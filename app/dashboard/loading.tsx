"use client";

export default function DashboardLoading() {
  return (
    <div className="p-2 lg:p-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-40 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
              <div className="w-8 h-4 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="w-16 h-7 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Recent Trips Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="w-32 h-6 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/3 h-3 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-20 h-6 bg-slate-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
