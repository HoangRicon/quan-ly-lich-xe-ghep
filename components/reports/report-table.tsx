"use client";

import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
  sticky?: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReportTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  pagination: PaginationInfo | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortOrder: string;
  onSort: (key: string) => void;
  emptyMessage?: string;
  pageSize?: number;
  /** Called for each item on mobile to produce card rows like [[{label,value,color},...], [{label,value},...]] */
  cardRows?: (item: T) => Array<Array<{ label: string; value: string; color?: string }>>;
  cardAvatar?: (item: T) => React.ReactNode;
  cardTitle?: (item: T) => string;
  cardSubtitle?: (item: T) => string;
}

export function ReportTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  pagination,
  currentPage,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  emptyMessage = "Không có dữ liệu",
  pageSize = 8,
  cardRows,
  cardAvatar,
  cardTitle,
  cardSubtitle,
}: ReportTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 lg:space-y-0">
        {/* Mobile skeleton */}
        <div className="lg:hidden space-y-2">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-slate-200 animate-pulse">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-24 bg-slate-200 rounded" />
                  <div className="h-2.5 w-16 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {columns.map((col) => (
                    <th key={String(col.key)} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-3 py-3">
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="lg:hidden flex flex-col items-center justify-center py-12 text-slate-400">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <ArrowRight className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile: Card view
  const renderMobileCards = () => {
    if (!cardRows) return null;
    return (
      <div className="lg:hidden space-y-2">
        {data.map((item, idx) => {
          const rows = cardRows(item);
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
            >
              {/* Header: avatar + title */}
              <div className="flex items-center gap-2.5 mb-3">
                {cardAvatar && (
                  <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden">
                    {cardAvatar(item)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {cardTitle && (
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {cardTitle(item)}
                    </p>
                  )}
                  {cardSubtitle && (
                    <p className="text-[11px] text-slate-400 truncate">
                      {cardSubtitle(item)}
                    </p>
                  )}
                </div>
              </div>

              {/* Card metric rows */}
              {rows.map((row, ri) => (
                <div key={ri} className="flex gap-2 mb-1.5 last:mb-0">
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className="flex-1 bg-slate-50 rounded-lg p-2 min-w-0"
                    >
                      <p className="text-[10px] text-slate-400 truncate">{cell.label}</p>
                      <p className={`text-sm font-bold truncate ${cell.color || "text-slate-800"}`}>
                        {cell.value}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // Desktop: Table view
  const renderDesktopTable = () => {
    return (
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto relative">
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={`px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${
                      col.sticky ? "sticky left-0 bg-slate-50 z-20" : ""
                    } ${
                      col.sortable ? "cursor-pointer hover:text-slate-700 select-none" : ""
                    } ${col.className || ""}`}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && onSort(String(col.key))}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <span
                          className={`inline-block w-2 h-3 ${
                            sortBy === String(col.key)
                              ? "text-blue-500"
                              : "text-slate-300"
                          }`}
                        >
                          {sortBy === String(col.key) ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`px-3 py-2.5 text-xs text-slate-700 ${
                        col.sticky ? "sticky left-0 bg-white z-20 font-medium" : ""
                      } ${col.className || ""}`}
                    >
                      {col.render
                        ? col.render(item, idx)
                        : String(item[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-200 bg-slate-50">
            <p className="text-[11px] text-slate-500">
              {(currentPage - 1) * pagination.limit + 1}–
              {Math.min(currentPage * pagination.limit, pagination.total)} /{" "}
              {pagination.total.toLocaleString("vi-VN")}
            </p>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
              </button>

              {(() => {
                const total = pagination.totalPages;
                const pages: (number | "ellipsis")[] = [];
                if (total <= 5) {
                  for (let i = 1; i <= total; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push("ellipsis");
                  for (let i = Math.max(2, currentPage - 1); i <= Math.min(total - 1, currentPage + 1); i++) {
                    pages.push(i);
                  }
                  if (currentPage < total - 2) pages.push("ellipsis");
                  pages.push(total);
                }
                return pages.map((p, i) =>
                  p === "ellipsis" ? (
                    <span key={`e${i}`} className="px-1 text-slate-400 text-xs">···</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium ${
                        currentPage === p
                          ? "bg-blue-500 text-white"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Mobile: empty state */}
      {data.length === 0 ? (
        <div className="hidden lg:hidden flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <ArrowRight className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {renderMobileCards()}
          {renderDesktopTable()}
        </>
      )}
    </div>
  );
}
