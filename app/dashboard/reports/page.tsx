"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import { KpiCards } from "@/components/reports/kpi-cards";
import { RevenueChart } from "@/components/reports/revenue-chart";
import { StatusPieChart } from "@/components/reports/status-pie-chart";
import { DriverReportTab } from "@/components/reports/driver-report-tab";
import { CustomerReportTab } from "@/components/reports/customer-report-tab";
import { RouteReportTab } from "@/components/reports/route-report-tab";
import { type DateFilter } from "@/lib/date-utils";

interface KpiData {
  totalRevenue: number;
  totalProfit: number;
  totalTrips: number;
  completedTrips: number;
  unassignedTrips: number;
  assignedTrips: number;
  inProgressTrips: number;
  cancelledTrips: number;
  avgTripValue: number;
  avgProfitPerTrip: number;
  revenueByDay: Array<{ date: string; revenue: number; profit: number; trips: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; profit: number; trips: number }>;
  revenueByStatus: Record<string, number>;
  revenueChangePercent: number;
  profitChangePercent: number;
  tripsChangePercent: number;
}

interface Driver {
  id: number;
  fullName: string;
  phone?: string | null;
}

function toLocalDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const nd = new Date(d);
  nd.setDate(d.getDate() + diff);
  return nd;
}

function getMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const DATE_PRESETS = [
  { key: "today", label: "Hôm nay" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
  { key: "all", label: "Tất cả" },
] as const;

export default function ReportsPage() {
  const [statsLoading, setStatsLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState("");

  const [activeTab, setActiveTab] = useState<
    "overview" | "drivers" | "customers" | "routes" | "import"
  >("overview");

  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedDriver) params.set("driverId", selectedDriver);

      const res = await fetch(`/api/reports/stats?${params.toString()}`);
      const json = await res.json();
      if (json.success) setKpiData({ ...json.data, assignedTrips: json.data.inProgressTrips ?? 0 });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [startDate, endDate, selectedDriver]);

  const fetchDrivers = useCallback(async () => {
    setDriversLoading(true);
    try {
      const res = await fetch("/api/drivers?limit=1000");
      const json = await res.json();
      if (json.success) setDrivers(json.data || []);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    } finally {
      setDriversLoading(false);
    }
  }, []);

  // Set default filter to "Tất cả" on mount
  useEffect(() => {
    applyQuickFilter("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Auto-apply filter after 600ms debounce (only for filter panel changes)
  const scheduleFetch = (callback: () => void) => {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(callback, 600);
  };

  const applyQuickFilter = (key: string) => {
    const today = new Date();
    const todayStr = toLocalDateString(today);
    if (key === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setDateFilter("today");
    } else if (key === "week") {
      setStartDate(toLocalDateString(getWeekStart(today)));
      setEndDate(todayStr);
      setDateFilter("week");
    } else if (key === "month") {
      setStartDate(toLocalDateString(getMonthStart(today)));
      setEndDate(todayStr);
      setDateFilter("month");
    } else if (key === "year") {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      setStartDate(toLocalDateString(yearStart));
      setEndDate(todayStr);
      setDateFilter("year");
    } else {
      setStartDate("");
      setEndDate("");
      setDateFilter("all");
    }
    setStatsLoading(true);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setDateFilter("all");
    setSelectedDriver("");
    setFiltersOpen(false);
    setDriverDropdownOpen(false);
    setDriverSearch("");
  };

  const hasActiveFilters =
    dateFilter !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    selectedDriver !== "";

  const tabs = [
    { key: "overview", label: "Tổng quan" },
    { key: "drivers", label: "Tài xế" },
    { key: "customers", label: "Khách" },
    { key: "routes", label: "Tuyến" },
  ] as const;

  const selectedDriverName = drivers.find(
    (d) => d.id === Number(selectedDriver)
  )?.fullName;

  const filteredDrivers = drivers.filter(
    (d) =>
      d.fullName.toLowerCase().includes(driverSearch.toLowerCase()) ||
      (d.phone || "").includes(driverSearch)
  );

  const activeFilterCount = [
    dateFilter !== "all",
    startDate !== "",
    selectedDriver !== "",
  ].filter(Boolean).length;

  return (
    <>
      <Sidebar>
        <Header />
        <div className="p-2 lg:p-4 pb-28 lg:pb-4 space-y-3">
          {/* Quick filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {DATE_PRESETS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setStatsLoading(true);
                  applyQuickFilter(f.key);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  dateFilter === f.key
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex-1 shrink-0" />
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                filtersOpen || activeFilterCount > 0
                  ? "bg-blue-50 text-blue-600 border border-blue-200"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => fetchStats()}
              disabled={statsLoading}
              className="flex items-center justify-center w-9 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Filter Panel */}
          {filtersOpen && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3 animate-[slideDown_0.2s_ease-out]">
              {/* Date range */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2 px-1">Ngày</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDateFilter("custom");
                        scheduleFetch(fetchStats);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 px-1">Từ ngày</p>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDateFilter("custom");
                        scheduleFetch(fetchStats);
                      }}
                      min={startDate}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 px-1">Đến ngày</p>
                  </div>
                </div>
              </div>

              {/* Clear */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-medium rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 overflow-x-auto scrollbar-hide">
              <div className="flex min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab.key
                        ? "text-blue-600 border-blue-500 bg-blue-50"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-3 lg:p-4">
              {activeTab === "overview" && (
                <OverviewTab data={kpiData} loading={statsLoading} dateFilter={dateFilter} />
              )}
              {activeTab === "drivers" && (
                <DriverReportTab
                  startDate={startDate}
                  endDate={endDate}
                  selectedDriver={selectedDriver}
                />
              )}
              {activeTab === "customers" && (
                <CustomerReportTab startDate={startDate} endDate={endDate} />
              )}
              {activeTab === "routes" && (
                <RouteReportTab startDate={startDate} endDate={endDate} />
              )}
            </div>
          </div>
        </div>
      </Sidebar>
      <BottomNav />
    </>
  );
}

function OverviewTab({
  data,
  loading,
  dateFilter,
}: {
  data: KpiData | null;
  loading: boolean;
  dateFilter: string;
}) {
  if (loading || !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-2.5 border border-slate-100 animate-pulse">
              <div className="space-y-1.5">
                <div className="h-5 w-12 bg-slate-100 rounded" />
                <div className="h-3 w-10 bg-slate-50 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* KPI Summary Bar */}
      <KpiCards data={data} loading={loading} />

      {/* Charts */}
      <div className="space-y-3">
        <RevenueChart
          data={
            dateFilter === "year" || dateFilter === "all"
              ? (data.revenueByMonth || []).map((m) => ({ date: m.month, revenue: m.revenue, profit: m.profit, trips: m.trips }))
              : (data.revenueByDay || [])
          }
          loading={false}
          dateFilter={dateFilter}
        />
        <StatusPieChart
          revenueByStatus={data.revenueByStatus || {}}
          totalTrips={data.totalTrips || 0}
          loading={false}
        />
      </div>

      {/* Monthly table */}
      {data.revenueByMonth && data.revenueByMonth.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 text-sm">Doanh thu theo tháng</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Tháng</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Cuốc</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Doanh thu</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.revenueByMonth.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-xs font-medium text-slate-700">{row.month}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 text-right">{row.trips}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-800 text-right">
                      {new Intl.NumberFormat("vi-VN").format(row.revenue)}đ
                    </td>
                    <td className="px-3 py-2.5 text-xs text-blue-600 font-medium text-right">
                      {new Intl.NumberFormat("vi-VN").format(row.profit)}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
