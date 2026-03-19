"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  Download,
  Car,
  Users,
  DollarSign,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Phone,
  MessageCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";

interface Trip {
  id: number;
  departure: string;
  destination: string;
  departureTime: string;
  status: string;
  price: number;
  profit?: number | null;
  notes?: string;
  driver?: {
    id: number;
    fullName: string;
    phone?: string | null;
  };
  customers: Array<{
    customer: {
      id: number;
      name: string;
      phone: string;
    };
    seats?: number;
    status?: string;
  }>;
}

interface Driver {
  id: number;
  fullName: string;
}

type DateFilter = "all" | "today" | "week" | "month" | "custom";

interface Stats {
  totalRevenue: number;
  totalTrips: number;
  uniqueCustomers: number;
  avgTripValue: number;
  completedTrips: number;
  completedRevenue: number;
  completedProfit: number;
  forecastRevenue: number;
  forecastProfit: number;
  unassignedTrips: number;
  assignedNotCompleted: number;
  revenueChange: number;
  tripsChange: number;
}

interface CustomerSummary {
  id: number;
  name: string;
  phone: string;
  totalTrips: number;
  totalRevenue: number;
  totalProfit: number;
  lastTripDate: string;
}

export default function ReportsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "customers">("overview");
  const [tripSearchDraft, setTripSearchDraft] = useState("");
  const [tripSearchApplied, setTripSearchApplied] = useState("");

  const [customerSearchDraft, setCustomerSearchDraft] = useState("");
  const [customerSearchApplied, setCustomerSearchApplied] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const customerExportRef = useRef<HTMLButtonElement | null>(null);

  const tripsPageSize = 10;
  const customersPageSize = 8;
  const [tripPage, setTripPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);

  const selectedDriverName = useMemo(() => {
    if (!selectedDriver) return "";
    const idNum = Number(selectedDriver);
    return drivers.find((d) => d.id === idNum)?.fullName ?? "";
  }, [drivers, selectedDriver]);

  // Quick filter buttons
  const handleQuickFilter = (filter: DateFilter) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    if (filter === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (filter === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      setStartDate(weekStart.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (filter === "month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(monthStart.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (filter === "all") {
      setStartDate("");
      setEndDate("");
    }
    
    setDateFilter(filter);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedDriver) params.set("driverId", selectedDriver);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const [tripsRes, allTripsRes, driversRes] = await Promise.all([
        fetch(`/api/trips?${params}&limit=500`),
        fetch("/api/trips?limit=1000"),
        fetch("/api/drivers"),
      ]);

      const [tripsData, allTripsData, driversData] = await Promise.all([
        tripsRes.json(),
        allTripsRes.json(),
        driversRes.json(),
      ]);

      if (tripsData.success) setTrips(tripsData.data);
      if (allTripsData.success) setAllTrips(allTripsData.data);
      if (driversData.success) setDrivers(driversData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedDriver, statusFilter]);

  useEffect(() => {
    // Mặc định mở lọc trên màn hình lớn, đóng trên mobile để gọn hơn
    setFiltersOpen(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  }, []);

  useEffect(() => {
    setTripPage(1);
  }, [startDate, endDate, selectedDriver, statusFilter, tripSearchApplied]);

  useEffect(() => {
    setCustomerPage(1);
  }, [startDate, endDate, selectedDriver, statusFilter, tripSearchApplied, customerSearchApplied]);

  // Computed stats for filtered data
  const stats: Stats = useMemo(() => {
    const completedTrips = trips.filter((t) => t.status === "completed");
    const assignedNotCompleted = trips.filter(
      (t) => t.driver && t.status !== "completed" && t.status !== "cancelled"
    );
    const unassignedTrips = trips.filter(
      (t) => !t.driver && t.status !== "cancelled"
    );

    const totalRevenue = completedTrips.reduce((sum, t) => {
      const price = Number(t.price) || 0;
      return sum + (price > 0 && price < 100000000 ? price : 0);
    }, 0);

    const completedProfit = completedTrips.reduce((sum, t) => {
      const p = Number(t.profit ?? 0);
      return sum + (p > 0 && p < 100000000 ? p : 0);
    }, 0);

    const forecastRevenue = assignedNotCompleted.reduce((sum, t) => {
      const price = Number(t.price) || 0;
      return sum + (price > 0 && price < 100000000 ? price : 0);
    }, 0);

    const forecastProfit = assignedNotCompleted.reduce((sum, t) => {
      const p = Number(t.profit ?? 0);
      return sum + (p > 0 && p < 100000000 ? p : 0);
    }, 0);

    const totalTrips = trips.length;
    const uniqueCustomers = new Set(
      trips
        .flatMap((t) => (t.customers || []).map((c) => c.customer?.id))
        .filter(Boolean)
    ).size;
    const avgTripValue =
      completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;

    // Calculate previous period for comparison
    let prevPeriodRevenue = 0;
    let prevPeriodTrips = 0;

    if (startDate && endDate) {
      const daysDiff = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - daysDiff - 1);
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const prevTrips = allTrips.filter((t) => {
        const tripDate = new Date(t.departureTime);
        return tripDate >= prevStart && tripDate <= prevEnd;
      });

      prevPeriodRevenue = prevTrips
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + (t.price || 0), 0);
      prevPeriodTrips = prevTrips.length;
    }

    const revenueChange =
      prevPeriodRevenue > 0
        ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
        : 0;
    const tripsChange =
      prevPeriodTrips > 0
        ? ((totalTrips - prevPeriodTrips) / prevPeriodTrips) * 100
        : 0;

    return {
      totalRevenue,
      totalTrips,
      uniqueCustomers,
      avgTripValue,
      completedTrips: completedTrips.length,
      completedRevenue: totalRevenue,
      completedProfit,
      forecastRevenue,
      forecastProfit,
      unassignedTrips: unassignedTrips.length,
      assignedNotCompleted: assignedNotCompleted.length,
      revenueChange,
      tripsChange,
    };
  }, [trips, allTrips, startDate, endDate]);

  const visibleTrips = useMemo(() => {
    const q = tripSearchApplied.trim().toLowerCase();
    if (!q) return trips;

    return trips.filter((t) => {
      const firstCustomer = t.customers?.[0]?.customer;
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
  const tripPageEnd = Math.min(tripTotalPages, tripPageStart + tripPageMaxButtons - 1);
  const tripPageStartAdj = Math.max(1, tripPageEnd - tripPageMaxButtons + 1);
  const tripPageNumbers = Array.from(
    { length: tripPageEnd - tripPageStartAdj + 1 },
    (_, i) => tripPageStartAdj + i
  );

  const customerSummaries = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();

    trips.forEach((trip) => {
      const tripDate = new Date(trip.departureTime);
      const price = Number(trip.price) || 0;
      const profit = Number(trip.profit ?? 0) || 0;

      (trip.customers || []).forEach((tc) => {
        if (!tc.customer) return;
        const key = `${tc.customer.phone}-${tc.customer.name}`;
        const existing = map.get(key);

        if (!existing) {
          map.set(key, {
            id: tc.customer.id,
            name: tc.customer.name,
            phone: tc.customer.phone,
            totalTrips: 1,
            totalRevenue: price,
            totalProfit: profit,
            lastTripDate: tripDate.toISOString(),
          });
        } else {
          existing.totalTrips += 1;
          existing.totalRevenue += price;
          existing.totalProfit += profit;
          if (tripDate > new Date(existing.lastTripDate)) {
            existing.lastTripDate = tripDate.toISOString();
          }
        }
      });
    });

    let result = Array.from(map.values());

    if (customerSearchApplied.trim()) {
      const q = customerSearchApplied.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return result;
  }, [trips, customerSearchApplied]);

  const customerTotalPages = Math.max(
    1,
    Math.ceil(customerSummaries.length / customersPageSize)
  );
  const effectiveCustomerPage = Math.min(
    Math.max(1, customerPage),
    customerTotalPages
  );
  const pagedCustomerSummaries = useMemo(() => {
    const startIdx = (effectiveCustomerPage - 1) * customersPageSize;
    return customerSummaries.slice(
      startIdx,
      startIdx + customersPageSize
    );
  }, [customerSummaries, effectiveCustomerPage]);

  const customerPageMaxButtons = 5;
  const customerPageStart = Math.max(
    1,
    effectiveCustomerPage - Math.floor(customerPageMaxButtons / 2)
  );
  const customerPageEnd = Math.min(
    customerTotalPages,
    customerPageStart + customerPageMaxButtons - 1
  );
  const customerPageStartAdj = Math.max(1, customerPageEnd - customerPageMaxButtons + 1);
  const customerPageNumbers = Array.from(
    { length: customerPageEnd - customerPageStartAdj + 1 },
    (_, i) => customerPageStartAdj + i
  );

  // Export to Excel
  const handleExport = () => {
    const exportData = trips.map((trip) => ({
      "Mã cuốc": trip.id,
      "Ngày đón": new Date(trip.departureTime).toLocaleDateString("vi-VN"),
      "Giờ đón": new Date(trip.departureTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
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
    
    ws["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 8 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
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

  const formatDateTimeShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const handleExportCustomersDetail = () => {
    if (trips.length === 0) return;

    const rows: any[] = [];

    trips.forEach((trip) => {
      (trip.customers || []).forEach((tc) => {
        if (!tc.customer) return;
        rows.push({
          "Tên khách": tc.customer.name,
          "SĐT khách": tc.customer.phone,
          "Mã cuốc": trip.id,
          "Ngày đón": new Date(trip.departureTime).toLocaleDateString(
            "vi-VN"
          ),
          "Giờ đón": new Date(trip.departureTime).toLocaleTimeString(
            "vi-VN",
            { hour: "2-digit", minute: "2-digit" }
          ),
          "Điểm đi": trip.departure,
          "Điểm đến": trip.destination,
          "Zom": trip.driver?.fullName || "Chưa gán",
          "Giá tiền": trip.price || 0,
          "Lợi nhuận": trip.profit || 0,
          "Trạng thái":
            trip.status === "completed"
              ? "Hoàn thành"
              : trip.status === "in_progress"
              ? "Đang chạy"
              : trip.status === "scheduled"
              ? "Chờ"
              : trip.status === "cancelled"
              ? "Hủy"
              : trip.status,
        });
      });
    });

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Khach hang");

    const fileName = `khach-hang-chi-tiet-${startDate || "all"}-${
      endDate || "all"
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Báo cáo tổng hợp</h1>
              <p className="text-xs text-slate-500 mt-1">
                Doanh thu, lợi nhuận và khách hàng lấy trực tiếp từ dữ liệu lịch trình.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportCustomersDetail}
                disabled={trips.length === 0}
                ref={customerExportRef}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 border border-amber-200"
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
                <span className="hidden sm:inline">Xuất cuốc xe</span>
                <span className="sm:hidden">Xuất</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === "customers"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Khách hàng
            </button>
          </div>

          {/* Quick Date Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <button
              onClick={() => handleQuickFilter("today")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilter === "today" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => handleQuickFilter("week")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilter === "week" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tuần này
            </button>
            <button
              onClick={() => handleQuickFilter("month")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilter === "month" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => handleQuickFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilter === "all" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => handleQuickFilter("custom")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilter === "custom" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tùy chọn
            </button>
          </div>

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
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    filtersOpen ? "rotate-180" : "rotate-0"
                  }`}
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
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setDateFilter("custom");
                        }}
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
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setDateFilter("custom");
                        }}
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
                      setDateFilter("all");
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

                {(!startDate && !endDate && !selectedDriverName && statusFilter === "all") ? (
                  <span className="text-xs text-slate-500">Chưa có bộ lọc</span>
                ) : (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setSelectedDriver("");
                      setStatusFilter("all");
                      setDateFilter("all");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Xóa
                  </button>
                )}
              </div>
            )}
          </div>

          {activeTab === "overview" && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Doanh thu thực tế */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    {stats.revenueChange !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          stats.revenueChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.revenueChange >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(stats.revenueChange).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Doanh thu thực tế</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.completedRevenue)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Chỉ tính các cuốc <b>đã hoàn thành</b>.
                  </p>
                </div>

                {/* Lợi nhuận thực tế */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Lợi nhuận thực tế</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.completedProfit)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Ưu tiên số <b>lợi nhuận đã tính từ công thức</b>.
                  </p>
                </div>

                {/* Doanh thu dự kiến */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Doanh thu dự kiến</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.forecastRevenue)}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    Từ các cuốc đã <b>gán Zom</b> nhưng <b>chưa hoàn thành</b>.
                  </p>
                </div>

                {/* Lợi nhuận dự kiến */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Lợi nhuận dự kiến</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.forecastProfit)}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    Dùng để <b>dự phóng</b> theo số cuốc đã gán.
                  </p>
                </div>
              </div>

              {/* Secondary KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tổng cuốc */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    {stats.tripsChange !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          stats.tripsChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.tripsChange >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(stats.tripsChange).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Tổng cuốc</p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.totalTrips}
                  </p>
                </div>

                {/* Đã hoàn thành */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Đã hoàn thành</p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.completedTrips}
                  </p>
                </div>

                {/* Chưa gán Zom */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Chưa gán Zom</p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.unassignedTrips}
                  </p>
                </div>

                {/* Đã gán, chưa hoàn thành */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Đã gán, chưa hoàn thành
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.assignedNotCompleted}
                  </p>
                </div>
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
                          className="bg-white border border-slate-200 rounded-xl p-3 hover:bg-slate-50 cursor-pointer"
                          onClick={() => setSelectedTrip(trip)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">
                                #{trip.id}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {formatDate(trip.departureTime)} - {formatTime(trip.departureTime)}
                              </div>
                            </div>
                            <div>{getStatusBadge(trip.status)}</div>
                          </div>

                          <div className="mt-2">
                            <div className="text-sm font-medium text-slate-800">
                              {trip.departure} → {trip.destination}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Zom: {trip.driver?.fullName || "Chưa gán"}
                            </div>
                            <div className="text-xs text-slate-500">
                              Khách: {trip.customers?.[0]?.customer?.name || "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              Giá: {formatCurrency(trip.price || 0)}
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
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Mã
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Ngày/Giờ
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Lộ trình
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Zom
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Khách hàng
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Giá
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Đang tải...
                            </td>
                          </tr>
                        ) : pagedTrips.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Không có dữ liệu
                            </td>
                          </tr>
                        ) : (
                          pagedTrips.map((trip) => (
                            <tr
                              key={trip.id}
                              className="hover:bg-slate-50 cursor-pointer"
                              onClick={() => setSelectedTrip(trip)}
                            >
                              <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                                #{trip.id}
                              </td>
                              <td className="px-3 py-3 text-sm whitespace-nowrap">
                                <div className="text-slate-800">
                                  {formatDate(trip.departureTime)}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {formatTime(trip.departureTime)}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm">
                                <div className="text-slate-800">
                                  {trip.departure}
                                </div>
                                <div className="text-xs text-slate-400">
                                  → {trip.destination}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                                {trip.driver?.fullName || (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                                {trip.customers?.[0]?.customer ? (
                                  <div>
                                    <div className="font-medium">
                                      {trip.customers[0].customer.name}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      {trip.customers[0].customer.phone}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                                {formatCurrency(trip.price || 0)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {getStatusBadge(trip.status)}
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
                    <span className="font-semibold text-slate-800">
                      {visibleTrips.length}
                    </span>{" "}
                    • Trang{" "}
                    <span className="font-semibold text-slate-800">
                      {effectiveTripPage}
                    </span>{" "}
                    / {tripTotalPages}
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
                      onClick={() =>
                        setTripPage((p) => Math.min(tripTotalPages, p + 1))
                      }
                      disabled={loading || effectiveTripPage === tripTotalPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "customers" && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Khách hàng (tổng hợp từ cuốc xe)
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Dữ liệu đã áp dụng bộ lọc thời gian, trạng thái và Zom ở trên.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <p className="text-xs text-slate-500">
                      Tổng khách:{" "}
                      <span className="font-semibold text-slate-800">
                        {customerSummaries.length}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Tổng doanh thu thực tế:{" "}
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(
                          customerSummaries.reduce(
                            (sum, c) => sum + c.totalRevenue,
                            0
                          )
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customerSearchDraft}
                      onChange={(e) => setCustomerSearchDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setCustomerSearchApplied(customerSearchDraft);
                          setCustomerPage(1);
                        }
                      }}
                      placeholder="Tìm theo tên hoặc số điện thoại khách hàng..."
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCustomerSearchApplied(customerSearchDraft);
                        setCustomerPage(1);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      <Search className="w-4 h-4" />
                      Tìm
                    </button>

                    {(customerSearchApplied || customerSearchDraft) && (
                      <button
                        onClick={() => {
                          setCustomerSearchDraft("");
                          setCustomerSearchApplied("");
                          setCustomerPage(1);
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-sm font-medium"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Mobile cards */}
                <div className="md:hidden p-3">
                  {loading ? (
                    <div className="py-8 text-center text-slate-500">Đang tải...</div>
                  ) : pagedCustomerSummaries.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      Không có khách hàng nào trong bộ lọc hiện tại
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pagedCustomerSummaries.map((c) => (
                        <div
                          key={`${c.phone}-${c.id}`}
                          className="bg-white border border-slate-200 rounded-xl p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-800">
                                {c.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {c.phone}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <a
                                  href={`tel:${c.phone}`}
                                  className="p-1 rounded bg-blue-50 hover:bg-blue-100"
                                >
                                  <Phone className="w-3 h-3 text-blue-600" />
                                </a>
                                <a
                                  href={`https://zalo.me/${c.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-blue-50 hover:bg-blue-100"
                                >
                                  <MessageCircle className="w-3 h-3 text-blue-500" />
                                </a>
                              </div>
                            </div>

                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
                              Xem trong bảng cuốc xe
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-[11px] text-slate-500">
                                Số cuốc
                              </div>
                              <div className="font-medium text-slate-800">
                                {c.totalTrips}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">
                                Chuyến gần nhất
                              </div>
                              <div className="font-medium text-slate-800">
                                {formatDateTimeShort(c.lastTripDate)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">
                                Doanh thu
                              </div>
                              <div className="font-medium text-slate-800">
                                {formatCurrency(c.totalRevenue)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500">
                                Lợi nhuận
                              </div>
                              <div className="font-medium text-slate-800">
                                {formatCurrency(c.totalProfit)}
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
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Khách hàng
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Số cuốc
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Doanh thu
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Lợi nhuận
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Chuyến gần nhất
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Hành động
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Đang tải...
                            </td>
                          </tr>
                        ) : pagedCustomerSummaries.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Không có khách hàng nào trong bộ lọc hiện tại
                            </td>
                          </tr>
                        ) : (
                          pagedCustomerSummaries.map((c) => (
                            <tr key={`${c.phone}-${c.id}`}>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                <div className="font-medium">{c.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-500">
                                    {c.phone}
                                  </span>
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="p-1 rounded bg-blue-50 hover:bg-blue-100"
                                  >
                                    <Phone className="w-3 h-3 text-blue-600" />
                                  </a>
                                  <a
                                    href={`https://zalo.me/${c.phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden lg:flex p-1 rounded bg-blue-50 hover:bg-blue-100"
                                  >
                                    <MessageCircle className="w-3 h-3 text-blue-500" />
                                  </a>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                {c.totalTrips}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                                {formatCurrency(c.totalRevenue)}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                                {formatCurrency(c.totalProfit)}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                                {formatDateTimeShort(c.lastTripDate)}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                  Xem trong bảng cuốc xe
                                </span>
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
                    <span className="font-semibold text-slate-800">
                      {customerSummaries.length}
                    </span>{" "}
                    • Trang{" "}
                    <span className="font-semibold text-slate-800">
                      {effectiveCustomerPage}
                    </span>{" "}
                    / {customerTotalPages}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCustomerPage((p) => Math.max(1, p - 1))
                      }
                      disabled={loading || effectiveCustomerPage === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>

                    {customerPageNumbers.map((p) => (
                      <button
                        key={p}
                        onClick={() => setCustomerPage(p)}
                        disabled={loading}
                        className={`px-2 py-1 rounded-lg border text-sm ${
                          p === effectiveCustomerPage
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setCustomerPage((p) => Math.min(customerTotalPages, p + 1))
                      }
                      disabled={loading || effectiveCustomerPage === customerTotalPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Sidebar>
      <BottomNav />

      {/* Trip Detail Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedTrip(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-semibold text-slate-800">Chi tiết chuyến #{selectedTrip.id}</h2>
              <button
                onClick={() => setSelectedTrip(null)}
                className="p-2 -mr-2 text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Date & Time */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Thời gian</p>
                <p className="font-medium text-slate-800">
                  {formatDate(selectedTrip.departureTime)} - {formatTime(selectedTrip.departureTime)}
                </p>
              </div>

              {/* Route */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2">Lộ trình</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-slate-800">{selectedTrip.departure}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-slate-800">{selectedTrip.destination}</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Giá tiền</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(selectedTrip.price || 0)}</p>
              </div>

              {/* Status */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Trạng thái</p>
                {getStatusBadge(selectedTrip.status)}
              </div>

              {/* Notes */}
              {/* Notes */}
              {selectedTrip.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Ghi chú</p>
                  <p className="text-sm text-slate-800">{selectedTrip.notes}</p>
                </div>
              )}

              {/* Driver */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Zom</p>
                {selectedTrip.driver ? (
                  <div>
                    <p className="font-medium text-slate-800">{selectedTrip.driver.fullName}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">Chưa gán</p>
                )}
              </div>

              {/* Customers */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2">Khách hàng ({selectedTrip.customers?.length || 0})</p>
                {selectedTrip.customers && selectedTrip.customers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTrip.customers.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                        <div>
                          <p className="font-medium text-slate-800">{c.customer.name}</p>
                          <p className="text-sm text-slate-500">{c.customer.phone}</p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${c.customer.phone}`}
                            className="p-2 rounded-lg bg-blue-600 text-white"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://zalo.me/${c.customer.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden lg:flex p-2 rounded-lg bg-blue-50 text-blue-600"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">Chưa có khách</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
