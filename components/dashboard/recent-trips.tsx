"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Clock, Users, ChevronDown, Copy, Check, X,
  Car, UserPlus, Phone
} from "lucide-react";

interface Trip {
  id: number;
  departure: string;
  destination: string;
  departureTime: string;
  status: string;
  driver?: {
    id: number;
    fullName: string;
    phone: string;
  };
  vehicle?: {
    id: number;
    name: string;
    licensePlate: string;
  };
  customer?: {
    name: string;
    phone: string;
  };
}

interface Driver {
  id: number;
  fullName: string;
  phone: string;
}

interface RecentTripsProps {
  initialTrips: Trip[];
  drivers: Driver[];
}

export function RecentTrips({ initialTrips, drivers }: RecentTripsProps) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [openDriverMenu, setOpenDriverMenu] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenDriverMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatRoute = (dep: string, dest: string) => {
    const shorten = (s: string) => {
      const map: Record<string, string> = {
        "Thành phố Hà Nội": "HN",
        "Hà Nội": "HN",
        "Hà Nội City": "HN",
        "Thành phố Vinh": "Vinh",
        "Vinh": "Vinh",
        "Thành phố Nam Định": "Nam Định",
        "Nam Định": "Nam Định",
        "Thành phố Thái Bình": "Thái Bình",
        "Thái Bình": "Thái Bình",
        "Thành phố Hải Phòng": "HP",
        "Hải Phòng": "HP",
      };
      return map[s] || s.slice(0, 6);
    };
    return `${shorten(dep)} → ${shorten(dest)}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "scheduled":
        return { label: "Chờ", color: "bg-red-100 text-red-700", dot: "bg-red-500" };
      case "in_progress":
        return { label: "Chạy", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" };
      case "completed":
        return { label: "Xong", color: "bg-green-100 text-green-700", dot: "bg-green-500" };
      case "cancelled":
        return { label: "Hủy", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
      default:
        return { label: status, color: "bg-slate-100 text-slate-700", dot: "bg-slate-500" };
    }
  };

  const getCustomerName = (customer?: { name: string }) => {
    if (!customer) return "Khách";
    return customer.name.length > 12 ? customer.name.slice(0, 12) + "..." : customer.name;
  };

  const handleStatusChange = async (tripId: number, newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTrips(trips.map(t => 
          t.id === tripId ? { ...t, status: newStatus } : t
        ));
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async (tripId: number, driverId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (res.ok) {
        const driver = drivers.find(d => d.id === driverId);
        setTrips(trips.map(t => 
          t.id === tripId ? { 
            ...t, 
            driver: driver,
            status: t.status === "scheduled" ? "scheduled" : t.status
          } : t
        ));
      }
    } catch (error) {
      console.error("Error assigning driver:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyZalo = (phone: string, trip: Trip) => {
    const msg = `Xin chào! Tôi muốn đặt chuyến ${formatRoute(trip.departure, trip.destination)} vào lúc ${formatTime(trip.departureTime)}. Cảm ơn!`;
    navigator.clipboard.writeText(msg);
    setCopiedId(trip.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const nextStatuses: Record<string, string> = {
    "scheduled": "in_progress",
    "in_progress": "completed",
  };

  return (
    <div className="bg-white rounded-[10px] border border-slate-100 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">Cuốc gần nhất</h3>
        <span className="text-xs text-slate-400">{trips.length} cuốc</span>
      </div>

      <div className="divide-y divide-slate-50" ref={menuRef}>
        {trips.map((trip) => {
          const statusConfig = getStatusConfig(trip.status);
          const canChangeStatus = trip.status === "scheduled" || trip.status === "in_progress";

          return (
            <div key={trip.id} className="p-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                {/* Time */}
                <div className="w-10 text-center flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{formatTime(trip.departureTime)}</p>
                </div>

                {/* Route & Customer */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {getCustomerName(trip.customer)}
                    </span>
                    {trip.customer?.phone && (
                      <a 
                        href={`tel:${trip.customer.phone}`}
                        className="p-0.5 rounded hover:bg-blue-100 flex-shrink-0"
                      >
                        <Phone className="w-3 h-3 text-blue-500" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{formatRoute(trip.departure, trip.destination)}</p>
                </div>

                {/* Status / Driver */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Quick Status Change */}
                  <button
                    onClick={() => canChangeStatus && handleStatusChange(trip.id, nextStatuses[trip.status] || trip.status)}
                    disabled={!canChangeStatus || loading}
                    className={`px-2 py-1 rounded-[6px] text-[10px] font-medium flex items-center gap-1 ${statusConfig.color} ${canChangeStatus ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-70'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                    {statusConfig.label}
                  </button>

                  {/* Driver / Assign */}
                  {trip.driver ? (
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-[10px] font-medium text-green-700">
                          {trip.driver.fullName.charAt(0)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setOpenDriverMenu(openDriverMenu === trip.id ? null : trip.id)}
                        className="p-1.5 rounded-[6px] bg-amber-50 hover:bg-amber-100"
                        disabled={loading}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                      </button>
                      
                      {openDriverMenu === trip.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-[8px] shadow-lg border border-slate-100 z-20 max-h-48 overflow-y-auto">
                          {drivers.map((driver) => (
                            <button
                              key={driver.id}
                              onClick={() => {
                                handleAssignDriver(trip.id, driver.id);
                                setOpenDriverMenu(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between"
                            >
                              <span className="truncate">{driver.fullName}</span>
                              <span className="text-slate-400 text-[10px]">{driver.phone.slice(-4)}</span>
                            </button>
                          ))}
                          {drivers.length === 0 && (
                            <div className="px-3 py-2 text-xs text-slate-400">Không có tài xế</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zalo Copy */}
                  {trip.customer?.phone && (
                    <button
                      onClick={() => handleCopyZalo(trip.customer!.phone, trip)}
                      className={`p-1.5 rounded-[6px] ${copiedId === trip.id ? 'bg-green-100' : 'bg-blue-50 hover:bg-blue-100'}`}
                    >
                      {copiedId === trip.id ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </button>
                  )}
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
  );
}
