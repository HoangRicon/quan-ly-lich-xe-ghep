"use client";

export default function DriversLoading() {
  return (
    <div className="p-2 lg:p-4 pb-24 lg:pb-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-40 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-9 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Driver List */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-5 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-16 h-6 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
