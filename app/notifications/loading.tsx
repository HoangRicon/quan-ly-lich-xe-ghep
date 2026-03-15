"use client";

export default function NotificationsPageLoading() {
  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-28 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="w-24 h-8 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-20 h-8 bg-slate-200 rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-5 bg-slate-200 rounded animate-pulse" />
                <div className="w-full h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/4 h-3 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
