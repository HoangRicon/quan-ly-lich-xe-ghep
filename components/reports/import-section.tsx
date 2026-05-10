"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportRow {
  title?: string;
  departure?: string;
  destination?: string;
  departureTime?: string;
  price?: string | number;
  totalSeats?: string | number;
  customerPhone?: string;
  customerName?: string;
  notes?: string;
  tripDirection?: string;
  tripType?: string;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

export function ImportSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);

    const ext = f.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data as ImportRow[]);
        },
        error: () => {
          setPreview([]);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<ImportRow[]>(worksheet);
          setPreview(json);
        } catch {
          setPreview([]);
        }
      };
      reader.readAsBinaryString(f);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const downloadTemplate = () => {
    const headers = [
      "title", "departure", "destination", "departureTime",
      "price", "totalSeats", "customerPhone", "customerName",
      "notes", "tripDirection", "tripType",
    ];
    const sampleData = [
      {
        title: "HCM - Vũng Tàu sáng", departure: "HCM", destination: "Vũng Tàu",
        departureTime: "2026-05-15 08:00", price: 150000, totalSeats: 4,
        customerPhone: "0912345678", customerName: "Nguyễn Văn A",
        notes: "Khách cần đón trước 30 phút", tripDirection: "oneway", tripType: "ghep",
      },
      {
        title: "HCM - Đà Lạt", departure: "HCM", destination: "Đà Lạt",
        departureTime: "2026-05-16 06:00", price: 250000, totalSeats: 7,
        customerPhone: "0987654321", customerName: "Trần Văn B",
        notes: "", tripDirection: "roundtrip", tripType: "bao",
      },
    ];
    const ws = XLSX.utils.json_to_sheet([
      headers.reduce((acc, h) => ({ ...acc, [h]: h }), {}),
      ...sampleData,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu import");
    XLSX.writeFile(wb, "mau-import-chuyen-xe.xlsx");
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/reports/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: preview }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        if (json.data.imported > 0) {
          setPreview([]);
          setFile(null);
        }
      }
    } catch {
      setResult({
        imported: 0,
        failed: preview.length,
        errors: [{ row: 0, message: "Lỗi kết nối server" }],
      });
    } finally {
      setImporting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all touch-manipulation ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
        }`}
      >
        <FileText className={`w-8 h-8 mx-auto mb-2 ${isDragging ? "text-blue-500" : "text-slate-300"}`} />
        <p className="text-xs font-medium text-slate-700">
          Kéo thả file hoặc tap để chọn
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          .csv, .xlsx, .xls
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Selected file */}
      {file && (
        <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg">
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
            <p className="text-[11px] text-slate-400">
              {(file.size / 1024).toFixed(1)} KB — {preview.length} dòng
            </p>
          </div>
          <button
            onClick={clearFile}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <p className="text-[11px] text-slate-500 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
            Xem trước {Math.min(preview.length, 5)}/{preview.length} dòng đầu
          </p>
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="bg-slate-50">
                {Object.keys(preview[0] || {}).map((key) => (
                  <th key={key} className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase whitespace-nowrap">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">
                      {String(val ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-lg border ${
          result.failed === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-start gap-2">
            {result.failed === 0 ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800">
                {result.failed === 0
                  ? `✅ ${result.imported} dòng đã nhập thành công`
                  : `⚠️ Đã nhập ${result.imported}, thất bại ${result.failed} dòng`}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-[11px] text-slate-500">
                      Dòng {err.row}: {err.message}
                    </p>
                  ))}
                  {result.errors.length > 3 && (
                    <p className="text-[11px] text-slate-400">
                      ... và {result.errors.length - 3} lỗi khác
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Tải mẫu
        </button>
        <div className="flex-1" />
        {preview.length > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {importing ? "Đang nhập..." : `Nhập ${preview.length} dòng`}
          </button>
        )}
      </div>
    </div>
  );
}
