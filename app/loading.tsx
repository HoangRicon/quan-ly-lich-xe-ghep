"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-32 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-20 h-8 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
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

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="w-40 h-6 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-16 h-6 bg-slate-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Loading Indicator */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm text-slate-600 font-medium">Đang tải...</span>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
}
