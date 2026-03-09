"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Customer {
  id: number;
  phone: string;
  name: string;
  email?: string;
  totalTrips: number;
}

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  capacity: number;
}

export default function TripForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [formData, setFormData] = useState({
    customerPhone: "",
    customerName: "",
    customerEmail: "",
    customerNotes: "",
    departure: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    price: "",
    vehicleId: "",
    totalSeats: "",
    tripType: "ghep",
  });

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
          const res = await fetch(`/api/customers?phone=${formData.customerPhone}`);
          const data = await res.json();
          setCustomerSuggestions(data.customers || []);
          setShowCustomerDropdown(data.customers && data.customers.length > 0);
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

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (data.data) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error("Fetch vehicles error:", error);
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setFormData({ ...formData, customerPhone: cleaned });
    
    if (formData.customerName && cleaned.length >= 3) {
      checkDuplicateCustomer(cleaned, formData.customerName);
    }
  };

  const checkDuplicateCustomer = async (phone: string, name: string) => {
    try {
      const res = await fetch(`/api/customers?phone=${phone}`);
      const data = await res.json();
      if (data.customers && data.customers.length > 0) {
        const existingCustomer = data.customers[0];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${formData.departure} - ${formData.destination}`,
          departure: formData.departure,
          destination: formData.destination,
          departureTime: `${formData.departureDate}T${formData.departureTime}:00`,
          price: formData.price,
          vehicleId: formData.vehicleId,
          totalSeats: formData.totalSeats || undefined,
          tripType: formData.tripType,
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
    } catch (error) {
      console.error("Create trip error:", error);
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <h3 className="font-semibold text-slate-800">Thông tin khách hàng</h3>
        
        <div className="relative" ref={dropdownRef}>
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
            Tên khách hàng <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={formData.customerPhone.length >= 3 ? "Nhập tên khách mới hoặc chọn từ danh sách" : "Nhập số điện thoại trước"}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
            required
            disabled={formData.customerPhone.length < 3}
          />
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email (không bắt buộc)
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="email@example.com"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
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
      </div>

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
              value={formData.departureTime}
              onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              required
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <h3 className="font-semibold text-slate-800">Loại hình & Thanh toán</h3>
        
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Xe <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              required
            >
              <option value="">Chọn xe</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} - {vehicle.licensePlate}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Giá tiền (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="150000"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
              required
            />
          </div>
        </div>
      </div>

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
              Đang lưu...
            </span>
          ) : (
            "Lưu cuốc xe"
          )}
        </button>
      </div>
    </form>
  );
}
