"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, Calendar, Download, Car, Users, DollarSign,
  ChevronDown, Filter, RefreshCw
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

export default function AnalyticsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedDriver) params.set("driverId", selectedDriver);
      if (selectedVehicleType) params.set("vehicleType", selectedVehicleType);

      const [tripsRes, driversRes, vehiclesRes] = await Promise.all([
        fetch(`/api/trips?${params}&limit=500`),
        fetch("/api/drivers"),
        fetch("/api/vehicles"),
      ]);

      const [tripsData, driversData, vehiclesData] = await Promise.all([
        tripsRes.json(),
        driversRes.json(),
        vehiclesRes.json(),
      ]);

      if (tripsData.success) setTrips(tripsData.data);
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

  // Computed stats
  const stats = useMemo(() => {
    const totalRevenue = trips.reduce((sum, t) => sum + (t.price || 0), 0);
    const totalTrips = trips.length;
    const uniqueCustomers = new Set(trips.flatMap(t => t.customers.map(c => c.customer.id))).size;
    return { totalRevenue, totalTrips, uniqueCustomers };
  }, [trips]);

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
      "Khách hàng": trip.customers[0]?.customer.name || "-",
      "SĐT khách": trip.customers[0]?.customer.phone || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao cao");
    
    // Set column widths
    ws["!cols"] = [
      { wch: 8 },  // Mã cuốc
      { wch: 12 }, // Ngày đón
      { wch: 8 },  //ón
      { Giờ đ wch: 20 }, // Điểm đi
      { wch: 20 }, // Điểm đến
      { wch: 15 }, // Tài xế
      { wch: 25 }, // Xe
      { wch: 10 }, // Loại xe
      { wch: 12 }, // Giá tiền
      { wch: 12 }, // Trạng thái
      { wch: 20 }, // Khách hàng
      { wch: 12 }, // SĐT khách
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
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Báo cáo & Thống kê</h1>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Bộ lọc</span>
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
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Xóa lọc
              </button>
            </div>
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
              disabled={trips.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Mã</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Ngày/Giờ</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Lộ trình</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Tài xế</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Xe</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Giá</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Trạng thái</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Khách</th>
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
                      <tr key={trip.id} className="hover:bg-slate-50">
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
                        <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                          {formatCurrency(trip.price || 0)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {getStatusBadge(trip.status)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {trip.customers[0]?.customer.name || <span className="text-slate-400">-</span>}
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
    </div>
  );
}
