"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Search, Plus, MapPin, Clock, Phone, MessageCircle, Car, 
  ChevronDown, Check, X, Edit2, Trash2, MoreHorizontal, ArrowRight,
  Bell, Calendar, ChevronLeft, ChevronRight, ArrowUpDown, Copy, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell 
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { statusColorClasses, useTripStatuses } from "@/lib/useTripStatuses";

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
  createdAt: string;
  notes: string | null;
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
    email?: string;
  } | null;
  passengerCount: number;
}

interface Driver {
  id: number;
  fullName: string | null;
  totalRevenue?: number;
}

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  vehicleType: string;
  seats: number;
}

// statusConfig/statusLabels moved to Settings-managed statuses (see /api/trip-statuses)

function formatPriceK(price: string): string {
  const n = parseInt((price || "").toString().replace(/[^\d]/g, ""), 10) || 0;
  if (!n) return "";
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
}

// Ghi chú tự động (bắt chước mẫu trong TripForm)
function generateAutoNoteLikeTripForm(
  departureTime: string,
  departure: string,
  destination: string,
  price: string,
  phone: string,
  seats: number,
  tripType: "ghep" | "bao"
): string {
  // Tính thời gian chênh lệch
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  const [hours, minutes] = (departureTime || "").split(":").map(Number);

  // Tính số phút chênh lệch từ giờ hiện tại đến giờ đi
  let diffMinutes = (hours * 60 + minutes) - (currentHours * 60 + currentMinutes);

  // Nếu giờ đi = giờ hiện tại, tính là 0 phút (khách đi ngay)
  // Nếu giờ đi đã qua trong ngày, tính cho ngày mai
  if (diffMinutes === 0) {
    diffMinutes = 0;
  } else if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Cộng 24 giờ
  }

  // Đảm bảo tối thiểu là 1 phút
  const displayMinutes = Math.max(1, diffMinutes);

  // Xác định loại ghế
  let seatType = "";
  if (tripType === "bao") {
    seatType = "bx";
  } else if (seats === 1) {
    seatType = "1k";
  } else if (seats >= 2) {
    seatType = "2k";
  } else {
    seatType = "1k";
  }

  // Format giá tiền (vd: 90000 -> 90k, 150000 -> 150k)
  const priceNum = parseInt((price || "").replace(/\./g, "")) || 0;
  const priceDisplay = priceNum >= 1000 ? `${Math.round(priceNum / 1000)}k` : priceNum.toString();

  // Tạo phần thời gian
  let timePart = "";
  if (diffMinutes <= 60) {
    // Dưới hoặc bằng 60 phút: 0-Xp
    timePart = `0-${displayMinutes}p ${seatType}`;
  } else {
    // Trên 60 phút: Giờ đi loại (không có ngoặc)
    const departureHour = (hours || 0).toString().padStart(2, "0");
    const departureMinute = (minutes || 0).toString().padStart(2, "0");
    timePart = `${departureHour}h${departureMinute} ${seatType}`;
  }

  const safeDeparture = (departure || "").trim() || "?";
  const safeDestination = (destination || "").trim() || "?";
  const safePhone = (phone || "").trim();

  // Ghép các phần thành ghi chú
  return `${timePart} ${safeDeparture} - ${safeDestination} ${priceDisplay} ${safePhone}`.trim();
}

export default function ScheduleList() {
  const { statuses, map: statusMap, priority: statusPriority, nextMap } = useTripStatuses();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<"departureTime" | "price" | "status">("departureTime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 10;

  // Status dropdown state
  const [openStatusMenu, setOpenStatusMenu] = useState<number | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Notification dropdown state (touch-friendly; no hover dependency)
  const [openNotifyMenu, setOpenNotifyMenu] = useState<number | null>(null);
  const notifyMenuRef = useRef<HTMLDivElement>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
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
    departureDate: "",
    departureTime: "",
    price: "",
    customerName: "",
    customerPhone: "",
    driverId: null as number | null,
    vehicleId: null as number | null,
    status: "scheduled",
    notes: "",
  });

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
    const handleClickOutside = (event: MouseEvent) => {
      if (notifyMenuRef.current && !notifyMenuRef.current.contains(event.target as Node)) {
        setOpenNotifyMenu(null);
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

      const res = await fetch(`/api/trips?${params}`, { cache: "no-store" });
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
      // `/api/drivers` is paginated (default limit=10). Fetch all pages so the picker shows full list.
      const all: Driver[] = [];
      let page = 1;
      const limit = 100;
      let totalPages = 1;
      while (page <= totalPages) {
        const res = await fetch(`/api/drivers?page=${page}&limit=${limit}`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          all.push(...data.data);
        }
        totalPages = Number(data?.pagination?.totalPages || 1);
        page += 1;
      }
      setDrivers(all);
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
        cache: "no-store",
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

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const copyToClipboard = async (text: string, label: string) => {
    // Try Clipboard API first
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setToast({ message: `${label} đã sao chép!`, type: "success" });
        setTimeout(() => setToast(null), 2000);
        return;
      } catch (err) {
        console.warn("Clipboard API failed, trying fallback:", err);
      }
    }
    
    // Fallback for HTTP/non-secure contexts
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      
      if (success) {
        setToast({ message: `${label} đã sao chép!`, type: "success" });
        setTimeout(() => setToast(null), 2000);
      } else {
        setToast({ message: "Sao chép thất bại", type: "error" });
        setTimeout(() => setToast(null), 2000);
      }
    } catch (err) {
      console.error("Copy failed:", err);
      setToast({ message: "Sao chép thất bại", type: "error" });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const sendNotification = async (trip: Trip, type: "email" | "system") => {
    const customer = trip.customer;
    if (!customer) {
      alert("Không có thông tin khách hàng");
      return;
    }

    const departureDate = new Date(trip.departureTime);
    const dateStr = departureDate.toLocaleDateString("vi-VN");
    const timeStr = formatTime(trip.departureTime);
    const statusLabel = statusMap.get(trip.status)?.label || trip.status;

    const message = `Chuyến xe ${trip.id}: ${trip.departure} → ${trip.destination}, ${timeStr} ngày ${dateStr}. Trạng thái: ${statusLabel}`;

    if (type === "email") {
      // Send to admin/operator email configured in Settings (NOT customer's email)
      let toEmail = "";
      try {
        const r = await fetch("/api/system-settings?category=email");
        const d = await r.json();
        if (d?.success && Array.isArray(d?.settings)) {
          const map: Record<string, string> = {};
          d.settings.forEach((s: { key: string; value: string | null }) => {
            if (typeof s?.key === "string" && typeof s?.value === "string") map[s.key] = s.value;
          });
          toEmail = String(map.reminder_to_email || map.from_email || "").trim();
        }
      } catch {
        // ignore; we'll validate below
      }
      if (!toEmail) {
        alert("Chưa cấu hình Email nhận nhắc lịch (Cài đặt → Email SMTP)");
        return;
      }
      // Gửi email thật qua server (SMTP)
      const res = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "trip_reminder",
          email: toEmail,
          data: {
            customer_name: customer.name,
            departure_time: `${timeStr} ${dateStr}`,
            pickup_location: trip.departure,
            dropoff_location: trip.destination,
          },
        }),
      });
      const result = await res.json();
      setToast({
        message: result?.success ? `Đã gửi email tới ${toEmail}` : (result?.error || "Gửi email thất bại"),
        type: result?.success ? "success" : "error",
      });
      setTimeout(() => setToast(null), 3000);
    } else if (type === "system") {
      alert(`Thông báo: ${message}`);
    }
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
    // First, sort by status priority (scheduled first)
    const aPriority = statusPriority[a.status] || 99;
    const bPriority = statusPriority[b.status] || 99;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Then, sort by selected field within same status
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
      departureDate: deptDate.toISOString().split("T")[0],
      departureTime: deptDate.toTimeString().slice(0, 5),
      price: trip.price?.toString() || "",
      customerName: trip.customer?.name || "",
      customerPhone: trip.customer?.phone || "",
      driverId: trip.driver?.id || null,
      vehicleId: trip.vehicle?.id || null,
      status: trip.status || "scheduled",
      notes: (trip as any).notes || "",
    });
    // Fetch drivers and vehicles for combobox
    fetchDrivers();
    fetchVehicles();
    setShowEditSheet(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTrip) return;
    try {
      const departureDateTime = editForm.departureDate && editForm.departureTime 
        ? `${editForm.departureDate}T${editForm.departureTime}:00`
        : undefined;
        
      const res = await fetch(`/api/trips/${editingTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure: editForm.departure,
          destination: editForm.destination,
          departureTime: departureDateTime,
          price: editForm.price,
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          driverId: editForm.driverId,
          vehicleId: editForm.vehicleId,
          status: editForm.status,
          notes: editForm.notes || null,
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

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
          />
        </div>
      </div>

      {/* Filter & Sort Row - Mobile optimized */}
      <div className="flex flex-wrap gap-1 mb-2 items-center">
        {/* Sort Select */}
        <select
          value={sortField === "price" ? (sortDirection === "desc" ? "price_desc" : "price_asc") : (sortDirection === "desc" ? "newest" : "oldest")}
          onChange={(e) => {
            if (e.target.value === "newest") {
              setSortField("departureTime");
              setSortDirection("desc");
            } else if (e.target.value === "oldest") {
              setSortField("departureTime");
              setSortDirection("asc");
            } else if (e.target.value === "price_desc") {
              setSortField("price");
              setSortDirection("desc");
            } else if (e.target.value === "price_asc") {
              setSortField("price");
              setSortDirection("asc");
            }
            setCurrentPage(1);
          }}
          className="px-2 py-1 rounded border border-slate-200 focus:border-blue-500 outline-none text-xs bg-white"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="price_desc">Giá cao nhất</option>
          <option value="price_asc">Giá thấp nhất</option>
        </select>

        {/* Status Filter Select */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-2 py-1 rounded border border-slate-200 focus:border-blue-500 outline-none text-xs bg-white"
        >
          <option value="all">Tất cả</option>
          {statuses.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Datepicker + Today */}
        <div className="flex items-center gap-1">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className="pl-7 pr-2 py-1 rounded border border-slate-200 focus:border-blue-500 outline-none text-xs bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handleTodayFilter}
            className={`px-2 py-1 rounded border text-xs bg-white hover:bg-slate-50 ${
              dateFilter === todayStr ? "border-blue-300 text-blue-700" : "border-slate-200 text-slate-700"
            }`}
            title="Lọc hôm nay"
          >
            Hôm nay
          </button>
          {dateFilter && (
            <button
              type="button"
              onClick={() => { setDateFilter(""); setCurrentPage(1); }}
              className="px-2 py-1 rounded border border-slate-200 text-xs bg-white hover:bg-slate-50 text-slate-700"
              title="Xóa lọc ngày"
            >
              Tất cả
            </button>
          )}
        </div>
      </div>

      {/* Mobile DataTable View - Optimized for iPhone - No horizontal scroll */}
      <div className="lg:hidden -mx-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 mx-4">
            Đang tải...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 mx-4">
            Chưa có chuyến xe nào
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {paginatedTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => openEditSheet(trip)}
                className={`bg-white rounded-lg border border-slate-200 p-2 cursor-pointer ${
                  isOverdue(trip.departureTime, trip.status) ? "border-red-300" : ""
                }`}
              >
                {/* Row 1: Time/Date (left) - Driver (center) - Status + Notify (right) */}
                <div className="grid grid-cols-3 items-center gap-2 mb-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-800 text-base flex-shrink-0">{formatTime(trip.departureTime)}</span>
                    <span className="font-semibold text-slate-800 text-[11px] truncate">{formatFullDate(trip.departureTime)}</span>
                  </div>

                  <div className="flex justify-center">
                    {!trip.driver ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); openDriverModal(trip.id); }}
                        className="px-3 py-1 bg-blue-600 text-white text-[11px] font-medium rounded-lg"
                      >
                        + Tài xế
                      </button>
                    ) : (
                      <span className="text-[11px] text-green-600 font-medium truncate max-w-[130px]">
                        {trip.driver.fullName}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end items-center gap-2">
                    {trip.customer && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); sendNotification(trip, "email"); }}
                        className="p-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-600"
                        title="Nhắc khởi hành qua email (gửi tới email cấu hình)"
                        aria-label="Nhắc khởi hành qua email"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    )}
                    <select
                      value={trip.status}
                      onChange={(e) => { e.stopPropagation(); updateStatus(trip.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border ${statusColorClasses(statusMap.get(trip.status)?.color || "slate").bg} ${statusColorClasses(statusMap.get(trip.status)?.color || "slate").text} ${statusColorClasses(statusMap.get(trip.status)?.color || "slate").border}`}
                    >
                      {statuses.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Route - Single line with black color */}
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-slate-800 font-medium text-sm truncate">{trip.departure}</span>
                  <span className="text-slate-400 flex-shrink-0">→</span>
                  <span className="text-slate-800 font-medium text-sm truncate">{trip.destination}</span>
                </div>

                {/* Customer Phone - Left under route */}
                {trip.customer?.phone && (
                  <a
                    href={`tel:${String(trip.customer.phone).replace(/[^\d+]/g, "")}`}
                    className="text-xs text-blue-600 mb-0.5 inline-block hover:underline"
                    onClick={(e) => e.stopPropagation()}
                    title="Bấm để gọi"
                  >
                    {trip.customer.phone}
                  </a>
                )}

                {/* Row 4: Price - Copy - Delete */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-slate-800">{formatCurrency(trip.price)}</span>
                    {trip.notes && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(trip.notes || "", "Ghi chú"); }}
                        className="p-1 bg-amber-50 text-amber-600 rounded"
                        title={trip.notes}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeletingTrip(trip); }}
                      className="p-1 rounded hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2 px-3">
            <span className="text-xs text-slate-500">
              {paginatedTrips.length}/{sortedTrips.length} chuyến
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded bg-white border border-slate-200 text-xs disabled:opacity-50"
              >
                ←
              </button>
              <span className="px-2 py-1 text-xs">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded bg-white border border-slate-200 text-xs disabled:opacity-50"
              >
                →
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
                <TableHead className="text-left px-2 py-2 text-xs font-semibold text-slate-600 w-[70px]">
                  <button 
                    onClick={() => handleSort("departureTime")}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Giờ
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-left px-2 py-2 text-xs font-semibold text-slate-600 w-[80px]">
                  Ngày đặt
                </TableHead>
                <TableHead className="text-left px-2 py-2 text-xs font-semibold text-slate-600 w-[100px]">KH</TableHead>
                <TableHead className="text-left px-2 py-2 text-xs font-semibold text-slate-600 min-w-[150px]">Lộ trình</TableHead>
                <TableHead className="text-left px-2 py-2 text-xs font-semibold text-slate-600 w-[120px]">Tài xế</TableHead>
                <TableHead className="text-left px-2 py-2 text-xs font-semibold text-slate-600 w-[90px]">
                  <button 
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Trạng thái
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right px-2 py-2 text-xs font-semibold text-slate-600 w-[70px]">
                  <button 
                    onClick={() => handleSort("price")}
                    className="flex items-center gap-1 ml-auto hover:text-blue-600"
                  >
                    Giá
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center px-1 py-2 text-xs font-semibold text-slate-600 w-[100px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : paginatedTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Chưa có chuyến xe nào
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTrips.map((trip) => (
                  <TableRow key={trip.id} className={`${isOverdue(trip.departureTime, trip.status) ? "bg-red-50" : ""}`}>
                    <TableCell className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{formatTime(trip.departureTime)}</div>
                          <div className="text-xs text-slate-500">{formatDate(trip.departureTime)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="text-xs text-slate-500">{formatFullDate(trip.createdAt)}</div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {trip.customer?.phone ? (
                          <>
                            <span className="text-sm text-slate-800">{trip.customer.phone}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(trip.customer?.phone || "", "Số điện thoại"); }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                              title="Copy phone"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="flex items-start gap-1.5 max-w-[180px]">
                        <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="truncate min-w-0 w-full">
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                            <span>Điểm đón:</span>
                            <span className="font-normal truncate">{trip.departure}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(trip.departure, "Điểm đón"); }}
                              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 flex-shrink-0"
                              title="Copy điểm đón"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                            <span>Điểm đến:</span>
                            <span className="font-normal truncate">{trip.destination}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(trip.destination, "Điểm đến"); }}
                              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 flex-shrink-0"
                              title="Copy điểm đến"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {trip.driver ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white text-xs font-medium">
                            {trip.driver.fullName?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-800 truncate">{trip.driver.fullName}</div>
                            <div className="text-xs text-slate-500 truncate">{trip.vehicle?.licensePlate || "Chưa xe"}</div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openDriverModal(trip.id)}
                          className="text-xs text-blue-600 font-medium hover:underline"
                        >
                          + Gán TX
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenStatusMenu(openStatusMenu === trip.id ? null : trip.id); }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${statusColorClasses(statusMap.get(trip.status)?.color || "slate").bg} ${statusColorClasses(statusMap.get(trip.status)?.color || "slate").text}`}
                        >
                          {statusMap.get(trip.status)?.label || trip.status}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {openStatusMenu === trip.id && (
                          <div className="absolute z-20 mt-1 py-1 bg-white rounded-lg shadow-lg border border-slate-200 min-w-[120px]">
                            {(nextMap[trip.status] || []).slice(0, 6).map((nextStatus) => (
                              <button
                                key={nextStatus}
                                onClick={(e) => { e.stopPropagation(); updateStatus(trip.id, nextStatus); }}
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50"
                              >
                                {statusMap.get(nextStatus)?.label || nextStatus}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-medium text-slate-800 text-sm">{formatCurrency(trip.price)}</span>
                        {trip.notes && (
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(trip.notes || "", "Ghi chú"); }}
                            className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-600"
                            title={trip.notes || "Ghi chú"}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <div className="flex items-center justify-center gap-0.5 flex-wrap">
                        {trip.customer?.phone && (
                          <>
                            <a
                              href={`tel:${trip.customer.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
                              title="Gọi điện"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://zalo.me/${trip.customer.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="hidden lg:flex p-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600"
                              title="Zalo"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        {/* Notification Buttons - Hidden on mobile */}
                        {trip.customer && (
                          <div className="relative" ref={openNotifyMenu === trip.id ? notifyMenuRef : undefined}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenNotifyMenu(openNotifyMenu === trip.id ? null : trip.id);
                              }}
                              className="p-1.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-600"
                              title="Gửi thông báo"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>
                            {openNotifyMenu === trip.id && (
                              <div className="absolute right-0 mt-1 py-1 bg-white rounded-lg shadow-lg border border-slate-200 min-w-[160px] z-20">
                                <button
                                  onClick={(e) => { e.stopPropagation(); sendNotification(trip, "email"); setOpenNotifyMenu(null); }}
                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Bell className="w-3 h-3 text-amber-500" />
                                  Email (tới email cấu hình)
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); sendNotification(trip, "system"); setOpenNotifyMenu(null); }}
                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Bell className="w-3 h-3 text-purple-500" />
                                  Hệ thống
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingTrip(trip); }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
              <h2 className="text-lg font-semibold text-slate-800">Chọn Zom</h2>
              <button onClick={() => setShowDriverModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm Zom..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              {loadingDrivers ? (
                <div className="p-8 text-center text-slate-500">Đang tải...</div>
              ) : drivers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Chưa có Zom nào</div>
              ) : (
                drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => assignDriver(driver.id)}
                    className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold">
                      {(driver.fullName || "?")?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{driver.fullName || "(Chưa đặt tên)"}</div>
                    </div>
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
                    <label className="block text-xs text-slate-500 mb-1">Ngày đi</label>
                    <input
                      type="date"
                      value={editForm.departureDate}
                      onChange={(e) => setEditForm({ ...editForm, departureDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Giờ đi (HH:MM)</label>
                    <input
                      type="time"
                      lang="vi-VN"
                      step="300"
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
                <p className="text-sm font-medium text-amber-800 mb-3">Zom Bắn</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Zom Bắn</label>
                    <Combobox
                      options={drivers.map(driver => ({
                        value: driver.id,
                        label: driver.fullName || "(Chưa đặt tên)",
                      }))}
                      value={editForm.driverId}
                      onChange={(val) => setEditForm({ ...editForm, driverId: val as number | null })}
                      placeholder="-- Chọn Zom Bắn --"
                      searchPlaceholder="Tìm Zom..."
                      emptyText="Không có Zom"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-medium text-slate-700 mb-3">Trạng thái</p>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((s) => {
                    const c = statusColorClasses(s.color);
                    return (
                      <button
                        key={s.key}
                        onClick={() => setEditForm({ ...editForm, status: s.key })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${editForm.status === s.key ? "ring-2 ring-blue-500" : ""} ${c.bg} ${c.text}`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-medium text-slate-700">Ghi chú</p>
                  <button
                    type="button"
                    onClick={() => {
                      const seats = Math.max(1, editingTrip?.passengerCount ?? 1);
                      const isBao = !!editingTrip?.totalSeats && seats >= editingTrip.totalSeats;
                      const quick = generateAutoNoteLikeTripForm(
                        editForm.departureTime,
                        editForm.departure,
                        editForm.destination,
                        editForm.price,
                        editForm.customerPhone,
                        seats,
                        isBao ? "bao" : "ghep"
                      );
                      if (!quick) return;
                      // Ghi đè ghi chú cũ (không nối thêm)
                      setEditForm({ ...editForm, notes: quick });
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                    title="Tạo ghi chú nhanh"
                  >
                    <FileText className="w-4 h-4" />
                    Tạo ghi chú nhanh
                  </button>
                </div>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Nhập ghi chú..."
                  rows={3}
                />
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
