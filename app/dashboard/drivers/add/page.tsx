"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Save, Calculator, Star } from "lucide-react";

interface Formula {
  id: number;
  name: string;
  tripType: string;
  seats: number | null;
  points: number;
  isActive: boolean;
}

const TRIP_TYPE_SHORT: Record<string, string> = {
  ghep: "Ghép",
  ghep_roundtrip: "Ghép 2C",
  bao: "Bao",
  bao_roundtrip: "Bao 2C",
};

const TRIP_TYPE_COLORS: Record<string, string> = {
  ghep: "bg-blue-100 text-blue-700",
  ghep_roundtrip: "bg-cyan-100 text-cyan-700",
  bao: "bg-amber-100 text-amber-700",
  bao_roundtrip: "bg-orange-100 text-orange-700",
};

export default function AddDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    profitRate: "1000",
    formulaId: "" as string | "",
  });

  useEffect(() => {
    fetch("/api/formulas", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d.success) setFormulas(d.data || []); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          profitRate: parseFloat(formData.profitRate) || 1000,
          formulaId: formData.formulaId ? parseInt(formData.formulaId) : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/dashboard/drivers");
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Create driver error:", error);
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const selectedFormula = formulas.find(f => f.id === parseInt(formData.formulaId));
  const profitPerTrip = selectedFormula
    ? selectedFormula.points * (parseFloat(formData.profitRate) || 1000)
    : null;

  return (
    <div className="page-wrapper">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard/drivers" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Thêm Zom</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/drivers" className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Thêm Zom mới</h1>
        </div>
      </header>

      {/* Form Content - scrollable */}
      <div className="page-scroll">
        <div className="pt-16 lg:pt-20 px-4 lg:px-6 pb-8">
          <div className="max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Fields */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Tên Zom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Zom A"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base"
                  required
                />
              </div>

              {/* Profit Rate */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tỉ lệ quy đổi (VNĐ/điểm) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.profitRate}
                    onChange={(e) => setFormData({ ...formData, profitRate: e.target.value })}
                    placeholder="1000"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base pr-12"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">VNĐ</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  1 điểm = {new Intl.NumberFormat("vi-VN").format(parseFloat(formData.profitRate) || 0)} VNĐ
                </p>
              </div>

              {/* Formula Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calculator className="w-4 h-4 inline mr-1" />
                  Công thức tính điểm
                </label>
                {formulas.filter(f => f.isActive).length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center">
                    <p className="text-sm text-slate-500">Chưa có công thức nào.</p>
                    <p className="text-xs text-slate-400 mt-1">Tạo công thức tại trang sửa Zom sau khi tạo.</p>
                  </div>
                ) : (
                  <select
                    value={formData.formulaId}
                    onChange={(e) => setFormData({ ...formData, formulaId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base bg-white appearance-none"
                  >
                    <option value="">— Chưa gán công thức —</option>
                    {formulas.filter(f => f.isActive).map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({TRIP_TYPE_SHORT[f.tripType] || f.tripType}
                        {f.seats ? ` - ${f.seats}ghế` : ""}
                        {f.points ? ` - ${f.points}đ` : ""})
                      </option>
                    ))}
                  </select>
                )}
                {selectedFormula && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TRIP_TYPE_COLORS[selectedFormula.tripType] || "bg-slate-100 text-slate-700"}`}>
                        {TRIP_TYPE_SHORT[selectedFormula.tripType] || selectedFormula.tripType}
                      </span>
                      {selectedFormula.seats && (
                        <span className="text-xs text-slate-500">{selectedFormula.seats} ghế</span>
                      )}
                      <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        <Star className="w-3 h-3" />
                        {selectedFormula.points} điểm
                      </span>
                    </div>
                    <div className="text-sm text-green-700">
                      Lợi nhuận mỗi cuốc:{" "}
                      <span className="font-bold">
                        {new Intl.NumberFormat("vi-VN").format(profitPerTrip || 0)} VNĐ
                      </span>
                      <span className="text-xs ml-1">
                        ({selectedFormula.points}đ × {new Intl.NumberFormat("vi-VN").format(parseFloat(formData.profitRate) || 0)} VNĐ)
                      </span>
                    </div>
                  </div>
                )}
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
                    Lưu Zom
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
