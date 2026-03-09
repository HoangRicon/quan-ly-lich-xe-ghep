"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Search, Plus, MapPin, Clock, Phone, MessageCircle, Car, User, 
  ChevronDown, Check, X, Edit2, Trash2, MoreHorizontal, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Trip {
  id: number;
  title: string;
  departure: string;
  destination: string;
  departureTime: string;
  arrivalTime: string | null;
  price: number;
  status: string;
  totalSeats: number;
  availableSeats: number;
  vehicle: {
    id: number;
    name: string;
    licensePlate: string;
    vehicleType: string;
    seats: number;
  } | null;
  driver: {
    id: number;
    fullName: string;
    phone: string;
  } | null;
  customer: {
    id: number;
    name: string;
    phone: string;
  } | null;
  passengerCount: number;
}

interface Driver {
  id: number;
  fullName: string;
  phone: string;
  status: string;
  rating: number;
  vehicle: {
    name: string;
    licensePlate: string;
    vehicleType: string;
    seats: number;
  } | null;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; next: string[] }> = {
  scheduled: { label: "Chờ gán", bg: "bg-orange-100", text: "text-orange-700", next: ["confirmed", "running", "completed", "cancelled"] },
  confirmed: { label: "Đã gán", bg: "bg-blue-100", text: "text-blue-700", next: ["running", "completed", "cancelled"] },
  running: { label: "Đang đi", bg: "bg-green-100", text: "text-green-700", next: ["completed", "cancelled"] },
  completed: { label: "Hoàn thành", bg: "bg-slate-100", text: "text-slate-700", next: [] },
  cancelled: { label: "Đã hủy", bg: "bg-red-100", text: "text-red-700", next: [] },
};

const statusLabels: Record<string, string> = {
  scheduled: "Chờ gán",
  confirmed: "Đã gán",
  running: "Đang đi",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export default function ScheduleList() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  
  // Status dropdown state
  const [openStatusMenu, setOpenStatusMenu] = useState<number | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  
  // Driver modal state
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  
  // Inline edit state
  const [editingField, setEditingField] = useState<{ tripId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  
  // Delete modal state
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);

  useEffect(() => {
    fetchTrips();
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setOpenStatusMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFilter) params.set("date", dateFilter);

      const res = await fetch(`/api/trips?${params}`);
      const data = await res.json();
      if (data.success) {
        setTrips(data.data);
      }
    } catch (error) {
      console.error("Fetch trips error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();
      if (data.data) {
        setDrivers(data.data);
      }
    } catch (error) {
      console.error("Fetch drivers error:", error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const openDriverModal = (tripId: number) => {
    setSelectedTripId(tripId);
    fetchDrivers();
    setShowDriverModal(true);
  };

  const assignDriver = async (driverId: number) => {
    try {
      const res = await fetch(`/api/trips/${selectedTripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          driverId,
          status: "confirmed"
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDriverModal(false);
        fetchTrips();
      } else {
        alert(data.error || "Lỗi khi gán tài xế");
      }
    } catch (error) {
      console.error("Assign driver error:", error);
      alert("Lỗi khi gán tài xế");
    }
  };

  const updateStatus = async (tripId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOpenStatusMenu(null);
        fetchTrips();
      } else {
        alert(data.error || "Lỗi khi cập nhật trạng thái");
      }
    } catch (error) {
      console.error("Update status error:", error);
      alert("Lỗi khi cập nhật trạng thái");
    }
  };

  const startInlineEdit = (tripId: number, field: string, currentValue: string) => {
    setEditingField({ tripId, field });
    setEditValue(currentValue);
  };

  const saveInlineEdit = async (tripId: number) => {
    try {
      const field = editingField?.field;
      if (!field) return;
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: field === "price" ? parseFloat(editValue) : editValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingField(null);
        fetchTrips();
      } else {
        alert(data.error || "Lỗi khi lưu");
      }
    } catch (error) {
      console.error("Save edit error:", error);
      alert("Lỗi khi lưu");
    }
  };

  const deleteTrip = async () => {
    if (!deletingTrip) return;
    try {
      const res = await fetch(`/api/trips/${deletingTrip.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeletingTrip(null);
        fetchTrips();
      } else {
        alert(data.error || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("Delete trip error:", error);
      alert("Lỗi khi xóa");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isOverdue = (departureTime: string, status: string) => {
    if (status === "completed" || status === "cancelled") return false;
    const now = new Date();
    const departure = new Date(departureTime);
    return now > departure;
  };

  const filteredTrips = trips.filter((trip) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      trip.departure?.toLowerCase().includes(search) ||
      trip.destination?.toLowerCase().includes(search) ||
      trip.customer?.name?.toLowerCase().includes(search) ||
      trip.customer?.phone?.includes(search) ||
      trip.vehicle?.licensePlate?.toLowerCase().includes(search) ||
      trip.driver?.fullName?.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm chuyến, khách hàng, tài xế..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Chọn ngày"
            className="px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-base"
          />
          <Link href="/dashboard/schedule/add">
            <Button className="bg-blue-600 hover:bg-blue-700 min-h-[44px]">
              <Plus className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Thêm cuốc</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["all", "scheduled", "confirmed", "running", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
              statusFilter === status
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {status === "all" ? "Tất cả" : statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Trips List - Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Đang tải...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Chưa có chuyến xe nào
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className={`bg-white rounded-xl border-2 p-4 space-y-3 ${
                isOverdue(trip.departureTime, trip.status) ? "border-red-300 animate-pulse" : "border-slate-200"
              }`}
            >
              {/* Header: Time & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-lg font-bold text-slate-800">
                    {formatTime(trip.departureTime)}
                  </span>
                  <span className="text-sm text-slate-500">{formatDate(trip.departureTime)}</span>
                </div>
                
                {/* Status Badge with Dropdown */}
                <div className="relative" ref={statusMenuRef}>
                  <button
                    onClick={() => setOpenStatusMenu(openStatusMenu === trip.id ? null : trip.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium ${statusConfig[trip.status]?.bg} ${statusConfig[trip.status]?.text}`}
                  >
                    {statusConfig[trip.status]?.label}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {openStatusMenu === trip.id && statusConfig[trip.status]?.next.length > 0 && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                      {statusConfig[trip.status]?.next.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          onClick={() => updateStatus(trip.id, nextStatus)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-700"
                        >
                          {statusLabels[nextStatus]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {/* Departure - Inline Edit */}
                  {editingField?.tripId === trip.id && editingField?.field === "departure" ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm"
                        autoFocus
                      />
                      <button onClick={() => saveInlineEdit(trip.id)} className="p-1 text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingField(null)} className="p-1 text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => startInlineEdit(trip.id, "departure", trip.departure)}
                      className="font-medium text-slate-800 cursor-pointer hover:text-blue-600 flex items-center gap-1"
                    >
                      {trip.departure}
                      <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <span className="text-slate-600">{trip.destination}</span>
                  </div>
                </div>
              </div>

              {/* Customer & Driver */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700">{trip.customer?.name || "Khách vãng lai"}</span>
                </div>
                {trip.driver ? (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Car className="w-4 h-4" />
                    {trip.driver.fullName}
                  </div>
                ) : (
                  <button
                    onClick={() => openDriverModal(trip.id)}
                    className="text-sm text-blue-600 font-medium min-h-[44px] px-3 hover:underline"
                  >
                    + Gán tài xế
                  </button>
                )}
              </div>

              {/* Price & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div 
                  onClick={() => startInlineEdit(trip.id, "price", trip.price.toString())}
                  className="cursor-pointer hover:text-blue-600"
                >
                  {editingField?.tripId === trip.id && editingField?.field === "price" ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 px-2 py-1 border border-blue-300 rounded text-sm"
                        autoFocus
                      />
                      <button onClick={() => saveInlineEdit(trip.id)} className="p-1 text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingField(null)} className="p-1 text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-bold text-lg text-slate-800">{formatCurrency(trip.price)}</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {trip.customer?.phone && (
                    <>
                      <a
                        href={`tel:${trip.customer.phone}`}
                        className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                      <a
                        href={`https://zalo.me/${trip.customer.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => setDeletingTrip(trip)}
                    className="p-3 rounded-lg hover:bg-red-50 text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Trips List - Desktop */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Thời gian</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Khách hàng</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Lộ trình</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Tài xế</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Trạng thái</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Giá</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Liên hệ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredTrips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Chưa có chuyến xe nào
                </td>
              </tr>
            ) : (
              filteredTrips.map((trip) => (
                <tr key={trip.id} className={`border-b border-slate-100 hover:bg-slate-50 ${isOverdue(trip.departureTime, trip.status) ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-800">{formatTime(trip.departureTime)}</div>
                        <div className="text-xs text-slate-500">{formatDate(trip.departureTime)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-800">{trip.customer?.name || "Khách vãng lai"}</div>
                      <div className="text-sm text-slate-500">{trip.customer?.phone || ""}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div className="truncate">
                        <div className="text-sm text-slate-800">{trip.departure}</div>
                        <div className="text-xs text-slate-500">→ {trip.destination}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {trip.driver ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white text-sm font-medium">
                          {trip.driver.fullName?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{trip.driver.fullName}</div>
                          <div className="text-xs text-slate-500">{trip.vehicle?.licensePlate || ""}</div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openDriverModal(trip.id)}
                        className="text-sm text-blue-600 font-medium hover:underline"
                      >
                        + Gán tài xế
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative" ref={statusMenuRef}>
                      <button
                        onClick={() => setOpenStatusMenu(openStatusMenu === trip.id ? null : trip.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig[trip.status]?.bg} ${statusConfig[trip.status]?.text}`}
                      >
                        {statusConfig[trip.status]?.label}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      
                      {openStatusMenu === trip.id && statusConfig[trip.status]?.next.length > 0 && (
                        <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                          {statusConfig[trip.status]?.next.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              onClick={() => updateStatus(trip.id, nextStatus)}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 text-slate-700"
                            >
                              {statusLabels[nextStatus]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-slate-800">{formatCurrency(trip.price)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {trip.customer?.phone && (
                        <>
                          <a
                            href={`tel:${trip.customer.phone}`}
                            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                            title="Gọi điện"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://zalo.me/${trip.customer.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600"
                            title="Zalo"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => setDeletingTrip(trip)}
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

      {/* Driver Selection Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Chọn tài xế</h2>
              <button onClick={() => setShowDriverModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tài xế..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              {loadingDrivers ? (
                <div className="p-8 text-center text-slate-500">Đang tải...</div>
              ) : drivers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Chưa có tài xế nào</div>
              ) : (
                drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => assignDriver(driver.id)}
                    className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold">
                      {driver.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{driver.fullName}</div>
                      <div className="text-sm text-slate-500">
                        {driver.vehicle?.licensePlate || "Chưa có xe"} • {driver.phone}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      driver.status === "available" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {driver.status === "available" ? "Rảnh" : driver.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTrip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Xóa chuyến xe</h2>
              <p className="text-slate-600">
                Bạn có chắc chắn muốn xóa chuyến xe từ <strong>{deletingTrip.departure}</strong> đến <strong>{deletingTrip.destination}</strong> không?
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <Button
                variant="outline"
                onClick={() => setDeletingTrip(null)}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={deleteTrip}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
