"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Car, User, Phone, CarFront, FileText, Save } from "lucide-react";

export default function EditDriverPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    status: "available",
    licensePlate: "",
    vehicleType: "4",
    vehicleModel: "",
    year: "",
    notes: "",
  });

  useEffect(() => {
    if (driverId) {
      fetchDriver();
    }
  }, [driverId]);

  const fetchDriver = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/drivers/${driverId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const driver = data.data;
        setFormData({
          fullName: driver.fullName || "",
          phone: driver.phone || "",
          status: driver.status || "available",
          licensePlate: driver.vehicles?.[0]?.licensePlate || "",
          vehicleType: driver.vehicles?.[0]?.seats?.toString() || "4",
          vehicleModel: driver.vehicles?.[0]?.brand && driver.vehicles?.[0]?.model 
            ? `${driver.vehicles[0].brand} ${driver.vehicles[0].model}`.trim()
            : "",
          year: driver.vehicles?.[0]?.year?.toString() || "",
          notes: driver.notes || "",
        });
        if (driver.avatar) {
          setAvatarPreview(driver.avatar);
        }
      }
    } catch (error) {
      console.error("Fetch driver error:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLicensePlateChange = (value: string) => {
    setFormData({ ...formData, licensePlate: value.toUpperCase() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vehicleData = {
        name: formData.vehicleModel || "Xe của tài xế",
        licensePlate: formData.licensePlate || undefined,
        vehicleType: formData.vehicleType === "4" ? "car" : formData.vehicleType === "7" ? "suv" : "bus",
        seats: parseInt(formData.vehicleType),
        brand: formData.vehicleModel.split(" ")[0] || undefined,
        model: formData.vehicleModel.split(" ").slice(1).join(" ") || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
      };

      const res = await fetch(`/api/drivers/${driverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          status: formData.status,
          vehicle: vehicleData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/dashboard/drivers");
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Update driver error:", error);
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes = [
    { value: "4", label: "4 chỗ", icon: Car, color: "from-blue-500 to-blue-600" },
    { value: "7", label: "7 chỗ", icon: CarFront, color: "from-green-500 to-green-600" },
    { value: "16", label: "16 chỗ", icon: Car, color: "from-purple-500 to-purple-600" },
  ];

  const statusOptions = [
    { value: "available", label: "Chờ việc", color: "bg-green-100 text-green-700" },
    { value: "running", label: "Đang chạy", color: "bg-blue-100 text-blue-700" },
    { value: "resting", label: "Đang nghỉ", color: "bg-orange-100 text-orange-700" },
    { value: "offline", label: "Offline", color: "bg-slate-100 text-slate-600" },
  ];

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard/drivers" className="p-2 -ml-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Sửa tài xế</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/drivers" className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Sửa thông tin tài xế</h1>
        </div>
      </header>

      {/* Form Content */}
      <div className="pt-16 lg:pt-20 px-4 lg:px-6 pb-8">
        <div className="max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center py-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer group"
              >
                <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg group-hover:shadow-xl transition-shadow">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 lg:w-12 lg:h-12 text-slate-400" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg group-hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="mt-2 text-sm text-slate-500">Nhấn để tải ảnh đại diện</p>
            </div>

            {/* Input Fields */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Tên tài xế <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder="0912 345 678"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* License Plate */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Car className="w-4 h-4 inline mr-1" />
                  Biển số xe
                </label>
                <input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) => handleLicensePlateChange(e.target.value)}
                  placeholder="29A-12345"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base font-semibold tracking-wider"
                />
              </div>

              {/* Vehicle Type Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <CarFront className="w-4 h-4 inline mr-1" />
                  Loại xe
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {vehicleTypes.map((type) => (
                    <label key={type.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="vehicleType"
                        value={type.value}
                        checked={formData.vehicleType === type.value}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="peer sr-only"
                      />
                      <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-slate-300">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${type.color} flex items-center justify-center shadow-md`}>
                          <type.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{type.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vehicle Model */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <CarFront className="w-4 h-4 inline mr-1" />
                  Đời xe
                </label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  placeholder="Toyota Vios 2022"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Car className="w-4 h-4 inline mr-1" />
                  Năm sản xuất
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2024"
                  min={2000}
                  max={2030}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Thông tin thêm về tài xế..."
                  rows={3}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base resize-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 pb-6 lg:pb-0">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
