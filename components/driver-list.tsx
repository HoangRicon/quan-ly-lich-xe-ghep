"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Search, Plus, Phone, MessageCircle, Star, Car, Filter,
  Edit2, Trash2, Download, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Driver {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  avatar: string | null;
  status: string;
  rating: number;
  totalRevenue: number;
  vehicle: {
    name: string;
    licensePlate: string;
    vehicleType: string;
    seats: number;
    brand: string | null;
    model: string | null;
    year: number | null;
  } | null;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  running: { bg: "bg-blue-100", text: "text-blue-700", label: "Đang chạy" },
  available: { bg: "bg-green-100", text: "text-green-700", label: "Chờ việc" },
  resting: { bg: "bg-orange-100", text: "text-orange-700", label: "Đang nghỉ" },
  offline: { bg: "bg-slate-100", text: "text-slate-600", label: "Offline" },
};

const vehicleTypeLabels: Record<string, string> = {
  car: "4 chỗ",
  suv: "7 chỗ",
  bus: "16 chỗ",
};

export default function DriverList() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Delete modal state
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter, vehicleTypeFilter, page, limit]);

  // Reset to first page when changing filters
  useEffect(() => {
    setPage(1);
  }, [statusFilter, vehicleTypeFilter, limit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (vehicleTypeFilter !== "all") params.set("vehicleType", vehicleTypeFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/drivers?${params}`);
      const data = await res.json();
      if (data.data) {
        setDrivers(data.data);
      }
      if (data.pagination) {
        setTotal(data.pagination.total ?? 0);
        setTotalPages(data.pagination.totalPages ?? 1);
      }
    } catch (error) {
      console.error("Fetch drivers error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter((driver) =>
    driver.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone?.includes(searchTerm) ||
    driver.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVehicleInfo = (driver: Driver) => {
    if (!driver.vehicle) return "Chưa có xe";
    const { brand, model, year, seats, licensePlate } = driver.vehicle;
    const carInfo = [brand, model, year].filter(Boolean).join(" ");
    return `${carInfo} • ${licensePlate}`;
  };

  const openEditModal = (driver: Driver) => {
    window.location.href = `/dashboard/drivers/${driver.id}/edit`;
  };

  const handleDelete = async () => {
    if (!deletingDriver) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drivers/${deletingDriver.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeletingDriver(null);
        fetchDrivers();
      } else {
        alert(data.error || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("Delete driver error:", error);
      alert("Lỗi khi xóa");
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["STT", "Họ tên", "Số điện thoại", "Trạng thái", "Loại xe", "Biển số", "Số chỗ", "Đánh giá", "Doanh thu tháng"];
    const rows = filteredDrivers.map((d, index) => [
      index + 1,
      d.fullName,
      d.phone || "",
      statusColors[d.status]?.label || "Offline",
      d.vehicle ? vehicleTypeLabels[d.vehicle.vehicleType] || d.vehicle.vehicleType : "-",
      d.vehicle?.licensePlate || "-",
      d.vehicle?.seats || "-",
      d.rating.toFixed(1),
      d.totalRevenue,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tai-xe-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const exportToExcel = () => {
    const headers = ["STT", "Họ tên", "Số điện thoại", "Trạng thái", "Loại xe", "Biển số", "Số chỗ", "Đánh giá", "Doanh thu tháng"];
    const rows = filteredDrivers.map((d, index) => [
      index + 1,
      d.fullName,
      d.phone || "",
      statusColors[d.status]?.label || "Offline",
      d.vehicle ? vehicleTypeLabels[d.vehicle.vehicleType] || d.vehicle.vehicleType : "-",
      d.vehicle?.licensePlate || "-",
      d.vehicle?.seats || "-",
      d.rating.toFixed(1),
      d.totalRevenue,
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    xml += '<Worksheet ss:Name="Tài xế"><Table>';
    
    headers.forEach(h => {
      xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
    });
    
    rows.forEach(row => {
      xml += "<Row>";
      row.forEach(cell => {
        const isNumber = typeof cell === "number";
        xml += `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${cell}</Data></Cell>`;
      });
      xml += "</Row>";
    });
    
    xml += '</Table></Worksheet></Workbook>';

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tai-xe-${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    setShowExportMenu(false);
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tài xế, SĐT, biển số..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          {/* Export Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  Xuất CSV
                </button>
                <button
                  onClick={exportToExcel}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-amber-600" />
                  Xuất Excel
                </button>
              </div>
            )}
          </div>
          <Link href="/dashboard/drivers/add">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Thêm tài xế</span>
              <span className="sm:hidden">Thêm</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs - Status */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            statusFilter === "all" 
              ? "bg-blue-600 text-white" 
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Tất cả ({total || drivers.length})
        </button>
        <button
          onClick={() => setStatusFilter("running")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            statusFilter === "running" 
              ? "bg-blue-600 text-white" 
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Đang chạy ({drivers.filter(d => d.status === "running").length})
        </button>
        <button
          onClick={() => setStatusFilter("available")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            statusFilter === "available" 
              ? "bg-green-600 text-white" 
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Chờ việc ({drivers.filter(d => d.status === "available").length})
        </button>
        <button
          onClick={() => setStatusFilter("resting")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            statusFilter === "resting" 
              ? "bg-orange-500 text-white" 
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Nghỉ ({drivers.filter(d => d.status === "resting").length})
        </button>
        <button
          onClick={() => setStatusFilter("offline")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            statusFilter === "offline" 
              ? "bg-slate-600 text-white" 
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Offline ({drivers.filter(d => d.status === "offline").length})
        </button>
      </div>

      {/* Vehicle Type Filter - Horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 -mx-4 px-4">
        <button
          onClick={() => setVehicleTypeFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            vehicleTypeFilter === "all" 
              ? "bg-slate-800 text-white" 
              : "bg-slate-100 text-slate-600"
          }`}
        >
          Tất cả xe
        </button>
        <button
          onClick={() => setVehicleTypeFilter("car")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            vehicleTypeFilter === "car" 
              ? "bg-slate-800 text-white" 
              : "bg-slate-100 text-slate-600"
          }`}
        >
          4 chỗ
        </button>
        <button
          onClick={() => setVehicleTypeFilter("suv")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            vehicleTypeFilter === "suv" 
              ? "bg-slate-800 text-white" 
              : "bg-slate-100 text-slate-600"
          }`}
        >
          7 chỗ
        </button>
        <button
          onClick={() => setVehicleTypeFilter("bus")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            vehicleTypeFilter === "bus" 
              ? "bg-slate-800 text-white" 
              : "bg-slate-100 text-slate-600"
          }`}
        >
          16 chỗ
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Tài xế</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Trạng thái</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Phương tiện</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Đánh giá</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Doanh thu tháng</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Liên hệ</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Chưa có tài xế nào
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => (
                <tr key={driver.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold">
                        {driver.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{driver.fullName}</div>
                        <div className="text-sm text-slate-500">{driver.phone || "Chưa có SĐT"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusColors[driver.status]?.bg || statusColors.offline.bg
                      } ${statusColors[driver.status]?.text || statusColors.offline.text}`}
                    >
                      {statusColors[driver.status]?.label || "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-800">
                          {vehicleTypeLabels[driver.vehicle?.vehicleType || "car"]} • {driver.vehicle?.seats || 4} chỗ
                        </div>
                        <div className="text-xs text-slate-500">{getVehicleInfo(driver)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{driver.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-slate-800">{formatCurrency(driver.totalRevenue)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {driver.phone && (
                        <>
                          <a
                            href={`tel:${driver.phone}`}
                            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://zalo.me/${driver.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden lg:flex p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(driver)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingDriver(driver)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Đang tải...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Chưa có tài xế nào
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
            >
              {/* Driver Info & Status */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold text-lg">
                    {driver.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{driver.fullName}</div>
                    <div className="text-sm text-slate-500">{driver.phone || "Chưa có SĐT"}</div>
                  </div>
                </div>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    statusColors[driver.status]?.bg || statusColors.offline.bg
                  } ${statusColors[driver.status]?.text || statusColors.offline.text}`}
                >
                  {statusColors[driver.status]?.label || "Offline"}
                </span>
              </div>

              {/* Vehicle Info */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Car className="w-4 h-4" />
                <span className="font-medium">
                  {driver.vehicle?.licensePlate || "Chưa có xe"}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium">{driver.rating.toFixed(1)}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Doanh thu tháng</div>
                  <div className="font-semibold text-slate-800">{formatCurrency(driver.totalRevenue)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {driver.phone && (
                  <a
                    href={`tel:${driver.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    Gọi
                  </a>
                )}
                <a
                  href={`https://zalo.me/${driver.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden lg:flex flex-1 items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  Zalo
                </a>
              </div>

              {/* Edit/Delete Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(driver)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Sửa thông tin
                </button>
                <button
                  onClick={() => setDeletingDriver(driver)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Tổng: <span className="font-medium text-slate-800">{total}</span> tài xế • Trang{" "}
          <span className="font-medium text-slate-800">{page}</span>/{totalPages}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            className="h-9"
          >
            Trước
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            className="h-9"
          >
            Sau
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingDriver && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Xóa tài xế</h2>
              <p className="text-slate-600">
                Bạn có chắc chắn muốn xóa tài xế <strong>{deletingDriver.fullName}</strong> không?
              </p>
              {deletingDriver.vehicle && (
                <p className="text-sm text-slate-500 mt-2">
                  Xe {deletingDriver.vehicle.licensePlate} cũng sẽ bị xóa.
                </p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <Button
                variant="outline"
                onClick={() => setDeletingDriver(null)}
                disabled={deleting}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
