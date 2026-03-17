"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, User, MapPin } from "lucide-react";

// Hàm tạo ghi chú tự động theo mẫu
function generateAutoNote(
  departureTime: string,
  departure: string,
  destination: string,
  price: string,
  phone: string,
  seats: number,
  tripType: string
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
  const note = `${timePart} ${departure} - ${destination} ${priceDisplay} ${phone}`;
  
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
  customer?: {
    name: string;
    phone: string;
  };
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
    totalSeats: "",
    tripType: "ghep",
    notes: "",
  });

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
          totalSeats: trip.totalSeats?.toString() || "1",
          tripType: "ghep",
          notes: trip.notes || "",
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
      if (formData.customerPhone.length >= 3) {
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

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setFormData({ ...formData, customerPhone: cleaned });
    
    if (formData.customerName && cleaned.length >= 3) {
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
    if (formData.customerPhone.length >= 3) {
      checkDuplicateCustomer(formData.customerPhone, value);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setFormData({
      ...formData,
      customerPhone: customer.phone,
      customerName: customer.name,
      customerEmail: customer.email || "",
    });
    setShowCustomerDropdown(false);
    setShowDuplicateWarning(false);
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
      let autoNotes = formData.notes;
      if (!autoNotes && formData.departureTime && formData.departure && formData.destination && formData.price) {
        autoNotes = generateAutoNote(
          actualDepartureTime,
          formData.departure,
          formData.destination,
          formData.price,
          formData.customerPhone || "",
          parseInt(formData.totalSeats) || 1,
          formData.tripType
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
            totalSeats: parseInt(formData.totalSeats) || 4,
            notes: autoNotes || undefined,
            customerPhone: formData.customerPhone || undefined,
            customerName: formData.customerName || undefined,
            customerEmail: formData.customerEmail || undefined,
            customerNotes: formData.customerNotes || undefined,
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
            vehicleId: null,
            totalSeats: parseInt(formData.totalSeats) || 4,
            tripType: formData.tripType,
            notes: autoNotes || undefined,
            customerPhone: formData.customerPhone || undefined,
            customerName: formData.customerName || undefined,
            customerEmail: formData.customerEmail || undefined,
            customerNotes: formData.customerNotes || undefined,
            seats: 1,
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tên khách hàng
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={formData.customerPhone.length >= 3 ? "Nhập tên khách" : "Nhập SĐT trước"}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              disabled={formData.customerPhone.length < 3 && !isEditMode}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Số ghế
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.totalSeats}
              onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
              placeholder="1"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
            />
          </div>
        </div>

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
        <h3 className="font-semibold text-slate-800">Lộ trình</h3>
        
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
        <h3 className="font-semibold text-slate-800">Loại hình & Thanh toán</h3>
        
        {!isEditMode && (
          <div className="flex gap-4">
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="tripType"
                value="ghep"
                checked={formData.tripType === "ghep"}
                onChange={(e) => setFormData({ ...formData, tripType: e.target.value })}
                className="peer sr-only"
              />
              <div className="px-4 py-3 rounded-lg border-2 border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-colors">
                <div className="font-medium text-slate-800">Đi ghép</div>
                <div className="text-sm text-slate-500">Ghép khách trên đường</div>
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="tripType"
                value="bao"
                checked={formData.tripType === "bao"}
                onChange={(e) => setFormData({ ...formData, tripType: e.target.value })}
                className="peer sr-only"
              />
              <div className="px-4 py-3 rounded-lg border-2 border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-colors">
                <div className="font-medium text-slate-800">Bao xe</div>
                <div className="text-sm text-slate-500">Thuê cả xe</div>
              </div>
            </label>
          </div>
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

                const note = generateAutoNote(
                  actualTime,
                  formData.departure,
                  formData.destination,
                  formData.price,
                  formData.customerPhone,
                  parseInt(formData.totalSeats) || 1,
                  formData.tripType
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

                  return generateAutoNote(
                    actualTime,
                    formData.departure,
                    formData.destination,
                    formData.price,
                    formData.customerPhone,
                    parseInt(formData.totalSeats) || 1,
                    formData.tripType
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {!isEditMode && (
          <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
            Lưu ý: Sau khi tạo chuyến, bạn có thể gán tài xế và xe trong trang Lịch trình
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
