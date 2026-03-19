"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Plus, X, Edit2, Trash2, Check,
  Calculator, Star, Search, ChevronDown,
  Sheet, Users
} from "lucide-react";
import { useRef } from "react";

interface Formula {
  id: number;
  name: string;
  tripType: string;
  seats: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  points: number;
  description: string | null;
  isActive: boolean;
  sortOrder?: number;
}

interface Driver {
  id: number;
  fullName: string | null;
  profitRate: number;
  formulaId: number | null;
  formulaIds: number[];
  formula: Formula | null;
  formulas: Formula[];
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  ghep: "Ghép xe",
  ghep_roundtrip: "Ghép 2 chiều",
  bao: "Bao xe",
  bao_roundtrip: "Bao 2 chiều",
};

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

function formatVND(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(n);
}

const ITEMS_PER_PAGE = 10;

export default function EditDriverPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params?.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [allFormulas, setAllFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Formula search & pagination
  const [formulaSearch, setFormulaSearch] = useState("");
  const [formulaPage, setFormulaPage] = useState(1);

  // Formula modal
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [formulaForm, setFormulaForm] = useState({
    name: "",
    tripType: "ghep",
    seats: "",
    minPrice: "",
    maxPrice: "",
    points: "1",
    description: "",
    isActive: true,
    sortOrder: "0",
  });

  // Delete confirmation
  const [deletingFormula, setDeletingFormula] = useState<Formula | null>(null);
  const [deletingDriver, setDeletingDriver] = useState(false);
  const formulaSheetRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (driverId) {
      fetchDriver();
      fetchFormulas();
    }
  }, [driverId]);

  const fetchDriver = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/drivers/${driverId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDriver(data.data);
      }
    } catch (error) {
      console.error("Fetch driver error:", error);
    } finally {
      setFetching(false);
    }
  };

  const fetchFormulas = async () => {
    try {
      const res = await fetch("/api/formulas", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setAllFormulas(data.data || []);
    } catch (error) {
      console.error("Fetch formulas error:", error);
    }
  };

  const handleSaveDriver = async () => {
    if (!driver) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/drivers/${driverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: driver.fullName,
          profitRate: driver.profitRate,
          formulaId: driver.formulaId,
          formulaIds: driver.formulaIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Lưu thành công!", "success");
        setTimeout(() => router.push("/dashboard/drivers"), 500);
      } else {
        showToast(data.error || "Có lỗi xảy ra", "error");
      }
    } catch (error) {
      console.error("Save driver error:", error);
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  };

  // Formula CRUD
  const openCreateFormula = () => {
    setEditingFormula(null);
    setFormulaForm({
      name: "",
      tripType: "ghep",
      seats: "",
      minPrice: "",
      maxPrice: "",
      points: "1",
      description: "",
      isActive: true,
      sortOrder: "0",
    });
    setShowFormulaModal(true);
  };

  const openEditFormula = (formula: Formula) => {
    setEditingFormula(formula);
    setFormulaForm({
      name: formula.name,
      tripType: formula.tripType,
      seats: formula.seats?.toString() || "",
      minPrice: formula.minPrice?.toString() || "",
      maxPrice: formula.maxPrice?.toString() || "",
      points: formula.points.toString(),
      description: formula.description || "",
      isActive: formula.isActive,
      sortOrder: formula.sortOrder?.toString() || "0",
    });
    setShowFormulaModal(true);
  };

  const handleSaveFormula = async () => {
    if (!formulaForm.name.trim()) {
      showToast("Vui lòng nhập tên công thức", "error");
      return;
    }
    // Chuẩn hóa points: hỗ trợ cả "0,5" và "0.5", chỉ giữ lại 1 dấu thập phân
    const rawPoints = String(formulaForm.points ?? "").trim().replace(",", ".");
    const match = rawPoints.match(/^\d*\.?\d+/);
    const normalizedPoints = match ? match[0] : "";
    const pointsNum = parseFloat(normalizedPoints);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      showToast("Số điểm phải lớn hơn 0", "error");
      return;
    }
    if (formulaForm.minPrice && formulaForm.maxPrice && parseFloat(formulaForm.minPrice) > parseFloat(formulaForm.maxPrice)) {
      showToast("Giá tối thiểu không được lớn hơn giá tối đa", "error");
      return;
    }
    const isBao = formulaForm.tripType === "bao" || formulaForm.tripType === "bao_roundtrip";

    setLoading(true);
    try {
      const payload = {
        name: formulaForm.name.trim(),
        tripType: formulaForm.tripType,
        seats: isBao ? null : (formulaForm.seats ? parseInt(formulaForm.seats) : null),
        minPrice: formulaForm.minPrice ? parseFloat(formulaForm.minPrice) : null,
        maxPrice: formulaForm.maxPrice ? parseFloat(formulaForm.maxPrice) : null,
        // Gửi points dạng chuỗi chuẩn hóa "0.5" để backend parse chính xác (kể cả khi người dùng nhập "0,5")
        points: normalizedPoints,
        description: formulaForm.description.trim() || null,
        isActive: formulaForm.isActive,
        sortOrder: parseInt(formulaForm.sortOrder) || 0,
      };

      const url = editingFormula ? `/api/formulas/${editingFormula.id}` : "/api/formulas";
      const method = editingFormula ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToast(editingFormula ? "Cập nhật công thức thành công!" : "Tạo công thức thành công!", "success");
        setShowFormulaModal(false);
        fetchFormulas();
        if (!editingFormula && data.data?.id) {
          setDriver(prev => prev ? { ...prev, formulaId: data.data.id } : null);
        }
      } else {
        showToast(data.error || "Có lỗi xảy ra", "error");
      }
    } catch (error) {
      console.error("Save formula error:", error);
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFormula = async () => {
    if (!deletingFormula) return;
    try {
      const res = await fetch(`/api/formulas/${deletingFormula.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Xóa công thức thành công!", "success");
        setDeletingFormula(null);
        if (driver?.formulaId === deletingFormula.id) {
          setDriver(prev => prev ? { ...prev, formulaId: null, formula: null } : null);
        }
        fetchFormulas();
      } else {
        showToast(data.error || "Không thể xóa công thức", "error");
      }
    } catch (error) {
      console.error("Delete formula error:", error);
      showToast("Có lỗi xảy ra", "error");
    }
  };

  const handleDeleteDriver = async () => {
    if (!confirm(`Xóa Zom "${driver.fullName}"? Hành động này không thể hoàn tác.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/drivers/${driverId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Xóa Zom thành công!", "success");
        setDeletingDriver(false);
        setTimeout(() => router.push("/dashboard/drivers"), 500);
      } else {
        showToast(data.error || "Không thể xóa Zom", "error");
      }
    } catch (error) {
      console.error("Delete driver error:", error);
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleFormula = (formulaId: number) => {
    if (!driver) return;
    const current = driver.formulaIds || [];
    const has = current.includes(formulaId);
    const formula = allFormulas.find(f => f.id === formulaId);
    if (has) {
      // Remove
      const updated = current.filter(id => id !== formulaId);
      setDriver(prev => prev ? { ...prev, formulaIds: updated, formulas: prev.formulas.filter(f => f.id !== formulaId) } : null);
      showToast(`Đã tắt "${formula?.name}"`, "success");
    } else {
      // Add
      const updated = [...current, formulaId];
      setDriver(prev => prev ? { ...prev, formulaIds: updated, formulas: [...(prev.formulas || []), formula!] } : null);
      showToast(`Đã bật "${formula?.name}"`, "success");
    }
  };

  // Filter + paginate formulas for the list
  const filteredFormulas = formulaSearch.trim()
    ? allFormulas.filter(f => f.name.toLowerCase().includes(formulaSearch.toLowerCase()))
    : allFormulas;
  const totalFormulaPages = Math.ceil(filteredFormulas.length / ITEMS_PER_PAGE) || 1;
  const paginatedFormulas = filteredFormulas.slice(
    (formulaPage - 1) * ITEMS_PER_PAGE,
    formulaPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => { setFormulaPage(1); }, [formulaSearch]);

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Đang tải...</div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Không tìm thấy Zom</div>
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
          <h1 className="text-lg font-semibold text-slate-800">{driver.fullName || "Sửa Zom"}</h1>
          <button
            onClick={() => setDeletingDriver(true)}
            className="p-2 -mr-2 rounded-lg hover:bg-red-50 text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/drivers" className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Sửa Zom</h1>
            <p className="text-sm text-slate-500">{driver.fullName || "(Chưa đặt tên)"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeletingDriver(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Xóa Zom
          </button>
          <button
            onClick={handleSaveDriver}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Lưu
          </button>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Content */}
      <div className="pt-16 lg:pt-20 px-4 lg:px-6 pb-8 max-w-3xl mx-auto space-y-4">

        {/* Zom Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {(driver.fullName || "?")?.charAt(0).toUpperCase()}
            </span>
            Thông tin Zom
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tên Zom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={driver.fullName || ""}
                onChange={(e) => setDriver(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                placeholder="Zom A"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tỉ lệ quy đổi (VNĐ/điểm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={driver.profitRate}
                  onChange={(e) => setDriver(prev => prev ? { ...prev, profitRate: parseFloat(e.target.value) || 1000 } : null)}
                  placeholder="1000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">VNĐ</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                1 điểm = {new Intl.NumberFormat("vi-VN").format(driver.profitRate)} VNĐ
              </p>
            </div>
          </div>
        </div>

        {/* Formula Card — Merged: all formulas with toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Công thức tính điểm
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bật/tắt công thức Zom &quot;{driver.fullName || "(Chưa đặt tên)"}&quot; được phép dùng
              </p>
            </div>
            <button
              onClick={openCreateFormula}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tạo mới</span>
              <span className="sm:hidden">Mới</span>
            </button>
          </div>

          {/* Profit Rate Banner */}
          <div className="mx-5 mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm text-green-700">
              1 điểm = <strong>{formatVND(driver.profitRate)} VNĐ</strong> (tỉ lệ quy đổi)
            </span>
          </div>

          {/* Search */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm công thức..."
                value={formulaSearch}
                onChange={(e) => setFormulaSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Formula List with Toggle */}
          <div className="divide-y divide-slate-100">
            {allFormulas.length === 0 ? (
              <div className="p-8 text-center">
                <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium text-sm">Chưa có công thức nào</p>
                <p className="text-xs text-slate-400 mt-1">Tạo công thức đầu tiên</p>
              </div>
            ) : filteredFormulas.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Không tìm thấy công thức phù hợp
              </div>
            ) : (
              paginatedFormulas.map((formula) => {
                const isEnabled = driver.formulaIds?.includes(formula.id);
                const isBao = formula.tripType === "bao" || formula.tripType === "bao_roundtrip";
                const profit = formula.points * driver.profitRate;
                return (
                  <div
                    key={formula.id}
                    className={`px-5 py-3 flex items-center gap-3 transition-colors ${
                      isEnabled ? "bg-blue-50/50" : "hover:bg-slate-50"
                    } ${!formula.isActive ? "opacity-50" : ""}`}
                  >
                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleFormula(formula.id)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isEnabled ? "bg-blue-600" : "bg-slate-300"
                      }`}
                      title={isEnabled ? "Tắt công thức này" : "Bật công thức này"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TRIP_TYPE_COLORS[formula.tripType] || "bg-slate-100 text-slate-700"}`}>
                          {TRIP_TYPE_SHORT[formula.tripType]}
                        </span>
                        <span className="font-medium text-slate-800 text-sm truncate">{formula.name}</span>
                        {formula.isActive ? (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">Active</span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {!isBao && formula.seats != null && (
                          <span className="text-xs text-slate-500">{formula.seats} ghế</span>
                        )}
                        {(formula.minPrice != null || formula.maxPrice != null) && (
                          <span className="text-xs text-slate-400">
                            {formatVND(formula.minPrice)} – {formatVND(formula.maxPrice)} VNĐ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points & Profit */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                          <Star className="w-3 h-3" />
                          <span className="font-bold text-xs">{formula.points}</span>
                        </div>
                        <span className="text-[10px] text-green-600 font-medium">
                          {formatVND(profit)} VNĐ/cuốc
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => openEditFormula(formula)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingFormula(formula)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalFormulaPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Trang {formulaPage}/{totalFormulaPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFormulaPage(p => Math.max(1, p - 1))}
                  disabled={formulaPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  onClick={() => setFormulaPage(p => Math.min(totalFormulaPages, p + 1))}
                  disabled={formulaPage >= totalFormulaPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Button (mobile) */}
        <div className="lg:hidden pt-2 pb-6">
          <button
            onClick={handleSaveDriver}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
      </div>

      {/* Formula Create/Edit Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${editingFormula ? "bg-amber-500" : "bg-blue-600"}`}>
                  {editingFormula ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {editingFormula ? "Sửa công thức" : "Tạo công thức mới"}
                  </h2>
                  {editingFormula && (
                    <p className="text-xs text-slate-400">{editingFormula.name}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setShowFormulaModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên công thức <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formulaForm.name}
                  onChange={(e) => setFormulaForm({ ...formulaForm, name: e.target.value })}
                  placeholder="VD: Ghép HN-HP"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base"
                />
              </div>

              {/* Trip Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Loại hình <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "ghep", label: "Ghép xe" },
                    { value: "ghep_roundtrip", label: "Ghép 2C" },
                    { value: "bao", label: "Bao xe" },
                    { value: "bao_roundtrip", label: "Bao 2C" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`cursor-pointer px-3 py-2.5 rounded-xl border-2 text-center font-medium text-sm transition-all ${
                        formulaForm.tripType === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="modalTripType"
                        value={opt.value}
                        checked={formulaForm.tripType === opt.value}
                        onChange={(e) => setFormulaForm({ ...formulaForm, tripType: e.target.value })}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Seats — only for ghep types */}
              {(formulaForm.tripType === "ghep" || formulaForm.tripType === "ghep_roundtrip") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Số ghế
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formulaForm.seats}
                    onChange={(e) => setFormulaForm({ ...formulaForm, seats: e.target.value })}
                    placeholder="VD: 1, 2, 4..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base"
                  />
                  <p className="text-xs text-slate-400 mt-1">VD: 1 = 1 ghế, 2 = 2 ghế. Điền số để tính điểm theo số ghế.</p>
                </div>
              )}
              {(formulaForm.tripType === "bao" || formulaForm.tripType === "bao_roundtrip") && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700 font-medium">
                    Bao xe không tính theo số ghế — chỉ dựa theo giá tiền để quy điểm.
                  </p>
                </div>
              )}

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    value={formulaForm.minPrice}
                    onChange={(e) => setFormulaForm({ ...formulaForm, minPrice: e.target.value })}
                    placeholder="VD: 150000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Giá tối đa (VNĐ)</label>
                  <input
                    type="number"
                    value={formulaForm.maxPrice}
                    onChange={(e) => setFormulaForm({ ...formulaForm, maxPrice: e.target.value })}
                    placeholder="VD: 250000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base"
                  />
                </div>
              </div>

              {/* Points — decimal allowed */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Số điểm <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formulaForm.points}
                    onChange={(e) => {
                      // Cho phép nhập tự do số thập phân, xử lý/validate khi lưu
                      setFormulaForm({ ...formulaForm, points: e.target.value });
                    }}
                    placeholder="1"
                    className="w-24 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-center text-xl font-bold"
                  />
                  <span className="text-sm text-slate-500">điểm</span>
                </div>
                {formulaForm.points && driver && (() => {
                  const raw = String(formulaForm.points ?? "").trim().replace(",", ".");
                  const match = raw.match(/^\d*\.?\d+/);
                  const parsedPoints = match ? parseFloat(match[0]) : NaN;
                  if (!Number.isFinite(parsedPoints) || parsedPoints <= 0 || !Number.isFinite(driver.profitRate)) {
                    return null;
                  }
                  const previewVnd = parsedPoints * driver.profitRate;
                  return (
                    <p className="text-xs text-green-600 mt-1">
                      Số điểm × {formatVND(driver.profitRate)} VNĐ/điểm ≈{" "}
                      {formatVND(previewVnd)} VNĐ/cuốc (với tỉ lệ Zom)
                    </p>
                  );
                })()}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú</label>
                <textarea
                  value={formulaForm.description}
                  onChange={(e) => setFormulaForm({ ...formulaForm, description: e.target.value })}
                  placeholder="Ghi chú nội bộ"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base resize-none"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Thứ tự ưu tiên</label>
                <input
                  type="number"
                  min="0"
                  value={formulaForm.sortOrder}
                  onChange={(e) => setFormulaForm({ ...formulaForm, sortOrder: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-base"
                />
                <p className="text-xs text-slate-400 mt-1">Số nhỏ hơn = ưu tiên cao hơn khi match tự động</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveFormula}
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingFormula ? "Lưu" : "Tạo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Formula Confirmation */}
      {deletingFormula && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Xóa công thức</h2>
              <p className="text-slate-600">
                Xóa <strong>&quot;{deletingFormula.name}&quot;</strong>? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDeletingFormula(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteFormula}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/25 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Driver Confirmation */}
      {deletingDriver && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Xóa Zom</h2>
              <p className="text-slate-600">
                Xóa <strong>&quot;{driver?.fullName}&quot;</strong>? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDeletingDriver(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteDriver}
                disabled={loading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
