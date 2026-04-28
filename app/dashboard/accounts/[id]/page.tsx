"use client";

import { useState, useEffect, useMemo, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Download,
  Calendar,
  DollarSign,
  ChevronDown,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Car,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { type DateFilter, toLocalDateString, getWeekStart, getMonthStart, parseLocalDate, addDays } from "@/lib/date-utils";

interface Trip {
  id: number;
  departure: string;
  destination: string;
  departureTime: string;
  status: string;
  price: number;
  pointsEarned?: number | null;
  profit?: number | null;
  notes?: string;
  driver?: { id: number; fullName: string; phone?: string | null };
  customers: Array<{
    customer: { id: number; name: string; phone: string };
    seats?: number;
    status?: string;
  }>;
}

interface Driver { id: number; fullName: string }

interface AccountInfo {
  id: number;
  name: string;
  slug: string;
  userCount: number;
  createdAt: string;
}

function safeMoney(val: any): number {
  const n = Number(val) || 0;
  return n > 0 && n < 100000000 ? n : 0;
}

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accountId = parseInt(id);

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState("");

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [draftDateFilter, setDraftDateFilter] = useState<DateFilter>("all");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftSelectedDriver, setDraftSelectedDriver] = useState("");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const isDraftDirty =
    draftStartDate !== startDate ||
    draftEndDate !== endDate ||
    draftSelectedDriver !== selectedDriver ||
    draftStatusFilter !== statusFilter ||
    draftDateFilter !== dateFilter;

  const draftDateRangeInvalid = draftStartDate && draftEndDate && draftStartDate > draftEndDate;

  const dateFilterForButtons = useMemo(() => {
    if (dateFilter !== "all" && dateFilter !== "custom") return dateFilter;
    if (startDate && endDate && startDate === endDate) return "today";
    if (startDate && endDate) return "custom";
    return "all";
  }, [dateFilter, startDate, endDate]);

  const handleQuickFilter = (filter: DateFilter) => {
    const today = new Date();
    const todayStr = toLocalDateString(today);
    let nextStart = "";
    let nextEnd = "";

    if (filter === "today") {
      nextStart = todayStr;
      nextEnd = todayStr;
    } else if (filter === "week") {
      nextStart = toLocalDateString(getWeekStart(today));
      nextEnd = todayStr;
    } else if (filter === "month") {
      nextStart = toLocalDateString(getMonthStart(today));
      nextEnd = todayStr;
    } else if (filter === "all") {
      nextStart = "";
      nextEnd = "";
    }

    setDateFilter(filter);
    setStartDate(nextStart);
    setEndDate(nextEnd);
  };

  const applyDraftFilters = () => {
    setDateFilter(draftDateFilter);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setSelectedDriver(draftSelectedDriver);
    setStatusFilter(draftStatusFilter);
    setPage(1);
  };

  const clearAllFilters = () => {
    setDraftDateFilter("all");
    setDraftStartDate("");
    setDraftEndDate("");
    setDraftSelectedDriver("");
    setDraftStatusFilter("all");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
    setSelectedDriver("");
    setStatusFilter("all");
    setPage(1);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const baseParams = new URLSearchParams();
      baseParams.set("accountId", String(accountId));
      if (selectedDriver) baseParams.set("driverId", selectedDriver);
      if (statusFilter && statusFilter !== "all") baseParams.set("status", statusFilter);

      const currentParams = new URLSearchParams(baseParams);
      if (startDate) currentParams.set("startDate", startDate);
      if (endDate) currentParams.set("endDate", endDate);

      const [tripsRes, allTripsRes, accountRes] = await Promise.all([
        fetch(`/api/admin/accounts/${accountId}/trips?${currentParams.toString()}&limit=500`),
        fetch(`/api/admin/accounts/${accountId}/trips?${baseParams.toString()}&limit=5000`),
        fetch(`/api/admin/accounts/${accountId}`),
      ]);

      const [tripsData, allTripsData, accountData] = await Promise.all([
        tripsRes.json(),
        allTripsRes.json(),
        accountRes.json(),
      ]);

      if (accountData.success) setAccount(accountData.account);
      if (tripsData.success) { setTrips(tripsData.data); setDrivers(tripsData.drivers || []); }
      if (allTripsData.success) setAllTrips(allTripsData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [accountId, startDate, endDate, selectedDriver, statusFilter]);

  useEffect(() => {
    setFiltersOpen(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  }, []);

  useEffect(() => { setPage(1); }, [startDate, endDate, selectedDriver, statusFilter]);

  const stats = useMemo(() => {
    const completedTrips = trips.filter((t) => t.status === "completed");
    const totalRevenue = completedTrips.reduce((sum, t) => sum + safeMoney(t.price), 0);
    const totalProfit = completedTrips.reduce((sum, t) => sum + safeMoney(t.profit), 0);
    const uniqueCustomers = new Set(trips.flatMap((t) => t.customers.map((c) => c.customer.id))).size;

    const prevStart = startDate ? toLocalDateString(addDays(parseLocalDate(startDate), -1)) : "";
    const prevEnd = startDate ? toLocalDateString(addDays(parseLocalDate(endDate || startDate), -1)) : "";

    const prevTrips = allTrips.filter((t) => {
      const d = t.departureTime?.split("T")[0] || "";
      if (prevStart && prevEnd) return d >= prevStart && d <= prevEnd;
      if (prevStart) return d >= prevStart;
      return true;
    });
    const prevCompleted = prevTrips.filter((t) => t.status === "completed");
    const prevPeriodRevenue = prevCompleted.reduce((sum, t) => {
      if (selectedDriver && t.driver?.id !== parseInt(selectedDriver)) return sum;
      return sum + safeMoney(t.price);
    }, 0);

    return {
      totalRevenue,
      totalProfit,
      totalTrips: trips.length,
      uniqueCustomers,
      avgTripValue: completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0,
      completedTrips: completedTrips.length,
      completedRevenue: totalRevenue,
      completedProfit: totalProfit,
      revenueChange: prevPeriodRevenue > 0 ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : 0,
      tripsChange: 0,
    };
  }, [trips, allTrips, startDate, endDate, selectedDriver, statusFilter]);

  const paginatedTrips = useMemo(() => {
    const start = (page - 1) * pageSize;
    return trips.slice(start, start + pageSize);
  }, [trips, page]);

  const totalPages = Math.ceil(trips.length / pageSize);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Hoàn thành</span>;
      case "in_progress": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Đang chạy</span>;
      case "scheduled": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Chờ</span>;
      case "cancelled": return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Hủy</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const handleExport = () => {
    const exportData = trips.map((trip) => ({
      "Mã cuốc": trip.id,
      "Ngày đón": formatDate(trip.departureTime),
      "Giờ đón": formatTime(trip.departureTime),
      "Điểm đi": trip.departure,
      "Điểm đến": trip.destination,
      "Zom": trip.driver?.fullName || "Chưa gán",
      "Giá tiền": trip.price || 0,
      "Trạng thái": trip.status === "completed" ? "Hoàn thành" : trip.status === "in_progress" ? "Đang chạy" : trip.status === "scheduled" ? "Chờ" : "Hủy",
      "Khách hàng": trip.customers?.[0]?.customer?.name || "-",
      "SĐT khách": trip.customers?.[0]?.customer?.phone || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao cao");
    ws["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 }];
    XLSX.writeFile(wb, `bao-cao-${account?.slug || id}-${startDate || "all"}.xlsx`);
  };

  const handleExportCustomersDetail = () => {
    const rows: any[] = [];
    trips.forEach((trip) => {
      (trip.customers || []).forEach((tc) => {
        if (!tc.customer) return;
        rows.push({
          "Tên khách": tc.customer.name,
          "SĐT khách": tc.customer.phone,
          "Mã cuốc": trip.id,
          "Ngày đón": formatDate(trip.departureTime),
          "Giờ đón": formatTime(trip.departureTime),
          "Điểm đi": trip.departure,
          "Điểm đến": trip.destination,
          "Zom": trip.driver?.fullName || "Chưa gán",
          "Giá tiền": trip.price || 0,
          "Lợi nhuận": trip.profit || 0,
          "Trạng thái": trip.status === "completed" ? "Hoàn thành" : trip.status === "in_progress" ? "Đang chạy" : trip.status === "scheduled" ? "Chờ" : trip.status === "cancelled" ? "Hủy" : trip.status,
        });
      });
    });
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Khach hang");
    XLSX.writeFile(wb, `khach-hang-${account?.slug || id}-${startDate || "all"}.xlsx`);
  };

  if (accountError) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{accountError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/accounts" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          {account ? (
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {account.name}
            </h1>
          ) : (
            <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
          )}
          <p className="text-xs text-slate-500 mt-0.5">Báo cáo chi tiết tài khoản</p>
        </div>
      </div>

      {/* Stats Cards */}
      {account && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-slate-500">Doanh thu</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalRevenue)}</p>
            <div className="flex items-center gap-1 mt-1">
              {stats.revenueChange !== 0 && (stats.revenueChange > 0 ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />)}
              <span className={`text-xs ${stats.revenueChange > 0 ? "text-green-600" : stats.revenueChange < 0 ? "text-red-600" : "text-slate-400"}`}>
                {stats.revenueChange !== 0 ? `${Math.abs(stats.revenueChange).toFixed(1)}% so kỳ trước` : "—"}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-500">Tổng cuốc</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{stats.totalTrips}</p>
            <p className="text-xs text-slate-400 mt-1">Đã hoàn thành: {stats.completedTrips}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-slate-500">Khách hàng</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{stats.uniqueCustomers}</p>
            <p className="text-xs text-slate-400 mt-1">Khách hàng duy nhất</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-slate-500">Lợi nhuận</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalProfit)}</p>
            <p className="text-xs text-slate-400 mt-1">Từ cuốc hoàn thành</p>
          </div>
        </div>
      )}

      {/* Quick Date Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["today", "week", "month", "all", "custom"].map((f) => (
          <button
            key={f}
            onClick={() => handleQuickFilter(f as DateFilter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              dateFilterForButtons === f
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {f === "today" ? "Hôm nay" : f === "week" ? "Tuần này" : f === "month" ? "Tháng này" : f === "all" ? "Tất cả" : "Tùy chọn"}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Bộ lọc chi tiết</span>
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
          >
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${filtersOpen ? "rotate-180" : "rotate-0"}`} />
            {filtersOpen ? "Thu gọn" : "Mở rộng"}
          </button>
        </div>

        {filtersOpen && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Từ ngày</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={draftStartDate}
                    onChange={(e) => { setDraftStartDate(e.target.value); setDraftDateFilter("custom"); }}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Đến ngày</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={draftEndDate}
                    onChange={(e) => { setDraftEndDate(e.target.value); setDraftDateFilter("custom"); }}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Zom</label>
                <div className="relative">
                  <select
                    value={draftSelectedDriver}
                    onChange={(e) => setDraftSelectedDriver(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none appearance-none bg-white"
                  >
                    <option value="">Tất cả</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Trạng thái</label>
                <div className="relative">
                  <select
                    value={draftStatusFilter}
                    onChange={(e) => setDraftStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none appearance-none bg-white"
                  >
                    <option value="all">Tất cả</option>
                    <option value="scheduled">Chờ</option>
                    <option value="in_progress">Đang chạy</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Hủy</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
              <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5" />
                Xóa lọc
              </button>
              <div className="flex items-center gap-2">
                {draftDateRangeInvalid && <span className="text-xs text-red-600">Từ ngày không được lớn hơn đến ngày</span>}
                <button
                  onClick={applyDraftFilters}
                  disabled={!isDraftDirty || !!draftDateRangeInvalid}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Áp dụng
                </button>
              </div>
            </div>
          </>
        )}

        {!filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {(startDate || endDate) && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : startDate ? `Từ ${formatDate(startDate)}` : `Đến ${formatDate(endDate)}`}
              </span>
            )}
            {selectedDriver && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {drivers.find((d) => d.id === parseInt(selectedDriver))?.fullName || `Zom ID ${selectedDriver}`}
              </span>
            )}
            {statusFilter && statusFilter !== "all" && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                {statusFilter === "completed" ? "Hoàn thành" : statusFilter === "in_progress" ? "Đang chạy" : statusFilter === "scheduled" ? "Chờ" : "Hủy"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExportCustomersDetail}
          disabled={trips.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium disabled:opacity-50 border border-amber-200"
        >
          <Users className="w-4 h-4" />
          Xuất khách hàng chi tiết
        </button>
        <button
          onClick={handleExport}
          disabled={trips.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Xuất cuốc xe
        </button>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Mã</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Ngày/Giờ</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Hành trình</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Zom</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Giá</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginatedTrips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                paginatedTrips.map((trip) => (
                  <tr key={trip.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-600 font-mono text-xs">#{trip.id}</td>
                    <td className="px-3 py-3">
                      <div className="text-slate-800 font-medium">{formatDate(trip.departureTime)}</div>
                      <div className="text-slate-400 text-xs">{formatTime(trip.departureTime)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-slate-800">{trip.departure}</div>
                      <div className="text-slate-400 text-xs">→ {trip.destination}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{trip.driver?.fullName || <span className="text-slate-400 italic">Chưa gán</span>}</td>
                    <td className="px-3 py-3 text-right font-medium text-slate-800">{formatCurrency(trip.price)}</td>
                    <td className="px-3 py-3 text-center">{getStatusBadge(trip.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, trips.length)} / {trips.length} cuốc
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="px-2 text-sm text-slate-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
