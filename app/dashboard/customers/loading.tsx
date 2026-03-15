"use client";

export default function CustomersLoading() {
  return (
    <div className="p-2 lg:p-4 pb-24 lg:pb-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="w-40 h-6 bg-slate-200 rounded animate-pulse" />
          <div className="w-24 h-9 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="w-1/3 h-5 bg-slate-200 rounded animate-pulse" />
              <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
