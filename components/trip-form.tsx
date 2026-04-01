"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, User, MapPin, ArrowLeftRight } from "lucide-react";

// Hàm tạo ghi chú tự động theo mẫu
function generateAutoNote(
  departureTime: string,
  departure: string,
  destination: string,
  price: string,
  phone: string,
  seats: number,
  tripType: string,
  tripDirection?: string
): string {
  // Tính thời gian chênh lệch
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  
  const [hours, minutes] = departureTime.split(":").map(Number);
  
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

  // Thêm suffix cho 2 chiều
  const directionSuffix = tripDirection === "roundtrip" ? " 2C" : "";
  
  // Format giá tiền (vd: 90000 -> 90k, 150000 -> 150k)
  const priceNum = parseInt(price.replace(/\./g, "")) || 0;
  const priceDisplay = priceNum >= 1000 ? `${Math.round(priceNum / 1000)}k` : priceNum.toString();
  
  // Tạo phần thời gian
  let timePart = "";
  if (diffMinutes <= 60) {
    // Dưới hoặc bằng 60 phút: 0-Xp
    timePart = `0-${displayMinutes}p ${seatType}`;
  } else {
    // Trên 60 phút: Giờ đi loại (không có ngoặc)
    const departureHour = hours.toString().padStart(2, "0");
    const departureMinute = minutes.toString().padStart(2, "0");
    timePart = `${departureHour}h${departureMinute} ${seatType}`;
  }
  
  // Ghép các phần thành ghi chú
  const note = `${timePart}${directionSuffix} ${departure} - ${destination} ${priceDisplay} ${phone}`;
  
  return note;
}

// Hàm định dạng số với dấu chấm phân cách
function formatNumberWithDots(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Hàm chuyển số thành chữ tiếng Việt
function numberToVietnameseWords(num: number): string {
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const places = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  
  if (num === 0) return "không đồng";
  
  const numStr = Math.floor(num).toString();
  const length = numStr.length;
  
  let words = "";
  let placeIndex = 0;
  
  for (let i = length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    const part = parseInt(numStr.slice(start, i));
    
    if (part > 0) {
      let partWords = "";
      const hundreds = Math.floor(part / 100);
      const tens = Math.floor((part % 100) / 10);
      const ones = part % 10;
      
      if (hundreds > 0) {
        partWords += units[hundreds] + " trăm ";
      }
      
      if (tens > 0) {
        if (tens === 1) {
          partWords += "mười ";
        } else {
          partWords += units[tens] + " mươi ";
        }
      }
      
      if (ones > 0) {
        if (tens === 0 && hundreds > 0) {
          partWords += "lẻ " + units[ones] + " ";
        } else if (ones === 1 && tens > 0) {
          partWords += "mốt ";
        } else if (ones === 5 && tens > 0) {
          partWords += "lăm ";
        } else {
          partWords += units[ones] + " ";
        }
      }
      
      words = partWords.trim() + " " + places[placeIndex] + " " + words;
    }
    
    placeIndex++;
  }
  
  return words.trim() + " đồng";
}

interface Customer {
  id: number;
  phone: string;
  name: string;
  email?: string;
  totalTrips: number;
}

interface TripData {
  id: number;
  departure: string;
  destination: string;
  departureTime: string;
  price: number;
  totalSeats: number;
  status: string;
  notes?: string;
  tripDirection?: string;
  customer?: {
    name: string;
    phone: string;
  };
  customers?: Array<{
    seats: number;
  }>;
}

export default function TripForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [tripData, setTripData] = useState<TripData | null>(null);
  
  const [formData, setFormData] = useState({
    customerPhone: "",
    customerName: "",
    customerEmail: "",
    customerNotes: "",
    departure: "",
    destination: "",
    departureDate: new Date().toISOString().split("T")[0],
    departureTime: new Date().toTimeString().slice(0, 5),
    price: "",
    totalSeats: "1",
    // 4 loại hình: ghep | ghep_roundtrip | bao | bao_roundtrip
    tripType: "ghep",
    notes: "",
    driverId: null as number | null,
  });

  // Helper: trích direction từ tripType
  const getDirection = (t: string) =>
    t === "ghep_roundtrip" || t === "bao_roundtrip" ? "roundtrip" : "oneway";

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editId) {
      setIsEditMode(true);
      fetchTripData(editId);
    }
  }, [editId]);

  const fetchTripData = async (id: string) => {
    try {
      const res = await fetch(`/api/trips/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        const trip = data.data;
        const departureDate = new Date(trip.departureTime);
        setTripData(trip);
        const passengerCount = (trip as any).customers
          ? (trip as any).customers.reduce((sum: number, c: any) => sum + (c.seats || 0), 0)
          : 0;
        const tripDirection = (trip as any).tripDirection === "roundtrip" ? "roundtrip" : "oneway";
        const rawTripType = (trip as any).tripType === "bao" || (trip as any).tripType === "ghep"
          ? (trip as any).tripType
          : (passengerCount >= (trip.totalSeats || 1) && passengerCount > 0 ? "bao" : "ghep");
        const computedTripType = tripDirection === "roundtrip"
          ? (rawTripType === "bao" ? "bao_roundtrip" : "ghep_roundtrip")
          : rawTripType;
        setFormData({
          customerPhone: trip.customer?.phone || "",
          customerName: trip.customer?.name || "",
          customerEmail: "",
          customerNotes: trip.notes || "",
          departure: trip.departure,
          destination: trip.destination,
          departureDate: departureDate.toISOString().split("T")[0],
          departureTime: departureDate.toTimeString().slice(0, 5),
          price: trip.price ? trip.price.toString() : "",
          totalSeats: trip.totalSeats ? trip.totalSeats.toString() : "1",
          tripType: computedTripType,
          notes: trip.notes || "",
          driverId: (trip as any).driver?.id || null,
        });
      }
    } catch (error) {
      console.error("Fetch trip error:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchCustomer = async () => {
      if (formData.customerPhone.length >= 2) {
        try {
          const res = await fetch(`/api/customers?search=${formData.customerPhone}`);
          const data = await res.json();
          setCustomerSuggestions(data.data || []);
          setShowCustomerDropdown(data.data && data.data.length > 0);
        } catch (error) {
          console.error("Search customer error:", error);
        }
      } else {
        setCustomerSuggestions([]);
        setShowCustomerDropdown(false);
      }
    };

    const debounce = setTimeout(searchCustomer, 300);
    return () => clearTimeout(debounce);
  }, [formData.customerPhone]);

  // ============================================================
  // Keyboard / virtual keyboard handling on mobile
  // On touch devices, when an input/textarea/select inside the form
  // gets focus the virtual keyboard slides up and shrinks the viewport.
  // We:
  //   1. Add class to body so CSS can increase padding-bottom of .page-scroll
  //   2. Scroll the focused element into view (centered) after a short delay
  //      so the input sits above the keyboard.
  // ============================================================
  useEffect(() => {
    const form = document.querySelector("form");
    if (!form) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        document.body.classList.add("form-keyboard-open");
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
      }
    };

    const handleBlur = () => {
      document.body.classList.remove("form-keyboard-open");
    };

    form.addEventListener("focusin", handleFocus);
    form.addEventListener("focusout", handleBlur);
    return () => {
      form.removeEventListener("focusin", handleFocus);
      form.removeEventListener("focusout", handleBlur);
    };
  }, []);

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setFormData({ ...formData, customerPhone: cleaned });
    
    if (formData.customerName && cleaned.length >= 2) {
      checkDuplicateCustomer(cleaned, formData.customerName);
    }
  };

  const checkDuplicateCustomer = async (phone: string, name: string) => {
    try {
      const res = await fetch(`/api/customers?search=${phone}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const existingCustomer = data.data[0];
        if (existingCustomer.name !== name) {
          setShowDuplicateWarning(true);
        } else {
          setShowDuplicateWarning(false);
        }
      } else {
        setShowDuplicateWarning(false);
      }
    } catch (error) {
      console.error("Check duplicate error:", error);
    }
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, customerName: value });
    if (formData.customerPhone.length >= 2) {
      checkDuplicateCustomer(formData.customerPhone, value);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setFormData({
      ...formData,
      customerPhone: customer.phone,
      customerName: customer.name,
      customerEmail: customer.email || "",
    });
    setShowCustomerDropdown(false);
    setShowDuplicateWarning(false);

    // Fetch most recent trip for this customer
    await fetchRecentTripForCustomer(customer.phone);
  };

  const fetchRecentTripForCustomer = async (phone: string) => {
    try {
      const res = await fetch(`/api/trips?customerPhone=${phone}&limit=1`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const recentTrip = data.data[0];

        // Xác định tripType từ recentTrip
        const tripType = recentTrip.tripType || "ghep";
        const tripDirection = recentTrip.tripDirection || "oneway";
        const combinedTripType = tripDirection === "roundtrip"
          ? (tripType === "bao" ? "bao_roundtrip" : "ghep_roundtrip")
          : tripType;

        // Auto-fill departure, destination, price, trip type, and seats from most recent trip
        setFormData(prev => ({
          ...prev,
          departure: recentTrip.departure || prev.departure,
          destination: recentTrip.destination || prev.destination,
          price: recentTrip.price ? recentTrip.price.toString() : prev.price,
          tripType: combinedTripType,
          totalSeats: recentTrip.totalSeats ? recentTrip.totalSeats.toString() : prev.totalSeats,
        }));
      }
    } catch (error) {
      console.error("Fetch recent trip error:", error);
    }
  };

  // Hàm kiểm tra và chuyển giờ đi thành "0-1p" nếu giờ đã qua
  const getDepartureTimeForSubmit = (departureTime: string, departureDate: string): string => {
    if (!departureTime || !departureDate) return `${departureDate}T${departureTime}:00`;

    const now = new Date();
    const [hours, minutes] = departureTime.split(":").map(Number);
    const [year, month, day] = departureDate.split("-").map(Number);

    const tripDate = new Date(year, month - 1, day, hours, minutes);
    const nowWithBuffer = new Date(now.getTime() + 60 * 1000); // Thêm 1 phút buffer

    // Nếu giờ đi đã qua (so với giờ hiện tại + 1p buffer), chuyển thành đi ngay
    if (tripDate < nowWithBuffer) {
      return now.toISOString();
    }

    return `${departureDate}T${departureTime}:00`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Xác định giờ đi thực tế (nếu đã qua thì là giờ hiện tại)
      const now = new Date();
      const [hours, minutes] = formData.departureTime.split(":").map(Number);
      const [year, month, day] = formData.departureDate.split("-").map(Number);
      const tripDate = new Date(year, month - 1, day, hours, minutes);
      const nowWithBuffer = new Date(now.getTime() + 60 * 1000);

      // Giờ để tạo autoNote - nếu đã qua thì dùng giờ hiện tại
      const actualDepartureTime = tripDate < nowWithBuffer
        ? now.toTimeString().slice(0, 5)
        : formData.departureTime;

      // Tự động tạo ghi chú nếu chưa có và đủ thông tin
      const direction = getDirection(formData.tripType);
      let autoNotes = formData.notes;
      if (!autoNotes && formData.departureTime && formData.departure && formData.destination && formData.price) {
        autoNotes = generateAutoNote(
          actualDepartureTime,
          formData.departure,
          formData.destination,
          formData.price,
          formData.customerPhone || "",
          parseInt(formData.totalSeats) || 1,
          direction === "roundtrip" ? "ghep" : formData.tripType.replace("_roundtrip", ""),
          direction
        );
      }

      if (isEditMode && editId) {
        const res = await fetch(`/api/trips/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${formData.departure} - ${formData.destination}`,
            departure: formData.departure,
            destination: formData.destination,
            departureTime: getDepartureTimeForSubmit(formData.departureTime, formData.departureDate),
            price: parseInt(formData.price.replace(/\./g, "")) || 0,
            totalSeats: formData.tripType.startsWith("bao") ? 0 : (parseInt(formData.totalSeats) || 1),
            tripType: formData.tripType.replace("_roundtrip", ""),
            tripDirection: direction,
            notes: autoNotes || undefined,
            customerPhone: formData.customerPhone || undefined,
            customerName: formData.customerName || undefined,
            customerEmail: formData.customerEmail || undefined,
            customerNotes: formData.customerNotes || undefined,
            ...(formData.driverId ? { driverId: formData.driverId } : {}),
            recalculate: true,
          }),
        });

        const data = await res.json();
        if (data.success) {
          router.push("/dashboard/schedule");
        } else {
          alert(data.error || "Có lỗi xảy ra");
        }
      } else {
        const res = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${formData.departure} - ${formData.destination}`,
            departure: formData.departure,
            destination: formData.destination,
            departureTime: getDepartureTimeForSubmit(formData.departureTime, formData.departureDate),
            price: parseInt(formData.price.replace(/\./g, "")) || 0,
            totalSeats: formData.tripType.startsWith("bao") ? 0 : (parseInt(formData.totalSeats) || 1),
            tripType: formData.tripType.replace("_roundtrip", ""),
            tripDirection: direction,
            notes: autoNotes || undefined,
            customerPhone: formData.customerPhone || undefined,
            customerName: formData.customerName || undefined,
            customerEmail: formData.customerEmail || undefined,
            customerNotes: formData.customerNotes || undefined,
            seats: 1,
            ...(formData.driverId ? { driverId: formData.driverId } : {}),
          }),
        });

        const data = await res.json();
        if (data.success) {
          router.push("/dashboard/schedule");
        } else {
          alert(data.error || "Có lỗi xảy ra");
        }
      }
    } catch (error) {
      console.error("Submit trip error:", error);
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      {isEditMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium text-amber-800">Chế độ chỉnh sửa - Cuốc #{editId}</span>
          </div>
        </div>
      )}

      {/* Customer Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <h3 className="font-semibold text-slate-800">Thông tin khách hàng</h3>

        {(isEditMode && (tripData?.status === "completed" || tripData?.status === "cancelled")) ? (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-amber-800 leading-relaxed">
              Cuốc xe đã <strong>{tripData?.status === "completed" ? "hoàn thành" : "bị hủy"}</strong>. Không thể sửa thông tin khách hàng.<br />
              Để chỉnh sửa, hãy đổi trạng thái về <strong>Chờ gán</strong> hoặc <strong>Đã gán</strong> từ danh sách chuyến xe.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative" ref={customerDropdownRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                ref={phoneInputRef}
                placeholder="Nhập số điện thoại"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                required
              />

              {showCustomerDropdown && customerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customerSuggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-slate-800">{customer.name}</div>
                        <div className="text-sm text-slate-500">{customer.phone}</div>
                      </div>
                      <div className="text-sm text-blue-600">
                        {customer.totalTrips} chuyến
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tên khách hàng
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={formData.customerPhone.length >= 2 ? "Nhập tên khách" : "Nhập SĐT trước"}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                disabled={formData.customerPhone.length < 3 && !isEditMode}
              />
            </div>
          </div>
        )}

        {showDuplicateWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-amber-800">
              Khách hàng này đã có trong hệ thống, bạn có muốn cập nhật thông tin không?
            </div>
          </div>
        )}
      </div>

      {/* Route Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Lộ trình</h3>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                departure: formData.destination,
                destination: formData.departure,
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            title="Đảo chiều điểm đón và điểm đến"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Đảo chiều
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Điểm đón <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.departure}
              onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
              placeholder="Hà Nội"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Điểm đến <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="Hải Phòng"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ngày đi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.departureDate}
              onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Giờ đi <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              lang="vi-VN"
              step="300"
              value={formData.departureTime}
              onChange={(e) => {
                setFormData({ ...formData, departureTime: e.target.value });
              }}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              required
            />
          </div>
        </div>
      </div>

      {/* Trip Type & Price */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <h3 className="font-semibold text-slate-800">Loại hình</h3>

        {!isEditMode && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {/* Ghép 1 chiều */}
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  value="ghep"
                  checked={formData.tripType === "ghep"}
                  onChange={() => setFormData({ ...formData, tripType: "ghep" })}
                  className="peer sr-only"
                />
                <div className="px-3 py-2.5 rounded-lg border-2 text-center text-sm font-medium transition-colors
                  peer-checked:border-blue-500 peer-checked:bg-blue-50
                  border-slate-200 text-slate-600 bg-white hover:bg-slate-50">
                  Ghép
                </div>
              </label>
              {/* Ghép 2 chiều */}
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  value="ghep_roundtrip"
                  checked={formData.tripType === "ghep_roundtrip"}
                  onChange={() => setFormData({ ...formData, tripType: "ghep_roundtrip" })}
                  className="peer sr-only"
                />
                <div className="px-3 py-2.5 rounded-lg border-2 text-center text-sm font-medium transition-colors
                  peer-checked:border-blue-500 peer-checked:bg-blue-50
                  border-slate-200 text-slate-600 bg-white hover:bg-slate-50">
                  Ghép 2C
                </div>
              </label>
              {/* Bao 1 chiều */}
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  value="bao"
                  checked={formData.tripType === "bao"}
                  onChange={() => setFormData({ ...formData, tripType: "bao" })}
                  className="peer sr-only"
                />
                <div className="px-3 py-2.5 rounded-lg border-2 text-center text-sm font-medium transition-colors
                  peer-checked:border-amber-500 peer-checked:bg-amber-50
                  border-slate-200 text-slate-600 bg-white hover:bg-slate-50">
                  Bao
                </div>
              </label>
              {/* Bao 2 chiều */}
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  value="bao_roundtrip"
                  checked={formData.tripType === "bao_roundtrip"}
                  onChange={() => setFormData({ ...formData, tripType: "bao_roundtrip" })}
                  className="peer sr-only"
                />
                <div className="px-3 py-2.5 rounded-lg border-2 text-center text-sm font-medium transition-colors
                  peer-checked:border-amber-500 peer-checked:bg-amber-50
                  border-slate-200 text-slate-600 bg-white hover:bg-slate-50">
                  Bao 2C
                </div>
              </label>
            </div>

            {/* Số ghế — hiện khi ghép, ẩn khi bao */}
            {formData.tripType === "ghep" || formData.tripType === "ghep_roundtrip" ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 shrink-0">Số ghế</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.totalSeats}
                  onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseInt(formData.totalSeats) || 1;
                    if (cur > 1) setFormData({ ...formData, totalSeats: String(cur - 1) });
                  }}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-base font-bold"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseInt(formData.totalSeats) || 0;
                    setFormData({ ...formData, totalSeats: String(cur + 1) });
                  }}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-base font-bold"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Bao xe — không cần chọn số ghế
              </div>
            )}
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Giá tiền (VNĐ) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={formData.price ? formatNumberWithDots(parseInt(formData.price.replace(/\./g, "")) || 0) : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, price: value });
              }}
              placeholder="150.000"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base pr-16"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">VNĐ</span>
          </div>
          {formData.price && parseInt(formData.price.replace(/\./g, "")) > 0 && (
            <div className="mt-2 text-sm text-blue-600 font-medium bg-blue-50 px-3 py-2 rounded-lg">
              ({numberToVietnameseWords(parseInt(formData.price.replace(/\./g, "")))})
            </div>
          )}

        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">
              Ghi chú
            </label>
            <button
              type="button"
              onClick={() => {
                // Xác định giờ đi thực tế cho autoNote
                const now = new Date();
                const [hours, minutes] = formData.departureTime.split(":").map(Number);
                const [year, month, day] = formData.departureDate.split("-").map(Number);
                const tripDate = new Date(year, month - 1, day, hours, minutes);
                const nowWithBuffer = new Date(now.getTime() + 60 * 1000);

                const actualTime = tripDate < nowWithBuffer
                  ? now.toTimeString().slice(0, 5)
                  : formData.departureTime;
                const direction = getDirection(formData.tripType);
                const rawType = formData.tripType.replace("_roundtrip", "") as "ghep" | "bao";

                const note = generateAutoNote(
                  actualTime,
                  formData.departure,
                  formData.destination,
                  formData.price,
                  formData.customerPhone,
                  parseInt(formData.totalSeats) || 1,
                  rawType,
                  direction
                );
                setFormData({ ...formData, notes: note });
              }}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-md font-medium transition-colors"
            >
              ✨ Tạo ghi chú tự động
            </button>
          </div>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Nhập ghi chú cho chuyến xe..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base resize-none"
          />
          {formData.departureTime && formData.departure && formData.destination && formData.price && (
            <div className="mt-2 p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Xem trước:</div>
              <div className="text-sm font-mono text-slate-700">
                {(() => {
                  // Tính giờ đi thực tế cho preview
                  const now = new Date();
                  const [hours, minutes] = formData.departureTime.split(":").map(Number);
                  const [year, month, day] = formData.departureDate.split("-").map(Number);
                  const tripDate = new Date(year, month - 1, day, hours, minutes);
                  const nowWithBuffer = new Date(now.getTime() + 60 * 1000);

                  const actualTime = tripDate < nowWithBuffer
                    ? now.toTimeString().slice(0, 5)
                    : formData.departureTime;
                  const direction = getDirection(formData.tripType);
                  const rawType = formData.tripType.replace("_roundtrip", "") as "ghep" | "bao";

                  return generateAutoNote(
                    actualTime,
                    formData.departure,
                    formData.destination,
                    formData.price,
                    formData.customerPhone,
                    parseInt(formData.totalSeats) || 1,
                    rawType,
                    direction
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {!isEditMode && (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
            Lưu ý: Sau khi tạo chuyến, bạn có thể gán Zom trong trang Lịch trình
          </p>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pb-24 lg:pb-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isEditMode ? "Đang lưu..." : "Đang tạo..."}
            </span>
          ) : (
            isEditMode ? "Lưu thay đổi" : "Lưu cuốc xe"
          )}
        </button>
      </div>
    </form>
  );
}
