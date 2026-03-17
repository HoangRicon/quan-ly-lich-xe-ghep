"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Calendar, Download, Car, Users, DollarSign,
  ChevronDown, Filter, RefreshCw, TrendingUp, TrendingDown,
  Phone, MessageCircle
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
  notes?: string;
  driver?: {
    id: number;
    fullName: string;
  };
  vehicle?: {
    id: number;
    name: string;
    licensePlate: string;
    vehicleType: string;
  };
  customers: Array<{
    customer: {
      id: number;
      name: string;
      phone: string;
    };
  }>;
}

interface Driver {
  id: number;
  fullName: string;
}

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  vehicleType: string;
}

type DateFilter = "all" | "today" | "week" | "month" | "custom";

export default function ReportsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

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
      if (selectedVehicleType) params.set("vehicleType", selectedVehicleType);

      const [tripsRes, allTripsRes, driversRes, vehiclesRes] = await Promise.all([
        fetch(`/api/trips?${params}&limit=500`),
        fetch("/api/trips?limit=1000"),
        fetch("/api/drivers"),
        fetch("/api/vehicles"),
      ]);

      const [tripsData, allTripsData, driversData, vehiclesData] = await Promise.all([
        tripsRes.json(),
        allTripsRes.json(),
        driversRes.json(),
        vehiclesRes.json(),
      ]);

      if (tripsData.success) setTrips(tripsData.data);
      if (allTripsData.success) setAllTrips(allTripsData.data);
      if (driversData.success) setDrivers(driversData.data);
      if (vehiclesData.success) setVehicles(vehiclesData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedDriver, selectedVehicleType]);

  // Computed stats for filtered data
  const stats = useMemo(() => {
    const completedTrips = trips.filter(t => t.status === "completed");
    const totalRevenue = completedTrips.reduce((sum, t) => {
      const price = Number(t.price) || 0;
      return sum + (price > 0 && price < 100000000 ? price : 0);
    }, 0);
    const totalTrips = trips.length;
    const uniqueCustomers = new Set(
      trips.flatMap(t => (t.customers || []).map(c => c.customer?.id)).filter(Boolean)
    ).size;
    const avgTripValue = completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;
    
    // Calculate previous period for comparison
    let prevPeriodRevenue = 0;
    let prevPeriodTrips = 0;
    
    if (startDate && endDate) {
      const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - daysDiff - 1);
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);
      
      const prevTrips = allTrips.filter(t => {
        const tripDate = new Date(t.departureTime);
        return tripDate >= prevStart && tripDate <= prevEnd;
      });
      
      prevPeriodRevenue = prevTrips.filter(t => t.status === "completed").reduce((sum, t) => sum + (t.price || 0), 0);
      prevPeriodTrips = prevTrips.length;
    }
    
    const revenueChange = prevPeriodRevenue > 0 ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : 0;
    const tripsChange = prevPeriodTrips > 0 ? ((totalTrips - prevPeriodTrips) / prevPeriodTrips) * 100 : 0;

    return { 
      totalRevenue, 
      totalTrips, 
      uniqueCustomers,
      avgTripValue,
      completedTrips: completedTrips.length,
      revenueChange,
      tripsChange
    };
  }, [trips, allTrips, startDate, endDate]);

  // Export to Excel
  const handleExport = () => {
    const exportData = trips.map(trip => ({
      "Mã cuốc": trip.id,
      "Ngày đón": new Date(trip.departureTime).toLocaleDateString("vi-VN"),
      "Giờ đón": new Date(trip.departureTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      "Điểm đi": trip.departure,
      "Điểm đến": trip.destination,
      "Tài xế": trip.driver?.fullName || "Chưa gán",
      "Xe": trip.vehicle ? `${trip.vehicle.name} - ${trip.vehicle.licensePlate}` : "Chưa gán",
      "Loại xe": trip.vehicle?.vehicleType || "-",
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
      { wch: 25 },
      { wch: 10 },
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

  const vehicleTypes = [...new Set(vehicles.map(v => v.vehicleType))];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">Báo cáo & Thống kê</h1>
            <button
              onClick={handleExport}
              disabled={trips.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất</span>
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
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Bộ lọc chi tiết</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date Range */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Từ ngày</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setDateFilter("custom"); }}
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
                    onChange={(e) => { setEndDate(e.target.value); setDateFilter("custom"); }}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              </div>

              {/* Driver Filter */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tài xế</label>
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

              {/* Vehicle Type Filter */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Loại xe</label>
                <div className="relative">
                  <select
                    value={selectedVehicleType}
                    onChange={(e) => setSelectedVehicleType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white"
                  >
                    <option value="">Tất cả</option>
                    {vehicleTypes.map((type) => (
                      <option key={type} value={type}>
                        {type === "car" ? "Xe 4 chỗ" : type === "7seats" ? "Xe 7 chỗ" : type === "16seats" ? "Xe 16 chỗ" : type}
                      </option>
                    ))}
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
                  setSelectedVehicleType("");
                  setDateFilter("all");
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Xóa lọc
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Revenue */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                {stats.revenueChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${stats.revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stats.revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stats.revenueChange).toFixed(0)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">Doanh thu</p>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(stats.totalRevenue)}</p>
            </div>

            {/* Trips */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                {stats.tripsChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${stats.tripsChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stats.tripsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stats.tripsChange).toFixed(0)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">Tổng cuốc</p>
              <p className="text-xl font-bold text-slate-800">{stats.totalTrips}</p>
            </div>

            {/* Completed Trips */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Car className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Đã hoàn thành</p>
              <p className="text-xl font-bold text-slate-800">{stats.completedTrips}</p>
            </div>

            {/* Customers */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Khách hàng</p>
              <p className="text-xl font-bold text-slate-800">{stats.uniqueCustomers}</p>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Mã</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Ngày/Giờ</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Lộ trình</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Tài xế</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Xe</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Khách hàng</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Giá</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                        Đang tải...
                      </td>
                    </tr>
                  ) : trips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    trips.map((trip) => (
                      <tr 
                        key={trip.id} 
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedTrip(trip)}
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
                          {trip.vehicle ? (
                            <div>
                              <div>{trip.vehicle.licensePlate}</div>
                              <div className="text-xs text-slate-400">{trip.vehicle.name}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {trip.customers?.[0]?.customer ? (
                            <div>
                              <div className="font-medium">{trip.customers[0].customer.name}</div>
                              <div className="text-xs text-slate-400">{trip.customers[0].customer.phone}</div>
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
                <p className="text-xs text-slate-500 mb-1">Tài xế</p>
                {selectedTrip.driver ? (
                  <div>
                    <p className="font-medium text-slate-800">{selectedTrip.driver.fullName}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">Chưa gán</p>
                )}
              </div>

              {/* Vehicle */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Phương tiện</p>
                {selectedTrip.vehicle ? (
                  <div>
                    <p className="font-medium text-slate-800">{selectedTrip.vehicle.name}</p>
                    <p className="text-sm text-slate-500">{selectedTrip.vehicle.licensePlate} • {selectedTrip.vehicle.vehicleType}</p>
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
