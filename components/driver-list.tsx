"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search, Plus, Edit2, Trash2, Download, FileText, Calculator, Star, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Formula {
  id: number;
  name: string;
  tripType: string;
  seats: number | null;
  points: number;
  isActive: boolean;
}

interface Zom {
  id: number;
  fullName: string | null;
  profitRate: number;
  formulaId: number | null;
  formulaIds: number[];
  formula: Formula | null;
  formulas: Formula[];
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

export default function DriverList() {
  const [zoms, setZoms] = useState<Zom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Delete modal state
  const [deletingZom, setDeletingZom] = useState<Zom | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchZoms();
  }, [page, limit, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [limit, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchZoms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchTerm.trim()) params.set("q", searchTerm.trim());

      const res = await fetch(`/api/drivers?${params}`);
      const data = await res.json();
      if (data.data) {
        setZoms(data.data);
      }
      if (data.pagination) {
        setTotal(data.pagination.total ?? 0);
        setTotalPages(data.pagination.totalPages ?? 1);
      }
    } catch (error) {
      console.error("Fetch zoms error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = async () => {
    if (!deletingZom) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drivers/${deletingZom.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeletingZom(null);
        fetchZoms();
      } else {
        alert(data.error || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("Delete zom error:", error);
      alert("Lỗi khi xóa");
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["STT", "Tên Zom", "Tỉ lệ (VNĐ/điểm)", "Công thức"];
    const rows = zoms.map((z, index) => [
      index + 1,
      z.fullName || "",
      z.profitRate,
      z.formula ? `${TRIP_TYPE_SHORT[z.formula.tripType] || z.formula.tripType} - ${z.formula.name} - ${z.formula.points}đ` : "Chưa gán",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `zom-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const exportToExcel = () => {
    const headers = ["STT", "Tên Zom", "Tỉ lệ (VNĐ/điểm)", "Công thức"];
    const rows = zoms.map((z, index) => [
      index + 1,
      z.fullName || "",
      z.profitRate,
      z.formula ? `${TRIP_TYPE_SHORT[z.formula.tripType] || z.formula.tripType} - ${z.formula.name} - ${z.formula.points}đ` : "Chưa gán",
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    xml += '<Worksheet ss:Name="Zom"><Table>';

    headers.forEach(h => {
      xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
    });

    rows.forEach(row => {
      xml += "<Row>";
      row.forEach(cell => {
        const isNumber = typeof cell === "number";
        xml += `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${cell}</Data></Cell>`;
      });
      xml += "</Row>";
    });

    xml += '</Table></Worksheet></Workbook>';

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `zom-${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    setShowExportMenu(false);
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm Zom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
            />
          </div>
          <Link href="/dashboard/drivers/add">
            <button className="flex items-center justify-center w-10 h-[42px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-bold flex-shrink-0">
              +
            </button>
          </Link>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Zom</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Công thức</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Tỉ lệ (VNĐ/điểm)</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            ) : zoms.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Chưa có Zom nào
                </td>
              </tr>
            ) : (
              zoms.map((zom) => (
                <tr key={zom.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/drivers/${zom.id}/edit`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold">
                        {(zom.fullName || "?")?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{zom.fullName || "(Chưa đặt tên)"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {zom.formulas && zom.formulas.length > 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${TRIP_TYPE_COLORS[zom.formulas[0].tripType] || "bg-slate-100 text-slate-700"}`}>
                          {TRIP_TYPE_SHORT[zom.formulas[0].tripType] || zom.formulas[0].tripType}
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {zom.formulas[0].points}đ
                        </span>
                        {zom.formulas.length > 1 && (
                          <span className="text-xs text-slate-400">+{zom.formulas.length - 1}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chưa gán</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-slate-700">{formatCurrency(zom.profitRate)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/dashboard/drivers/${zom.id}/edit`}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeletingZom(zom)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-2">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Đang tải...
          </div>
        ) : zoms.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Chưa có Zom nào
          </div>
        ) : (
          zoms.map((zom) => (
            <Link
              key={zom.id}
              href={`/dashboard/drivers/${zom.id}/edit`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Left: avatar + name + formula */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {(zom.fullName || "?")?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 truncate">{zom.fullName || "(Chưa đặt tên)"}</div>
                    {zom.formulas && zom.formulas.length > 0 ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TRIP_TYPE_COLORS[zom.formulas[0].tripType] || "bg-slate-100 text-slate-700"}`}>
                          {TRIP_TYPE_SHORT[zom.formulas[0].tripType]}
                        </span>
                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" />
                          {zom.formulas[0].points}đ
                        </span>
                        {zom.formulas.length > 1 && (
                          <span className="text-[10px] text-slate-400">+{zom.formulas.length - 1}</span>
                        )}
                        <span className="text-[10px] text-slate-400">{formatCurrency(zom.profitRate)}/đ</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic mt-0.5">Chưa gán công thức</div>
                    )}
                  </div>
                </div>
                {/* Right: arrow */}
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Tổng: <span className="font-medium text-slate-800">{total}</span> Zom
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            className="h-9"
          >
            Trước
          </Button>
          <span className="text-sm text-slate-600 px-1">
            {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            className="h-9"
          >
            Sau
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingZom && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Xóa Zom</h2>
              <p className="text-slate-600">
                Bạn có chắc chắn muốn xóa Zom <strong>{deletingZom.fullName}</strong> không?
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <Button
                variant="outline"
                onClick={() => setDeletingZom(null)}
                disabled={deleting}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
