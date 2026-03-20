"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, Calendar, Download, Car, Users, DollarSign,
  ChevronDown, ChevronLeft, ChevronRight, Filter, RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";

interface Trip {
  id: number;
  title?: string;
  departure: string;
  destination: string;
  departureTime: string;
  arrivalTime?: string | null;
  status: string;
  price: number;
  notes?: string | null;
  pointsEarned?: number | null;
  profit?: number | null;
  profitRate?: number | null;
  tripDirection?: string;
  totalSeats?: number;
  createdAt?: string;
  driver?: {
    id: number;
    fullName: string;
    phone?: string | null;
    formulas?: Array<{
      id: number;
      name: string;
      tripType: string;
      seats: number | null;
      minPrice: number | null;
      maxPrice: number | null;
      points: number;
      isActive: boolean;
    }>;
  };
  customer?: {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  customers: Array<{
    customer: {
      id: number;
      name: string;
      phone: string;
      email?: string | null;
    };
    seats?: number;
    status?: string;
  }>;
}

interface Driver {
  id: number;
  fullName: string;
}

export default function AnalyticsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Trip Search (client-side)
  const [tripSearchDraft, setTripSearchDraft] = useState("");
  const [tripSearchApplied, setTripSearchApplied] = useState("");

  // Pagination
  const tripsPageSize = 10;
  const [tripPage, setTripPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedDriver) params.set("driverId", selectedDriver);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const [tripsRes, driversRes] = await Promise.all([
        fetch(`/api/trips?${params}&limit=500`),
        fetch("/api/drivers"),
      ]);

      const [tripsData, driversData] = await Promise.all([
        tripsRes.json(),
        driversRes.json(),
      ]);

      if (tripsData.success) setTrips(tripsData.data);
      if (driversData.success) setDrivers(driversData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedDriver, statusFilter]);

  useEffect(() => {
    // Mặc định mở lọc trên màn hình lớn, đóng trên mobile để gọn hơn
    setFiltersOpen(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  }, []);

  useEffect(() => {
    setTripPage(1);
  }, [startDate, endDate, selectedDriver, statusFilter, tripSearchApplied]);

  const selectedDriverName = useMemo(() => {
    if (!selectedDriver) return "";
    const idNum = Number(selectedDriver);
    return drivers.find((d) => d.id === idNum)?.fullName ?? "";
  }, [drivers, selectedDriver]);

  // Computed stats
  const stats = useMemo(() => {
    const totalRevenue = trips.reduce((sum, t) => sum + (t.price || 0), 0);
    const totalTrips = trips.length;
    const uniqueCustomers = new Set(trips.flatMap(t => t.customers.map(c => c.customer.id))).size;
    return { totalRevenue, totalTrips, uniqueCustomers };
  }, [trips]);

  const visibleTrips = useMemo(() => {
    const q = tripSearchApplied.trim().toLowerCase();
    if (!q) return trips;

    return trips.filter((t) => {
      const firstCustomer = t.customer ?? t.customers?.[0]?.customer;
      const haystack = [
        String(t.id),
        t.departure,
        t.destination,
        t.driver?.fullName ?? "",
        t.status,
        firstCustomer?.name ?? "",
        firstCustomer?.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [trips, tripSearchApplied]);

  const tripTotalPages = Math.max(1, Math.ceil(visibleTrips.length / tripsPageSize));
  const effectiveTripPage = Math.min(Math.max(1, tripPage), tripTotalPages);

  const pagedTrips = useMemo(() => {
    const startIdx = (effectiveTripPage - 1) * tripsPageSize;
    return visibleTrips.slice(startIdx, startIdx + tripsPageSize);
  }, [visibleTrips, effectiveTripPage]);

  const tripPageMaxButtons = 5;
  const tripPageStart = Math.max(
    1,
    effectiveTripPage - Math.floor(tripPageMaxButtons / 2)
  );
  const tripPageEnd = Math.min(
    tripTotalPages,
    tripPageStart + tripPageMaxButtons - 1
  );
  const tripPageStartAdj = Math.max(1, tripPageEnd - tripPageMaxButtons + 1);
  const tripPageNumbers = Array.from(
    { length: tripPageEnd - tripPageStartAdj + 1 },
    (_, i) => tripPageStartAdj + i
  );

  // Export to Excel
  const handleExport = () => {
    const exportData = visibleTrips.map(trip => ({
      "Mã cuốc": trip.id,
      "Ngày đón": new Date(trip.departureTime).toLocaleDateString("vi-VN"),
      "Giờ đón": new Date(trip.departureTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      "Điểm đi": trip.departure,
      "Điểm đến": trip.destination,
      "Zom": trip.driver?.fullName || "Chưa gán",
      "Giá tiền": trip.price || 0,
      "Trạng thái": trip.status === "completed" ? "Hoàn thành" : trip.status === "in_progress" ? "Đang chạy" : trip.status === "scheduled" ? "Chờ" : "Hủy",
      "Khách hàng": trip.customers[0]?.customer.name || "-",
      "SĐT khách": trip.customers[0]?.customer.phone || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao cao");
    
    // Set column widths
    ws["!cols"] = [
      { wch: 8 },  // Ma cuoc
      { wch: 12 }, // Ngay don
      { wch: 8 },  // Gio don
      { wch: 20 }, // Diem di
      { wch: 20 }, // Diem den
      { wch: 15 }, // Zom
      { wch: 12 }, // Gia tien
      { wch: 12 }, // Trang thai
      { wch: 20 }, // Khach hang
      { wch: 12 }, // SDT khach
    ];

    const fileName = `bao-cao-${startDate || "all"}-${endDate || "all"}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Hoàn thành</span>;
      case "in_progress":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Đang chạy</span>;
      case "scheduled":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Chờ</span>;
      case "cancelled":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Hủy</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6 space-y-4">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Báo cáo & Thống kê</h1>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Bộ lọc chi tiết</span>
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${filtersOpen ? "rotate-180" : "rotate-0"}`}
                />
                {filtersOpen ? "Thu gọn" : "Mở rộng"}
              </button>
            </div>

            {filtersOpen ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Date Range */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Từ ngày</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
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
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* Driver Filter */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Zom</label>
                    <div className="relative">
                      <select
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white"
                      >
                        <option value="">Tất cả</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.fullName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Trạng thái cuốc</label>
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white"
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

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setSelectedDriver("");
                      setStatusFilter("all");
                      setTripPage(1);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Xóa lọc
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {(startDate || endDate) && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {startDate && endDate
                      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                      : startDate
                        ? `Từ ${formatDate(startDate)}`
                        : `Đến ${formatDate(endDate)}`}
                  </span>
                )}

                {selectedDriverName && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    Zom: {selectedDriverName}
                  </span>
                )}

                {statusFilter !== "all" && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    Trạng thái:{" "}
                    {statusFilter === "scheduled"
                      ? "Chờ"
                      : statusFilter === "in_progress"
                        ? "Đang chạy"
                        : statusFilter === "completed"
                          ? "Hoàn thành"
                          : statusFilter === "cancelled"
                            ? "Hủy"
                            : statusFilter}
                  </span>
                )}

                {!startDate && !endDate && !selectedDriverName && statusFilter === "all" ? (
                  <span className="text-xs text-slate-500">Chưa có bộ lọc</span>
                ) : (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setSelectedDriver("");
                      setStatusFilter("all");
                      setTripPage(1);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Xóa lọc
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs text-slate-500">Tổng doanh thu</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalRevenue)}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Car className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-slate-500">Tổng cuốc</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{stats.totalTrips}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs text-slate-500">Khách mới</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{stats.uniqueCustomers}</p>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={visibleTrips.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </div>

          {/* Trip Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={tripSearchDraft}
                  onChange={(e) => setTripSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setTripSearchApplied(tripSearchDraft);
                      setTripPage(1);
                    }
                  }}
                  placeholder="Tìm theo mã, điểm đi/đến, Zom hoặc khách..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTripSearchApplied(tripSearchDraft);
                    setTripPage(1);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  <Search className="w-4 h-4" />
                  Tìm
                </button>

                {(tripSearchApplied || tripSearchDraft) && (
                  <button
                    onClick={() => {
                      setTripSearchDraft("");
                      setTripSearchApplied("");
                      setTripPage(1);
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-sm font-medium"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Mobile list */}
            <div className="md:hidden p-3">
              {loading ? (
                <div className="py-8 text-center text-slate-500">Đang tải...</div>
              ) : pagedTrips.length === 0 ? (
                <div className="py-8 text-center text-slate-500">Không có dữ liệu</div>
              ) : (
                <div className="space-y-2">
                  {pagedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTrip(trip)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedTrip(trip);
                      }}
                      className="bg-white border border-slate-200 rounded-xl p-3 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">#{trip.id}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatTime(trip.departureTime)} • {formatDate(trip.departureTime)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(trip.status)}
                          <div className="text-sm font-bold text-slate-800">{formatCurrency(trip.price || 0)}</div>
                          <div className="flex items-center gap-1.5">
                            {trip.pointsEarned != null ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 whitespace-nowrap">
                                {trip.pointsEarned}đ
                              </span>
                            ) : null}
                            {trip.profit != null ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">
                                +{formatCurrency(trip.profit || 0)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
                                LN —
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {trip.departure} → {trip.destination}
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <div className="text-xs text-slate-600 truncate">
                            Zom: {trip.driver?.fullName || "Chưa gán"}
                          </div>
                          <div className="text-xs text-slate-600 truncate">
                            Khách: {trip.customer?.name || trip.customers?.[0]?.customer?.name || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Mã</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Ngày/Giờ</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Lộ trình</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Tài xế</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Giá</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Trạng thái</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Khách</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                          Đang tải...
                        </td>
                      </tr>
                    ) : pagedTrips.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      pagedTrips.map((trip) => (
                        <tr
                          key={trip.id}
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => setSelectedTrip(trip)}
                          role="button"
                        >
                          <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">#{trip.id}</td>
                          <td className="px-3 py-3 text-sm whitespace-nowrap">
                            <div className="text-slate-800">{formatDate(trip.departureTime)}</div>
                            <div className="text-xs text-slate-400">{formatTime(trip.departureTime)}</div>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <div className="text-slate-800">{trip.departure}</div>
                            <div className="text-xs text-slate-400">→ {trip.destination}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {trip.driver?.fullName || <span className="text-slate-400">-</span>}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {formatCurrency(trip.price || 0)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {getStatusBadge(trip.status)}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {trip.customers?.[0]?.customer?.name || <span className="text-slate-400">-</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Kết quả:{" "}
                <span className="font-semibold text-slate-800">{visibleTrips.length}</span> • Trang{" "}
                <span className="font-semibold text-slate-800">{effectiveTripPage}</span> / {tripTotalPages}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTripPage((p) => Math.max(1, p - 1))}
                  disabled={loading || effectiveTripPage === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>

                {tripPageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setTripPage(p)}
                    disabled={loading}
                    className={`px-2 py-1 rounded-lg border text-sm ${
                      p === effectiveTripPage
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setTripPage((p) => Math.min(tripTotalPages, p + 1))}
                  disabled={loading || effectiveTripPage === tripTotalPages}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Sidebar>
      <BottomNav />

      {/* Trip Detail Modal (mobile-friendly bottom sheet) */}
      {selectedTrip && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedTrip(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:w-[720px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-800 truncate">Chi tiết cuốc #{selectedTrip.id}</h2>
                  {getStatusBadge(selectedTrip.status)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatDate(selectedTrip.departureTime)} • {formatTime(selectedTrip.departureTime)}
                  {selectedTrip.arrivalTime ? (
                    <span className="text-slate-400">
                      {" "}
                      • Đến: {formatDate(selectedTrip.arrivalTime)} {formatTime(selectedTrip.arrivalTime)}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                aria-label="Đóng"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-600 mb-2">Lộ trình</div>
                <div className="text-sm font-medium text-slate-800 truncate">
                  {selectedTrip.departure} → {selectedTrip.destination}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Zom</div>
                  <div className="text-sm font-medium text-slate-800">
                    {selectedTrip.driver?.fullName || "Chưa gán"}
                  </div>
                  {selectedTrip.driver?.phone ? (
                    <a
                      href={`tel:${String(selectedTrip.driver.phone).replace(/[^\d+]/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      {selectedTrip.driver.phone}
                    </a>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1">—</div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Khách</div>
                  <div className="text-sm font-medium text-slate-800">
                    {selectedTrip.customer?.name || selectedTrip.customers?.[0]?.customer?.name || "-"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    SĐT: {selectedTrip.customer?.phone || selectedTrip.customers?.[0]?.customer?.phone || "-"}
                  </div>
                  {selectedTrip.customer?.email ? (
                    <div className="text-xs text-slate-500 mt-1">Email: {selectedTrip.customer.email}</div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Giá</div>
                  <div className="text-lg font-bold text-slate-800">{formatCurrency(selectedTrip.price || 0)}</div>
                  {selectedTrip.pointsEarned != null ? (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 mt-2 inline-block">
                      {selectedTrip.pointsEarned}đ
                    </div>
                  ) : null}
                  {selectedTrip.profit != null ? (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-1 mt-2 inline-block">
                      Lợi nhuận: {formatCurrency(selectedTrip.profit || 0)}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-2">Lợi nhuận: —</div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Ghi chú</div>
                  {selectedTrip.notes ? (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTrip.notes}</div>
                  ) : (
                    <div className="text-sm text-slate-400">Không có ghi chú</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
