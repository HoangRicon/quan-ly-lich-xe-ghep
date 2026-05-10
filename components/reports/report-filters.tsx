"use client";

import { useState, useEffect } from "react";
import { Calendar, Filter, X, ChevronDown, Search } from "lucide-react";
import { type DateFilter, toLocalDateString, getWeekStart, getMonthStart } from "@/lib/date-utils";

interface Driver {
  id: number;
  fullName: string;
  phone?: string | null;
}

interface ReportFiltersProps {
  dateFilter: DateFilter;
  setDateFilter: (f: DateFilter) => void;
  startDate: string;
  setStartDate: (s: string) => void;
  endDate: string;
  setEndDate: (s: string) => void;
  selectedDriver: string;
  setSelectedDriver: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onApply: () => void;
  onClear: () => void;
  drivers: Driver[];
  driversLoading: boolean;
  hasActiveFilters: boolean;
}

export function ReportFilters({
  dateFilter,
  setDateFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedDriver,
  setSelectedDriver,
  statusFilter,
  setStatusFilter,
  onApply,
  onClear,
  drivers,
  driversLoading,
  hasActiveFilters,
}: ReportFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState("");
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);

  // Draft state
  const [draftDateFilter, setDraftDateFilter] = useState<DateFilter>(dateFilter);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const [draftSelectedDriver, setDraftSelectedDriver] = useState(selectedDriver);
  const [draftStatusFilter, setDraftStatusFilter] = useState(statusFilter);

  // Sync drafts when props change (e.g. clear all)
  useEffect(() => {
    setDraftDateFilter(dateFilter);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftSelectedDriver(selectedDriver);
    setDraftStatusFilter(statusFilter);
  }, [dateFilter, startDate, endDate, selectedDriver, statusFilter]);

  const handleQuickFilter = (filter: DateFilter) => {
    const today = new Date();
    const todayStr = toLocalDateString(today);

    if (filter === "today") {
      setDraftStartDate(todayStr);
      setDraftEndDate(todayStr);
    } else if (filter === "week") {
      setDraftStartDate(toLocalDateString(getWeekStart(today)));
      setDraftEndDate(todayStr);
    } else if (filter === "month") {
      setDraftStartDate(toLocalDateString(getMonthStart(today)));
      setDraftEndDate(todayStr);
    } else if (filter === "all") {
      setDraftStartDate("");
      setDraftEndDate("");
    }
    setDraftDateFilter(filter);
  };

  const handleApply = () => {
    setDateFilter(draftDateFilter);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setSelectedDriver(draftSelectedDriver);
    setStatusFilter(draftStatusFilter);
    onApply();
    setFiltersOpen(false);
  };

  const handleClear = () => {
    setDraftDateFilter("all");
    setDraftStartDate("");
    setDraftEndDate("");
    setDraftSelectedDriver("");
    setDraftStatusFilter("all");
    onClear();
    setFiltersOpen(false);
  };

  const isDraftDirty =
    draftDateFilter !== dateFilter ||
    draftStartDate !== startDate ||
    draftEndDate !== endDate ||
    draftSelectedDriver !== selectedDriver ||
    draftStatusFilter !== statusFilter;

  const quickFilters: Array<{ key: DateFilter; label: string }> = [
    { key: "today", label: "Hôm nay" },
    { key: "week", label: "Tuần này" },
    { key: "month", label: "Tháng này" },
    { key: "all", label: "Tất cả" },
  ];

  const selectedDriverName = drivers.find(
    (d) => d.id === Number(draftSelectedDriver)
  )?.fullName;

  const filteredDrivers = drivers.filter(
    (d) =>
      d.fullName.toLowerCase().includes(driverSearch.toLowerCase()) ||
      (d.phone || "").includes(driverSearch)
  );

  const statusOptions = [
    { value: "all", label: "Tất cả" },
    { value: "scheduled", label: "Chưa gán" },
    { value: "in_progress", label: "Đang chạy" },
    { value: "completed", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Quick filters row */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {quickFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleQuickFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                draftDateFilter === f.key
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtersOpen || isDraftDirty
                ? "bg-blue-50 text-blue-600"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Bộ lọc
            {isDraftDirty && (
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {filtersOpen && (
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Từ ngày
              </label>
              <input
                type="date"
                value={draftStartDate}
                onChange={(e) => {
                  setDraftStartDate(e.target.value);
                  setDraftDateFilter("custom");
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Đến ngày
              </label>
              <input
                type="date"
                value={draftEndDate}
                onChange={(e) => {
                  setDraftEndDate(e.target.value);
                  setDraftDateFilter("custom");
                }}
                min={draftStartDate}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Driver dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Tài xế
            </label>
            <div className="relative">
              <button
                onClick={() => setDriverDropdownOpen(!driverDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-left hover:border-slate-300 transition-colors"
              >
                <span className={draftSelectedDriver ? "text-slate-800" : "text-slate-400"}>
                  {selectedDriverName || "Tất cả tài xế"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {driverDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm tài xế..."
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <button
                      onClick={() => {
                        setDraftSelectedDriver("");
                        setDriverSearch("");
                        setDriverDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-50 ${
                        !draftSelectedDriver ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-600"
                      }`}
                    >
                      Tất cả tài xế
                    </button>
                    {driversLoading ? (
                      <div className="px-3 py-2 text-xs text-slate-400">Đang tải...</div>
                    ) : filteredDrivers.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">Không tìm thấy</div>
                    ) : (
                      filteredDrivers.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            setDraftSelectedDriver(String(d.id));
                            setDriverSearch("");
                            setDriverDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-50 ${
                            draftSelectedDriver === String(d.id)
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-slate-600"
                          }`}
                        >
                          <div className="font-medium">{d.fullName}</div>
                          {d.phone && (
                            <div className="text-slate-400 text-xs">{d.phone}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Trạng thái
            </label>
            <select
              value={draftStatusFilter}
              onChange={(e) => setDraftStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Áp dụng
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Xóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
