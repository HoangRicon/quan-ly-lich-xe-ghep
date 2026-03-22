"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  CalendarDays,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTripStatuses, statusColorClasses } from "@/lib/useTripStatuses";

type DateFilter = "all" | "today" | "week" | "month" | "custom";

interface ZomStat {
  id: number;
  fullName: string | null;
  profitRate: number;
  completedCount: number;
  assignedCount: number;
  totalCount: number;
  actualRevenue: number;
  expectedRevenue: number;
  actualProfit: number;
  expectedProfit: number;
  formulas: Array<{
    id: number;
    name: string;
    tripType: string;
    seats: number | null;
    points: number;
    minPrice?: number | null;
    maxPrice?: number | null;
    isActive: boolean;
  }>;
}

interface Trip {
  id: number;
  title: string;
  departure: string;
  destination: string;
  departureTime: string;
  arrivalTime: string | null;
  price: number;
  profit: number | null;
  tripDirection?: string;
  tripType?: string;
  pointsEarned?: number | null;
  profitRate?: number | null;
  matchedFormulaId?: number | null;
  status: string;
  totalSeats: number;
  notes: string | null;
  createdAt: string;
  driver: {
    id: number;
    fullName: string;
    phone: string;
    profitRate?: number;
  } | null;
  customer: { id: number; name: string; phone: string } | null;
  customers: Array<{
    customer: { id: number; name: string; phone: string } | null;
    seats: number;
    status: string;
  }>;
  passengerCount: number;
}

const TRIP_TYPE_SHORT: Record<string, string> = {
  ghep: "Ghép",
  ghep_roundtrip: "Ghép 2C",
  bao: "Bao",
  bao_roundtrip: "Bao 2C",
};

const TRIP_TYPE_COLORS: Record<string, string> = {
  ghep: "bg-blue-100 text-blue-700",
  ghep_roundtrip: "bg-cyan-100 text-cyan-700",
  bao: "bg-amber-100 text-amber-700",
  bao_roundtrip: "bg-orange-100 text-orange-700",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const quickFilterLabel: Record<DateFilter, string> = {
  all: "Tất cả",
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  custom: "Tùy chỉnh",
};

function getQuickDateRange(filter: DateFilter) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  let start = "";
  let end = "";

  if (filter === "today") {
    start = todayStr;
    end = todayStr;
  } else if (filter === "week") {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    start = weekStart.toISOString().split("T")[0];
    end = todayStr;
  } else if (filter === "month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    start = monthStart.toISOString().split("T")[0];
    end = todayStr;
  }

  return { start, end };
}

export default function ZomStatistics() {
  const { statuses, map: statusMap } = useTripStatuses();

  // Main stats filter
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Main search
  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  // Main pagination
  const [mainPage, setMainPage] = useState(1);
  const [mainLimit, setMainLimit] = useState(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("zom-stat-limit");
      const n = raw ? parseInt(raw, 10) : NaN;
      return (n && n > 0) ? n : 10;
    }
    return 10;
  });
  const [totalZoms, setTotalZoms] = useState(0);

  const [zoms, setZoms] = useState<ZomStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [selectedZom, setSelectedZom] = useState<ZomStat | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Modal filters - default to "today"
  const [modalDateFilter, setModalDateFilter] = useState<DateFilter>("today");
  const [modalStartDate, setModalStartDate] = useState(() => {
    const { start } = getQuickDateRange("today");
    return start;
  });
  const [modalEndDate, setModalEndDate] = useState(() => {
    const { end } = getQuickDateRange("today");
    return end;
  });
  const [draftModalStart, setDraftModalStart] = useState("");
  const [draftModalEnd, setDraftModalEnd] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState<string>("all");
  const [modalSearch, setModalSearch] = useState("");
  const [modalSearchDraft, setModalSearchDraft] = useState("");
  const [showModalCustomPicker, setShowModalCustomPicker] = useState(false);

  // Modal pagination
  const [modalPage, setModalPage] = useState(1);
  const [modalTrips, setModalTrips] = useState<Trip[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalCompleted, setModalCompleted] = useState(0);
  const [modalAssigned, setModalAssigned] = useState(0);
  const [modalLimit, setModalLimit] = useState(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("zom-detail-limit");
      const n = raw ? parseInt(raw, 10) : NaN;
      return [5, 8, 10, 20].includes(n) ? n : 8;
    }
    return 8;
  });

  const applyQuickFilter = (filter: DateFilter) => {
    const { start, end } = getQuickDateRange(filter);
    setDateFilter(filter);
    setStartDate(start);
    setEndDate(end);
    setShowCustomPicker(false);
    setMainPage(1);
  };

  const applyCustomDateRange = () => {
    setDateFilter("custom");
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setShowCustomPicker(false);
    setMainPage(1);
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/drivers/stats?${params}`);
      const data = await res.json();
      if (data.success) {
        let filtered = data.data as ZomStat[];
        if (searchApplied) {
          const q = searchApplied.toLowerCase();
          filtered = filtered.filter(
            (z) =>
              z.fullName?.toLowerCase().includes(q)
          );
        }
        setZoms(filtered);
        setTotalZoms(filtered.length);
      }
    } catch (error) {
      console.error("Fetch zom stats error:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchApplied]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setMainPage(1);
  }, [searchApplied]);

  const openDetail = (zom: ZomStat) => {
    setSelectedZom(zom);
    setModalDateFilter("today");
    const { start, end } = getQuickDateRange("today");
    setModalStartDate(start);
    setModalEndDate(end);
    setDraftModalStart("");
    setDraftModalEnd("");
    setModalStatusFilter("all");
    setModalSearch("");
    setModalSearchDraft("");
    setModalPage(1);
    setShowModalCustomPicker(false);
    setModalOpen(true);
  };

  const applyModalQuickFilter = (filter: DateFilter) => {
    if (filter === "custom") {
      setShowModalCustomPicker(true);
      return;
    }
    setShowModalCustomPicker(false);
    const { start, end } = getQuickDateRange(filter);
    setModalDateFilter(filter);
    setModalStartDate(start);
    setModalEndDate(end);
    setModalPage(1);
  };

  const applyModalCustomRange = () => {
    setModalDateFilter("custom");
    setModalStartDate(draftModalStart);
    setModalEndDate(draftModalEnd);
    setShowModalCustomPicker(false);
    setModalPage(1);
  };

  const fetchModalTrips = useCallback(async () => {
    if (!selectedZom) return;
    setModalLoading(true);
    try {
      const paramsAll = new URLSearchParams();
      paramsAll.set("driverId", String(selectedZom.id));
      paramsAll.set("page", "1");
      paramsAll.set("limit", "5000");
      if (modalStartDate) paramsAll.set("startDate", modalStartDate);
      if (modalEndDate) paramsAll.set("endDate", modalEndDate);
      if (modalStatusFilter && modalStatusFilter !== "all") {
        paramsAll.set("status", modalStatusFilter);
      }
      if (modalSearch) paramsAll.set("search", modalSearch);

      const [allRes] = await Promise.all([
        fetch(`/api/drivers/trips?${paramsAll}`),
      ]);
      const allData = await allRes.json();

      if (allData.success) {
        const all = allData.data as Trip[];
        setModalTotal(all.length);
        setModalCompleted(all.filter((t) => t.status === "completed").length);
        setModalAssigned(all.filter((t) => t.status !== "completed" && t.status !== "cancelled").length);

        const totalP = Math.ceil(all.length / modalLimit);
        setModalTotalPages(totalP || 1);
        const safePage = Math.min(modalPage, totalP || 1);
        const start = (safePage - 1) * modalLimit;
        setModalTrips(all.slice(start, start + modalLimit));
      }
    } catch (error) {
      console.error("Fetch modal trips error:", error);
    } finally {
      setModalLoading(false);
    }
  }, [selectedZom, modalPage, modalStartDate, modalEndDate, modalStatusFilter, modalSearch, modalLimit]);

  useEffect(() => {
    fetchModalTrips();
  }, [fetchModalTrips]);

  useEffect(() => {
    setModalPage(1);
  }, [modalLimit]);

  const submitModalSearch = () => {
    setModalSearch(modalSearchDraft);
    setModalPage(1);
  };

  const getStatusInfo = (statusKey: string) => {
    const s = statusMap.get(statusKey);
    if (s) {
      const colors = statusColorClasses(s.color);
      return { label: s.label, colors };
    }
    return { label: statusKey, colors: statusColorClasses("slate") };
  };

  // Pagination helpers
  const PAGE_SIZE = mainLimit;
  const paginatedZoms = zoms.slice((mainPage - 1) * PAGE_SIZE, mainPage * PAGE_SIZE);
  const totalPages = Math.ceil(totalZoms / PAGE_SIZE);

  const isBao = (tripType?: string) =>
    tripType === "bao" || tripType === "bao_roundtrip";

  return (
    <div>
      {/* Search + Filters Row */}
      <div className="flex flex-col gap-2 mb-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên Zom..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearchApplied(searchDraft);
              }
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {(["all", "today", "week", "month"] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => applyQuickFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                dateFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {quickFilterLabel[f]}
            </button>
          ))}
          <button
            onClick={() => {
              setShowCustomPicker(!showCustomPicker);
              if (!showCustomPicker) {
                setDraftStartDate(startDate);
                setDraftEndDate(endDate);
              }
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              dateFilter === "custom"
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CalendarDays className="w-3 h-3" />
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {showCustomPicker && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm"
              />
              <span className="text-slate-400 text-sm">—</span>
              <input
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            <button
              onClick={applyCustomDateRange}
              disabled={!draftStartDate || !draftEndDate || draftStartDate > draftEndDate}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Áp dụng
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats Bar — reflect current filter */}
      {zoms.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">Hoàn thành</div>
            <div className="text-base font-bold text-slate-800">
              {zoms.reduce((s, z) => s + z.completedCount, 0)}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">Đã gán</div>
            <div className="text-base font-bold text-slate-800">
              {zoms.reduce((s, z) => s + z.assignedCount, 0)}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">Lợi nhuận</div>
            <div className="text-sm font-bold text-green-600 truncate">
              {formatCurrency(zoms.reduce((s, z) => s + z.actualProfit, 0))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">LN dự kiến</div>
            <div className="text-sm font-bold text-teal-600 truncate">
              {formatCurrency(zoms.reduce((s, z) => s + z.expectedProfit, 0))}
            </div>
          </div>
        </div>
      )}

      {/* Zom Cards */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="flex-1 h-3.5 bg-slate-200 rounded w-24" />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-12 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : zoms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Chưa có dữ liệu thống kê</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedZoms.map((zom) => (
              <div
                key={zom.id}
                onClick={() => openDetail(zom)}
                className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                {/* Header compact */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {(zom.fullName || "?")?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">
                        {zom.fullName || "(Chưa đặt tên)"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </div>

                {/* Stats compact */}
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-green-50 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-green-700 leading-tight">
                      {formatCurrency(zom.actualProfit)}
                    </div>
                    <div className="text-[8px] text-green-500">Lợi nhuận</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-blue-700 leading-tight">
                      {formatCurrency(zom.expectedProfit)}
                    </div>
                    <div className="text-[8px] text-blue-500">LN dự kiến</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-emerald-700 leading-tight">
                      {zom.completedCount}
                    </div>
                    <div className="text-[8px] text-emerald-500">Hoàn thành</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-1.5 text-center">
                    <div className="text-sm font-bold text-amber-700 leading-tight">
                      {zom.assignedCount}
                    </div>
                    <div className="text-[8px] text-amber-500">Đã gán</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(totalPages > 1 || totalZoms > 0) && (
            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {totalZoms > 0
                      ? `${(mainPage - 1) * PAGE_SIZE + 1}–${Math.min(mainPage * PAGE_SIZE, totalZoms)} / ${totalZoms}`
                      : "0 / 0"}
                  </span>
                  <select
                  value={mainLimit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setMainLimit(val);
                    localStorage.setItem("zom-stat-limit", String(val));
                    setMainPage(1);
                  }}
                  className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMainPage((p) => Math.max(1, p - 1))}
                  disabled={mainPage <= 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-xs text-slate-600 min-w-[3rem] text-center">
                  {mainPage}/{totalPages}
                </span>
                <button
                  onClick={() => setMainPage((p) => Math.min(totalPages, p + 1))}
                  disabled={mainPage >= totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          {selectedZom && (
            <>
              <DialogHeader className="px-4 pt-4 pb-2 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {(selectedZom.fullName || "?")?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-base">
                      {selectedZom.fullName || "(Chưa đặt tên)"}
                    </DialogTitle>
                    <p className="text-xs text-slate-500">
                      {modalCompleted} hoàn thành · {modalAssigned} đã gán
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Modal Filters */}
              <div className="px-4 pt-3 pb-1 flex-shrink-0 space-y-2">
                {/* Quick filters row */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                  {(["all", "today", "week", "month"] as DateFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => applyModalQuickFilter(f)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        modalDateFilter === f
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {quickFilterLabel[f]}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (modalDateFilter === "custom") {
                        setShowModalCustomPicker(false);
                        setModalDateFilter("all");
                        const { start, end } = getQuickDateRange("all");
                        setModalStartDate(start);
                        setModalEndDate(end);
                      } else {
                        setShowModalCustomPicker(true);
                        setDraftModalStart(modalStartDate);
                        setDraftModalEnd(modalEndDate);
                      }
                    }}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      modalDateFilter === "custom"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <CalendarDays className="w-3 h-3" />
                  </button>
                </div>

                {/* Custom date range */}
                {showModalCustomPicker && (
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={draftModalStart}
                        onChange={(e) => setDraftModalStart(e.target.value)}
                        className="flex-1 h-8 px-2 rounded-lg border border-slate-200 text-xs"
                      />
                      <span className="text-slate-400 text-xs">—</span>
                      <input
                        type="date"
                        value={draftModalEnd}
                        onChange={(e) => setDraftModalEnd(e.target.value)}
                        className="flex-1 h-8 px-2 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <button
                      onClick={applyModalCustomRange}
                      disabled={!draftModalStart || !draftModalEnd || draftModalStart > draftModalEnd}
                      className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Áp dụng
                    </button>
                  </div>
                )}

                {/* Status + Search row */}
                <div className="flex gap-2">
                  <select
                    value={modalStatusFilter}
                    onChange={(e) => { setModalStatusFilter(e.target.value); setModalPage(1); }}
                    className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs flex-shrink-0"
                  >
                    <option value="all">Tất cả</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm tuyến, điểm đi..."
                      value={modalSearchDraft}
                      onChange={(e) => setModalSearchDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitModalSearch(); }}
                      className="w-full pl-8 pr-4 h-8 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-400"
                    />
                  </div>
                  <button
                    onClick={submitModalSearch}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex-shrink-0"
                  >
                    Tìm
                  </button>
                </div>
              </div>

              {/* Trip List */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                {modalLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 animate-pulse">
                        <div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1.5" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : modalTrips.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    Không có cuốc xe nào
                  </div>
                ) : (
                  modalTrips.map((trip) => {
                    const statusInfo = getStatusInfo(trip.status);
                    const tripType = trip.tripType || "ghep";
                    const showPassengers = !isBao(tripType) && trip.passengerCount > 0;
                    return (
                      <div key={trip.id} className="bg-slate-50 rounded-xl p-3">
                        {/* Route */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1 mb-1">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TRIP_TYPE_COLORS[tripType] || "bg-slate-100 text-slate-700"}`}>
                                {TRIP_TYPE_SHORT[tripType] || "Ghép"}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.colors.bg} ${statusInfo.colors.text}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-800 truncate">{trip.departure}</span>
                              <span className="text-slate-400 text-xs flex-shrink-0">→</span>
                              <span className="text-sm font-bold text-slate-700 truncate">{trip.destination}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-base font-bold text-green-600 leading-tight">
                              +{formatCurrency(Number(trip.profit))}
                            </div>
                            {trip.profit != null && (
                              <div className="text-xs font-medium text-slate-700">
                                {formatCurrency(Number(trip.price))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                            <span>{formatTime(trip.departureTime)}</span>
                            <span className="text-slate-400 font-normal text-xs">{formatDate(trip.departureTime)}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            isBao(tripType)
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {isBao(tripType) ? "Bao xe" : `${trip.passengerCount} khách`}
                          </span>
                        </div>

                        {/* Customer with clickable phone */}
                        {trip.customer && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span>Khách:</span>
                            <span className="font-medium text-slate-600">{trip.customer.name}</span>
                            <a
                              href={`tel:${trip.customer.phone}`}
                              className="flex items-center gap-0.5 text-blue-500 hover:text-blue-700 font-medium"
                            >
                              {trip.customer.phone}
                              <Phone className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 flex-shrink-0 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Hiển thị</span>
                  <select
                    value={modalLimit}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setModalLimit(n);
                      localStorage.setItem("zom-detail-limit", String(n));
                    }}
                    className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <option value="5">5</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </select>
                  <span className="text-xs text-slate-500">
                    / trang · {modalTotal} kết quả
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                    disabled={modalPage <= 1}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-xs text-slate-600 min-w-[3rem] text-center">
                    {modalPage}/{modalTotalPages || 1}
                  </span>
                  <button
                    onClick={() => setModalPage((p) => Math.min(modalTotalPages, p + 1))}
                    disabled={modalPage >= modalTotalPages}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
