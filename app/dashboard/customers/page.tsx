"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Search, MessageCircle, Phone, MapPin, FileText, 
  TrendingUp, ChevronUp, ChevronDown, Eye, Download, X
} from "lucide-react";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  totalTrips: number;
  totalSpending: number;
  favoriteRoute?: string;
  badge: "new" | "regular" | "vip";
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [badgeFilter, setBadgeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("totalTrips");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (badgeFilter !== "all") params.set("badge", badgeFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "100");

      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error("Fetch customers error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, badgeFilter, sortBy, sortOrder]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ["STT", "Tên khách hàng", "Số điện thoại", "Phân hạng", "Tổng chuyến", "Tổng chi tiêu", "Tuyến đường", "Ghi chú", "Ngày tạo"];
    const rows = customers.map((c, index) => [
      index + 1,
      c.name,
      c.phone,
      getBadgeLabel(c.badge),
      c.totalTrips,
      c.totalSpending,
      c.favoriteRoute || "",
      c.notes || "",
      new Date(c.createdAt).toLocaleDateString("vi-VN")
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `khach-hang-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const exportToExcel = () => {
    // Simple Excel XML format
    const headers = ["STT", "Tên khách hàng", "Số điện thoại", "Phân hạng", "Tổng chuyến", "Tổng chi tiêu", "Tuyến đường", "Ghi chú", "Ngày tạo"];
    const rows = customers.map((c, index) => [
      index + 1,
      c.name,
      c.phone,
      getBadgeLabel(c.badge),
      c.totalTrips,
      c.totalSpending,
      c.favoriteRoute || "",
      c.notes || "",
      new Date(c.createdAt).toLocaleDateString("vi-VN")
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    xml += '<Worksheet ss:Name="Khách hàng"><Table>';
    
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
    link.download = `khach-hang-${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    setShowExportMenu(false);
  };

  const getBadgeStyles = (badge: string) => {
    switch (badge) {
      case "vip":
        return "bg-gradient-to-r from-amber-400 to-orange-500 text-white";
      case "regular":
        return "bg-gradient-to-r from-green-500 to-emerald-600 text-white";
      default:
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
    }
  };

  const getBadgeLabel = (badge: string) => {
    switch (badge) {
      case "vip":
        return "VIP";
      case "regular":
        return "Khách quen";
      default:
        return "Khách mới";
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Quản lý khách hàng</h1>
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Xuất</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
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
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                className="w-full pl-12 pr-4 py-3 lg:py-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <button
              onClick={() => setBadgeFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                badgeFilter === "all" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tất cả ({customers.length})
            </button>
            <button
              onClick={() => setBadgeFilter("vip")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                badgeFilter === "vip" 
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              VIP ({customers.filter(c => c.badge === "vip").length})
            </button>
            <button
              onClick={() => setBadgeFilter("regular")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                badgeFilter === "regular" 
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Khách quen ({customers.filter(c => c.badge === "regular").length})
            </button>
            <button
              onClick={() => setBadgeFilter("new")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                badgeFilter === "new" 
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Khách mới ({customers.filter(c => c.badge === "new").length})
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tổng khách</p>
                  <p className="text-lg font-bold text-slate-800">{customers.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">VIP</p>
                  <p className="text-lg font-bold text-slate-800">
                    {customers.filter((c) => c.badge === "vip").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Khách quen</p>
                  <p className="text-lg font-bold text-slate-800">
                    {customers.filter((c) => c.badge === "regular").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tổng doanh thu</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpending, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Khách hàng</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Phân hạng</th>
                    <th 
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("totalTrips")}
                    >
                      <div className="flex items-center gap-1">
                        Tổng chuyến
                        <SortIcon column="totalTrips" />
                      </div>
                    </th>
                    <th 
                      className="text-left px-4 py-3 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("totalSpending")}
                    >
                      <div className="flex items-center gap-1">
                        Tổng chi tiêu
                        <SortIcon column="totalSpending" />
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Tuyến đường</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Đang tải...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Chưa có khách hàng nào
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{customer.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-slate-500">{customer.phone}</span>
                              <a
                                href={`tel:${customer.phone}`}
                                className="p-1 rounded bg-blue-100 hover:bg-blue-200"
                              >
                                <Phone className="w-3 h-3 text-blue-600" />
                              </a>
                              <a
                                href={`https://zalo.me/${customer.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden lg:flex p-1 rounded bg-blue-50 hover:bg-blue-100"
                              >
                                <MessageCircle className="w-3 h-3 text-blue-500" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBadgeStyles(customer.badge)}`}>
                            {getBadgeLabel(customer.badge)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{customer.totalTrips}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {formatCurrency(customer.totalSpending)}
                        </td>
                        <td className="px-4 py-3">
                          {customer.favoriteRoute ? (
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="w-3 h-3" />
                              {customer.favoriteRoute}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {customer.notes ? (
                            <div className="flex items-start gap-1 text-sm text-slate-500 max-w-[150px]">
                              <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="truncate">{customer.notes}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Đang tải...</div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Chưa có khách hàng nào</div>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{customer.name}</h3>
                      <p className="text-sm text-slate-500">{customer.phone}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBadgeStyles(customer.badge)}`}>
                      {getBadgeLabel(customer.badge)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Tổng chuyến</p>
                      <p className="font-semibold text-slate-800">{customer.totalTrips}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Chi tiêu</p>
                      <p className="font-semibold text-slate-800">{formatCurrency(customer.totalSpending)}</p>
                    </div>
                  </div>

                  {customer.favoriteRoute && (
                    <div className="flex items-center gap-1 text-sm text-slate-600 mb-2">
                      <MapPin className="w-3 h-3" />
                      {customer.favoriteRoute}
                    </div>
                  )}

                  {customer.notes && (
                    <div className="flex items-start gap-1 text-sm text-slate-500">
                      <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{customer.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <a
                      href={`tel:${customer.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium min-h-[44px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-4 h-4" />
                      Gọi
                    </a>
                    <a
                      href={`https://zalo.me/${customer.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden lg:flex flex-1 items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium min-h-[44px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Zalo
                    </a>
                    <button
                      className="p-2.5 text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(customer);
                      }}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer Detail Modal (Mobile) */}
          {selectedCustomer && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
              <div className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">Chi tiết khách hàng</h2>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-2 -mr-2 text-slate-500 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{selectedCustomer.name}</h3>
                      <p className="text-slate-500">{selectedCustomer.phone}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getBadgeStyles(selectedCustomer.badge)}`}>
                      {getBadgeLabel(selectedCustomer.badge)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Tổng chuyến</p>
                      <p className="text-xl font-bold text-slate-800">{selectedCustomer.totalTrips}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Tổng chi tiêu</p>
                      <p className="text-xl font-bold text-slate-800">{formatCurrency(selectedCustomer.totalSpending)}</p>
                    </div>
                  </div>

                  {selectedCustomer.favoriteRoute && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Tuyến đường hay đi</p>
                      <div className="flex items-center gap-2 text-slate-800">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {selectedCustomer.favoriteRoute}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.notes && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Ghi chú</p>
                      <p className="text-slate-800">{selectedCustomer.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium min-h-[48px]"
                    >
                      <Phone className="w-5 h-5" />
                      Gọi ngay
                    </a>
                    <a
                      href={`https://zalo.me/${selectedCustomer.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden lg:flex flex-1 items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium min-h-[48px]"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Nhắn Zalo
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Sidebar>
      <BottomNav />

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
