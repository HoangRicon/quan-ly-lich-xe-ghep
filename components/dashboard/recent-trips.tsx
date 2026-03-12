"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Clock, Phone, Car, User, MapPin, DollarSign, FileText,
  ChevronUp, X, Bell, Edit, RefreshCw, Check, Copy
} from "lucide-react";

interface Trip {
  id: number;
  departure: string;
  destination: string;
  departureTime: string;
  status: string;
  price?: number;
  notes?: string;
  driver?: {
    id: number;
    fullName: string | null;
    phone: string | null;
  } | null;
  vehicle?: {
    id: number;
    name: string;
    licensePlate: string;
    vehicleType: string;
  } | null;
  customer?: {
    id?: number;
    name: string | null;
    phone: string | null;
  } | null;
}

interface Driver {
  id: number;
  fullName: string | null;
  phone: string | null;
}

interface RecentTripsProps {
  initialTrips: Trip[];
  drivers: Driver[];
  vehicles?: Vehicle[];
}

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  vehicleType: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; next: string[] }> = {
  scheduled: { label: "Chờ", color: "text-red-600", bg: "bg-red-50 border-red-200", next: ["confirmed", "running"] },
  confirmed: { label: "Đã gán", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", next: ["running", "completed", "cancelled"] },
  running: { label: "Đang đi", color: "text-green-600", bg: "bg-green-50 border-green-200", next: ["completed", "cancelled"] },
  completed: { label: "Hoàn thành", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", next: [] },
  cancelled: { label: "Hủy", color: "text-slate-500", bg: "bg-slate-50 border-slate-200", next: [] },
};

const vehicleTypeLabels: Record<string, string> = {
  car: "Xe 4 chỗ",
  "7seats": "Xe 7 chỗ",
  "16seats": "Xe 16 chỗ",
};

export function RecentTrips({ initialTrips, drivers, vehicles = [] }: RecentTripsProps) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState<number | null>(null);
  const [showDriverMenu, setShowDriverMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remindedDriver, setRemindedDriver] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    departure: "",
    destination: "",
    departureTime: "",
    price: "",
    driverId: null as number | null,
  });
  const [showVehicleMenu, setShowVehicleMenu] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        if (isSheetOpen) {
          setIsSheetOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSheetOpen]);

  useEffect(() => {
    if (isSheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isSheetOpen]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const formatRoute = (dep: string, dest: string) => {
    const shorten = (s: string) => {
      const map: Record<string, string> = {
        "Thành phố Hà Nội": "HN", "Hà Nội": "HN", "Hà Nội City": "HN",
        "Thành phố Vinh": "Vinh", "Vinh": "Vinh",
        "Thành phố Nam Định": "Nam Định", "Nam Định": "Nam Định",
        "Thành phố Thái Bình": "Thái Bình", "Thái Bình": "Thái Bình",
        "Thành phố Hải Phòng": "HP", "Hải Phòng": "HP",
      };
      return map[s] || s.slice(0, 8);
    };
    return `${shorten(dep)} → ${shorten(dest)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} đã được sao chép!`);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const copyTripInfo = (trip: Trip) => {
    const info = `Điểm đón: ${trip.departure}, Điểm đến: ${trip.destination}${trip.customer?.phone ? ', ĐT: ' + trip.customer.phone : ''}`;
    copyToClipboard(info, "Thông tin chuyến xe");
  };

  const openSheet = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsSheetOpen(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTrip) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTrips(trips.map(t => t.id === selectedTrip.id ? { ...t, status: newStatus } : t));
        setSelectedTrip({ ...selectedTrip, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
      setShowStatusMenu(null);
    }
  };

  const handleQuickStatusChange = async (tripId: number, newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTrips(trips.map(t => t.id === tripId ? { ...t, status: newStatus } : t));
        setShowStatusMenu(null);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async (driverId: number) => {
    if (!selectedTrip) return;
    setLoading(true);
    try {
      const driver = drivers.find(d => d.id === driverId);
      const res = await fetch(`/api/trips/${selectedTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (res.ok) {
        const updatedTrip = { ...selectedTrip, driver };
        setTrips(trips.map(t => t.id === selectedTrip.id ? updatedTrip : t));
        setSelectedTrip(updatedTrip);
      }
    } catch (error) {
      console.error("Error assigning driver:", error);
    } finally {
      setLoading(false);
      setShowDriverMenu(false);
    }
  };

  const handleRemindDriver = async (trip: Trip, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!trip.driver) return;
    
    const driverName = trip.driver.fullName;
    const customerName = trip.customer?.name || "Khách";
    const time = formatTime(trip.departureTime);
    const route = formatRoute(trip.departure, trip.destination);
    
    const driverPhone = trip.driver?.phone || "";
    const message = `Nhắc nhở: Tài xế ${driverName}, bạn có lịch đón khách ${customerName} lúc ${time}. Vui lòng xác nhận!`;
    
    const zaloUrl = driverPhone ? `zalo://compose?text=${encodeURIComponent(message)}&phone_to=${encodeURIComponent(driverPhone)}` : "";
    const webZaloUrl = driverPhone ? `https://zalo.me/${driverPhone}?text=${encodeURIComponent(message)}` : "";
    
    setRemindedDriver(trip.id);
    setTimeout(() => setRemindedDriver(null), 3000);
    
    window.location.href = zaloUrl;
    setTimeout(() => {
      window.open(webZaloUrl, "_blank");
    }, 500);
  };

  const handleRemindDriverInSheet = async () => {
    if (!selectedTrip?.driver) return;
    
    const driverName = selectedTrip.driver.fullName;
    const customerName = selectedTrip.customer?.name || "Khách";
    const time = formatTime(selectedTrip.departureTime);
    const route = formatRoute(selectedTrip.departure, selectedTrip.destination);
    
    const driverPhone = selectedTrip.driver?.phone || "";
    const message = `Nhắc nhở: Tài xế ${driverName}, bạn có lịch đón khách ${customerName} lúc ${time}. Vui lòng xác nhận!`;
    
    const zaloUrl = driverPhone ? `zalo://compose?text=${encodeURIComponent(message)}&phone_to=${encodeURIComponent(driverPhone)}` : "";
    const webZaloUrl = driverPhone ? `https://zalo.me/${driverPhone}?text=${encodeURIComponent(message)}` : "";
    
    setRemindedDriver(selectedTrip.id);
    setTimeout(() => setRemindedDriver(null), 3000);
    
    window.location.href = zaloUrl;
    setTimeout(() => {
      window.open(webZaloUrl, "_blank");
    }, 500);
  };

  const handleCallCustomer = () => {
    if (selectedTrip?.customer?.phone) {
      window.location.href = `tel:${selectedTrip.customer.phone}`;
    }
  };

  const handleEditClick = () => {
    if (!selectedTrip) return;
    const deptDate = new Date(selectedTrip.departureTime);
    setEditForm({
      customerName: selectedTrip.customer?.name || "",
      customerPhone: selectedTrip.customer?.phone || "",
      departure: selectedTrip.departure,
      destination: selectedTrip.destination,
      departureTime: deptDate.toTimeString().slice(0, 5),
      price: selectedTrip.price?.toString() || "",
      driverId: selectedTrip.driver?.id || null,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTrip) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}`, {
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
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const updatedTrip = {
            ...selectedTrip,
            departure: editForm.departure,
            destination: editForm.destination,
            departureTime: `${editForm.departureTime}:00`,
            price: parseFloat(editForm.price) || 0,
            driver: editForm.driverId ? drivers.find(d => d.id === editForm.driverId) : null,
            customer: {
              ...selectedTrip.customer,
              name: editForm.customerName,
              phone: editForm.customerPhone,
            } as Trip["customer"],
          };
          setTrips(trips.map(t => t.id === selectedTrip.id ? updatedTrip : t));
          setSelectedTrip(updatedTrip);
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error("Error saving edit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      customerName: "",
      customerPhone: "",
      departure: "",
      destination: "",
      departureTime: "",
      price: "",
      driverId: null,
    });
  };

  const handleAssignVehicle = async (vehicleId: number) => {
    if (!selectedTrip) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const updatedTrip = { ...selectedTrip, vehicle: data.data.vehicle };
          setTrips(trips.map(t => t.id === selectedTrip.id ? updatedTrip : t));
          setSelectedTrip(updatedTrip);
        }
      }
    } catch (error) {
      console.error("Error assigning vehicle:", error);
    } finally {
      setLoading(false);
      setShowVehicleMenu(false);
    }
  };

  const nextStatuses = statusConfig[selectedTrip?.status || ""]?.next || [];

  return (
    <>
      <div className="bg-white rounded-[10px] border border-slate-100 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Danh sách cuốc</h3>
          <span className="text-xs text-slate-400">{trips.length} cuốc</span>
        </div>

        <div className="divide-y divide-slate-50">
          {trips.map((trip) => {
            const status = statusConfig[trip.status] || statusConfig.scheduled;
            return (
              <div
                key={trip.id}
                onClick={() => openSheet(trip)}
                className="p-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-base font-bold text-slate-800">{formatTime(trip.departureTime)}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(trip.departureTime)}</p>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Route - Equal font for pickup and dropoff */}
                    <div className="text-sm font-medium text-slate-800">
                      <span className="font-semibold">Điểm đón:</span> {trip.departure}
                    </div>
                    <div className="text-sm font-medium text-slate-800">
                      <span className="font-semibold">Điểm đến:</span> {trip.destination}
                    </div>
                    
                    {/* Phone with copy */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <Phone className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600 font-medium">{trip.customer?.phone || "Không có SDT"}</span>
                      {trip.customer?.phone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(trip.customer?.phone || "", "Số điện thoại"); }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400"
                          title="Copy SDT"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status + Quick Actions */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTrip(trip); setShowStatusMenu(showStatusMenu === trip.id ? null : trip.id); }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer hover:opacity-80 ${status.bg} ${status.color}`}
                      >
                        {status.label}
                      </button>
                      {showStatusMenu === trip.id && status.next.length > 0 && (
                        <div className="absolute right-0 mt-1 py-1 bg-white rounded-lg shadow-lg border border-slate-200 z-20 min-w-[100px]">
                          {status.next.map(nextStatus => (
                            <button
                              key={nextStatus}
                              onClick={(e) => { e.stopPropagation(); handleQuickStatusChange(trip.id, nextStatus); }}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50"
                            >
                              {statusConfig[nextStatus]?.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* Copy Trip Info */}
                      <button
                        onClick={(e) => { e.stopPropagation(); copyTripInfo(trip); }}
                        className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500"
                        title="Copy thông tin"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Remind Driver */}
                      {trip.driver && (
                        <button
                          onClick={(e) => handleRemindDriver(trip, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            remindedDriver === trip.id
                              ? "bg-green-100"
                              : "bg-purple-50 hover:bg-purple-100"
                          }`}
                          title="Nhắc tài xế"
                        >
                          {remindedDriver === trip.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-purple-600" />
                          )}
                        </button>
                      )}
                      
                      <ChevronUp className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {trips.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">
              Chưa có cuốc nào
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet - z-[60] để nổi trên bottom nav (z-50), nút Lưu/Hủy không bị che */}
      {isSheetOpen && selectedTrip && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsSheetOpen(false)} />
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
                  <p className="text-xs text-slate-400">Mã cuốc #{selectedTrip.id}</p>
                  <h2 className="text-lg font-bold text-slate-800">{formatRoute(selectedTrip.departure, selectedTrip.destination)}</h2>
                </div>
                <button onClick={() => setIsSheetOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{formatTime(selectedTrip.departureTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {selectedTrip.vehicle ? vehicleTypeLabels[selectedTrip.vehicle.vehicleType] || selectedTrip.vehicle.vehicleType : "Chưa gán xe"}
                  </span>
                </div>
              </div>
            </div>

            {/* Details or Edit Form */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1" style={{ maxHeight: isEditing ? 'calc(90vh - 200px)' : '35vh' }}>
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-blue-800 mb-3">Chỉnh sửa thông tin</p>
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
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tài xế</label>
                        <select
                          value={editForm.driverId || ""}
                          onChange={(e) => setEditForm({ ...editForm, driverId: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        >
                          <option value="">-- Chọn tài xế --</option>
                          {drivers.map(driver => (
                            <option key={driver.id} value={driver.id}>{driver.fullName} - {driver.phone}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode - Details */
                <>
                  {/* Customer Info */}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Khách hàng</p>
                        <p className="font-medium text-slate-800">{selectedTrip.customer?.name || "Khách"}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-sm text-slate-500">{selectedTrip.customer?.phone || "Chưa có SĐT"}</p>
                          {selectedTrip.customer?.phone && (
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedTrip.customer?.phone || "", "Số điện thoại"); }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600"
                              title="Copy SDT"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route - Equal font display */}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-400">Điểm đón:</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedTrip.departure, "Điểm đón"); }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600"
                            title="Copy điểm đón"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-semibold text-slate-800">{selectedTrip.departure}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mt-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-400">Điểm đến:</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedTrip.destination, "Điểm đến"); }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600"
                            title="Copy điểm đến"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-semibold text-slate-800">{selectedTrip.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  {selectedTrip.price ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-green-600">Giá tiền</p>
                        <p className="font-bold text-green-700">{formatCurrency(selectedTrip.price)}</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Driver */}
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-amber-600">Tài xế</p>
                      {selectedTrip.driver ? (
                        <>
                          <p className="font-medium text-slate-800">{selectedTrip.driver.fullName}</p>
                          <p className="text-sm text-slate-500">{selectedTrip.driver.phone}</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">Chưa gán tài xế</p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedTrip.notes && (
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <FileText className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Ghi chú</p>
                        <p className="text-sm text-slate-600">{selectedTrip.notes}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0 min-h-[60px]">
              {isEditing ? (
                /* Edit Mode Actions */
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                  >
                    <X className="w-5 h-5" />
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                    {loading ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              ) : (
                /* View Mode Actions */
                <div className="grid grid-cols-2 gap-3">
                  {/* Gọi khách */}
                  <button
                    onClick={handleCallCustomer}
                    disabled={!selectedTrip.customer?.phone}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-medium transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    Gọi khách
                  </button>

                  {/* Sửa thông tin */}
                  <button
                    onClick={handleEditClick}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                    Sửa
                  </button>

                  {/* Đổi trạng thái */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu(showStatusMenu ? null : selectedTrip?.id || null)}
                      disabled={nextStatuses.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-amber-100 hover:bg-amber-200 disabled:bg-slate-100 disabled:text-slate-400 text-amber-700 rounded-xl font-medium transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Đổi trạng thái
                    </button>
                    {showStatusMenu && nextStatuses.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                        {nextStatuses.map(status => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            disabled={loading}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <span className={`w-2 h-2 rounded-full ${statusConfig[status]?.color.replace('text-', 'bg-')}`}></span>
                            {statusConfig[status]?.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nhắc tài xế */}
                  <button
                    onClick={handleRemindDriverInSheet}
                    disabled={!selectedTrip.driver}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                      remindedDriver === selectedTrip.id
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 hover:bg-purple-200 disabled:bg-slate-100 disabled:text-slate-400 text-purple-700"
                    }`}
                  >
                    {remindedDriver === selectedTrip.id ? (
                      <>
                        <Check className="w-5 h-5" />
                        Đã nhắc
                      </>
                    ) : (
                      <>
                        <Bell className="w-5 h-5" />
                        Nhắc tài xế
                      </>
                    )}
                  </button>

                  {/* Gán xe */}
                  <div className="relative">
                    <button
                      onClick={() => setShowVehicleMenu(!showVehicleMenu)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-xl font-medium transition-colors"
                    >
                      <Car className="w-5 h-5" />
                      Gán xe
                    </button>
                    {showVehicleMenu && vehicles.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden max-h-48 overflow-y-auto">
                        {vehicles.map(vehicle => (
                          <button
                            key={vehicle.id}
                            onClick={() => handleAssignVehicle(vehicle.id)}
                            disabled={loading}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Car className="w-4 h-4 text-cyan-600" />
                            <span>{vehicle.name}</span>
                            <span className="text-slate-400 text-xs">({vehicle.licensePlate})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Driver Assignment (if not assigned) */}
              {!selectedTrip.driver && !isEditing && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">Gán tài xế nhanh:</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {drivers.map(driver => (
                      <button
                        key={driver.id}
                        onClick={() => handleAssignDriver(driver.id)}
                        disabled={loading}
                        className="flex-shrink-0 px-3 py-2 bg-slate-100 hover:bg-amber-100 rounded-lg text-sm text-slate-700 hover:text-amber-700 transition-colors"
                      >
                        {driver.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
    </>
  );
}
