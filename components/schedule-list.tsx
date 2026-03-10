"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Search, Plus, MapPin, Clock, Phone, MessageCircle, Car, User, 
  ChevronDown, Check, X, Edit2, Trash2, MoreHorizontal, ArrowRight,
  Bell, Calendar, ChevronLeft, ChevronRight, ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell 
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";

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

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  vehicleType: string;
  seats: number;
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
  
  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<"departureTime" | "price" | "status">("departureTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 10;

  // Status dropdown state
  const [openStatusMenu, setOpenStatusMenu] = useState<number | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  
  // Driver modal state
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  
  // Inline edit state
  const [editingField, setEditingField] = useState<{ tripId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  
  // Delete modal state
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);

  // Edit sheet state
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState({
    departure: "",
    destination: "",
    departureTime: "",
    price: "",
    customerName: "",
    customerPhone: "",
    driverId: null as number | null,
    vehicleId: null as number | null,
    status: "scheduled",
  });

  // Reminder state
  const [remindedDriver, setRemindedDriver] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutsideSheet = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        if (showEditSheet) {
          setShowEditSheet(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutsideSheet);
    return () => document.removeEventListener("mousedown", handleClickOutsideSheet);
  }, [showEditSheet]);

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

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const res = await fetch("/api/vehicles?includeInactive=true");
      const data = await res.json();
      if (data.data) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error("Fetch vehicles error:", error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const openDriverModal = (tripId: number) => {
    setSelectedTripId(tripId);
    fetchDrivers();
    setShowDriverModal(true);
  };

  const openVehicleModal = (tripId: number) => {
    setSelectedTripId(tripId);
    fetchVehicles();
    setShowVehicleModal(true);
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

  const assignVehicle = async (vehicleId: number) => {
    try {
      const res = await fetch(`/api/trips/${selectedTripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowVehicleModal(false);
        fetchTrips();
      } else {
        alert(data.error || "Lỗi khi gán xe");
      }
    } catch (error) {
      console.error("Assign vehicle error:", error);
      alert("Lỗi khi gán xe");
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

  // Handle "Today" button click
  const handleTodayFilter = () => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    setDateFilter(dateStr);
    setCurrentPage(1);
  };

  // Sort and paginate
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

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    let aVal: any, bVal: any;
    if (sortField === "departureTime") {
      aVal = new Date(a.departureTime).getTime();
      bVal = new Date(b.departureTime).getTime();
    } else if (sortField === "price") {
      aVal = a.price;
      bVal = b.price;
    } else if (sortField === "status") {
      aVal = a.status;
      bVal = b.status;
    }
    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const totalPages = Math.ceil(sortedTrips.length / itemsPerPage);
  const paginatedTrips = sortedTrips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Edit sheet functions
  const openEditSheet = (trip: Trip) => {
    setEditingTrip(trip);
    const deptDate = new Date(trip.departureTime);
    setEditForm({
      departure: trip.departure,
      destination: trip.destination,
      departureTime: deptDate.toTimeString().slice(0, 5),
      price: trip.price?.toString() || "",
      customerName: trip.customer?.name || "",
      customerPhone: trip.customer?.phone || "",
      driverId: trip.driver?.id || null,
      vehicleId: trip.vehicle?.id || null,
      status: trip.status || "scheduled",
    });
    // Fetch drivers and vehicles for combobox
    fetchDrivers();
    fetchVehicles();
    setShowEditSheet(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTrip) return;
    try {
      const res = await fetch(`/api/trips/${editingTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure: editForm.departure,
          destination: editForm.destination,
          departureTime: editForm.departureTime,
          price: editForm.price,
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          driverId: editForm.driverId,
          vehicleId: editForm.vehicleId,
          status: editForm.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditSheet(false);
        fetchTrips();
      } else {
        alert(data.error || "Lỗi khi lưu");
      }
    } catch (error) {
      console.error("Save edit error:", error);
      alert("Lỗi khi lưu");
    }
  };

  const handleRemindDriver = async (trip: Trip) => {
    if (!trip.driver) return;
    
    const driverName = trip.driver.fullName;
    const customerName = trip.customer?.name || "Khách";
    const time = formatTime(trip.departureTime);
    const route = `${trip.departure} → ${trip.destination}`;
    
    const message = `Nhắc nhở: Tài xế ${driverName}, bạn có lịch đón khách ${customerName} lúc ${time}. Tuyến: ${route}. Vui lới xác nhận!`;
    
    const zaloUrl = `zalo://compose?text=${encodeURIComponent(message)}&phone_to=${encodeURIComponent(trip.driver.phone)}`;
    const webZaloUrl = `https://zalo.me/${trip.driver.phone}?text=${encodeURIComponent(message)}`;
    
    setRemindedDriver(trip.id);
    setTimeout(() => setRemindedDriver(null), 3000);
    
    window.location.href = zaloUrl;
    setTimeout(() => {
      window.open(webZaloUrl, "_blank");
    }, 500);
  };

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
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Today Button */}
          <Button
            variant={dateFilter === new Date().toISOString().split("T")[0] ? "default" : "outline"}
            onClick={handleTodayFilter}
            className={dateFilter === new Date().toISOString().split("T")[0] ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Hôm nay
          </Button>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
            placeholder="Chọn ngày"
            className="px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-base"
          />
          {dateFilter && (
            <Button variant="ghost" onClick={() => { setDateFilter(""); setCurrentPage(1); }}>
              <X className="w-4 h-4" />
            </Button>
          )}
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
            onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
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

      {/* Mobile DataTable View - Optimized for iPhone - No horizontal scroll */}
      <div className="lg:hidden -mx-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 mx-4">
            Đang tải...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 mx-4">
            Chưa có chuyến xe nào
          </div>
        ) : (
          <div className="space-y-2 px-4">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => openEditSheet(trip)}
                className={`bg-white rounded-xl border border-slate-200 p-3 cursor-pointer ${
                  isOverdue(trip.departureTime, trip.status) ? "border-red-300" : ""
                }`}
              >
                {/* Row 1: Time - Status - Price */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-800">{formatTime(trip.departureTime)}</span>
                    <span className="text-xs text-slate-400">{formatDate(trip.departureTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[trip.status]?.bg} ${statusConfig[trip.status]?.text}`}>
                      {statusConfig[trip.status]?.label}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">{formatCurrency(trip.price)}</span>
                  </div>
                </div>

                {/* Row 2: Route */}
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800 truncate">{trip.departure}</div>
                    <div className="text-xs text-slate-400">→ {trip.destination}</div>
                  </div>
                </div>

                {/* Row 3: Customer - Driver - Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Customer */}
                    <div className="flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600 truncate">{trip.customer?.name || "Khách"}</span>
                    </div>
                    {/* Driver */}
                    <div className="flex items-center gap-1 min-w-0">
                      {trip.driver ? (
                        <>
                          <Car className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600 truncate">{trip.driver.fullName}</span>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); openDriverModal(trip.id); }}
                          className="text-xs text-blue-600 font-medium"
                        >
                          + Gán TX
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {trip.customer?.phone && (
                      <a
                        href={`tel:${trip.customer.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded bg-blue-600 text-white"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                    {trip.driver && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemindDriver(trip); }}
                        className={`p-1.5 rounded ${remindedDriver === trip.id ? "bg-green-100 text-green-600" : "bg-purple-50 text-purple-600"}`}
                      >
                        {remindedDriver === trip.id ? <Check className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingTrip(trip); }}
                      className="p-1.5 rounded hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 px-4">
            <span className="text-xs text-slate-500">
              {filteredTrips.length} chuyến
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop DataTable View */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                  <button 
                    onClick={() => handleSort("departureTime")}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Thời gian
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Khách hàng</TableHead>
                <TableHead className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Lộ trình</TableHead>
                <TableHead className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Tài xế / Xe</TableHead>
                <TableHead className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                  <button 
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Trạng thái
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead className="text-right px-4 py-3 text-sm font-semibold text-slate-600">
                  <button 
                    onClick={() => handleSort("price")}
                    className="flex items-center gap-1 ml-auto hover:text-blue-600"
                  >
                    Giá
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </TableHead>
                <TableHead className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : paginatedTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Chưa có chuyến xe nào
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTrips.map((trip) => (
                  <TableRow key={trip.id} className={`${isOverdue(trip.departureTime, trip.status) ? "bg-red-50" : ""}`}>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-800">{formatTime(trip.departureTime)}</div>
                          <div className="text-xs text-slate-500">{formatDate(trip.departureTime)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-800">{trip.customer?.name || "Khách vãng lai"}</div>
                        <div className="text-sm text-slate-500">{trip.customer?.phone || ""}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <div className="truncate">
                          <div className="text-sm text-slate-800">{trip.departure}</div>
                          <div className="text-xs text-slate-500">→ {trip.destination}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {trip.driver ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white text-sm font-medium">
                            {trip.driver.fullName?.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">{trip.driver.fullName}</div>
                            <div className="text-xs text-slate-500">{trip.vehicle?.licensePlate || "Chưa có xe"}</div>
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
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button
                        onClick={() => openEditSheet(trip)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${statusConfig[trip.status]?.bg} ${statusConfig[trip.status]?.text}`}
                      >
                        {statusConfig[trip.status]?.label}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <span className="font-medium text-slate-800">{formatCurrency(trip.price)}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
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
                        {trip.driver && (
                          <button
                            onClick={() => handleRemindDriver(trip)}
                            className={`p-2 rounded-lg ${
                              remindedDriver === trip.id
                                ? "bg-green-100 text-green-600"
                                : "bg-purple-50 hover:bg-purple-100 text-purple-600"
                            }`}
                            title="Nhắc tài xế"
                          >
                            {remindedDriver === trip.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => openEditSheet(trip)}
                          className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTrip(trip)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-500">
              Trang {currentPage} / {totalPages} ({filteredTrips.length} chuyến)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Driver Selection Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
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

      {/* Vehicle Selection Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Chọn xe</h2>
              <button onClick={() => setShowVehicleModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              {loadingVehicles ? (
                <div className="p-8 text-center text-slate-500">Đang tải...</div>
              ) : vehicles.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Chưa có xe nào</div>
              ) : (
                vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => assignVehicle(vehicle.id)}
                    className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
                      <Car className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{vehicle.name}</div>
                      <div className="text-sm text-slate-500">
                        {vehicle.licensePlate} • {vehicle.seats} chỗ
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Sheet - Bottom Sheet for Mobile */}
      {showEditSheet && editingTrip && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditSheet(false)} />
          <div 
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up flex flex-col"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-400">Mã cuốc #{editingTrip.id}</p>
                  <h2 className="text-lg font-bold text-slate-800">Chỉnh sửa thông tin</h2>
                </div>
                <button onClick={() => setShowEditSheet(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1" style={{ maxHeight: 'calc(85vh - 180px)' }}>
              {/* Customer Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm font-medium text-blue-800 mb-3">Thông tin khách hàng</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tên khách hàng</label>
                    <input
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder="Tên khách"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={editForm.customerPhone}
                      onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder="SĐT"
                    />
                  </div>
                </div>
              </div>

              {/* Trip Info */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-medium text-slate-700 mb-3">Thông tin chuyến</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Điểm đón</label>
                    <input
                      type="text"
                      value={editForm.departure}
                      onChange={(e) => setEditForm({ ...editForm, departure: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder="Điểm đón"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Điểm đến</label>
                    <input
                      type="text"
                      value={editForm.destination}
                      onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder="Điểm đến"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Giờ đi (HH:MM)</label>
                    <input
                      type="time"
                      value={editForm.departureTime}
                      onChange={(e) => setEditForm({ ...editForm, departureTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Giá (VNĐ)</label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder="Giá tiền"
                    />
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle */}
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-sm font-medium text-amber-800 mb-3">Tài xế & Xe</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tài xế</label>
                    <Combobox
                      options={drivers.map(driver => ({
                        value: driver.id,
                        label: driver.fullName,
                        sublabel: driver.phone
                      }))}
                      value={editForm.driverId}
                      onChange={(val) => setEditForm({ ...editForm, driverId: val as number | null })}
                      placeholder="-- Chọn tài xế --"
                      searchPlaceholder="Tìm tài xế..."
                      emptyText="Không có tài xế"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Xe</label>
                    <Combobox
                      options={vehicles.map(vehicle => ({
                        value: vehicle.id,
                        label: vehicle.name,
                        sublabel: `${vehicle.licensePlate} - ${vehicle.seats} chỗ`
                      }))}
                      value={editForm.vehicleId}
                      onChange={(val) => setEditForm({ ...editForm, vehicleId: val as number | null })}
                      placeholder="-- Chọn xe --"
                      searchPlaceholder="Tìm xe..."
                      emptyText="Không có xe"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-medium text-slate-700 mb-3">Trạng thái</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setEditForm({ ...editForm, status: key })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${editForm.status === key ? "ring-2 ring-blue-500" : ""} ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0 flex gap-3">
              <button
                onClick={() => setShowEditSheet(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
              >
                <Check className="w-5 h-5" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTrip && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
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

      <style jsx>{`
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
