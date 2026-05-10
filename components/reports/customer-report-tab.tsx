"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Search, User } from "lucide-react";
import { ReportTable } from "./report-table";
import * as XLSX from "xlsx";

interface CustomerStats {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  totalTrips: number;
  totalSpending: number;
  favoriteRoute: string | null;
  badge: string;
  lastTripDate: string;
}

interface CustomerReportTabProps {
  startDate: string;
  endDate: string;
}

function formatVND(amount: number): string {
  if (amount >= 1000000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1000000)}M`;
  }
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function Badge({ badge }: { badge: string }) {
  const config: Record<string, { label: string; className: string }> = {
    vip: { label: "VIP", className: "bg-amber-100 text-amber-700" },
    regular: { label: "Regular", className: "bg-blue-100 text-blue-700" },
    new: { label: "New", className: "bg-green-100 text-green-700" },
  };
  const c = config[badge] || config.new;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function CustomerAvatar() {
  return (
    <div className="w-full h-full bg-purple-100 flex items-center justify-center">
      <User className="w-5 h-5 text-purple-600" />
    </div>
  );
}

export function CustomerReportTab({ startDate, endDate }: CustomerReportTabProps) {
  const [data, setData] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [sortBy, setSortBy] = useState("totalTrips");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");

  const fetchData = useCallback(
    async (page: number, search: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (search) params.set("search", search);
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        params.set("page", String(page));
        params.set("limit", String(pagination.limit));

        const res = await fetch(`/api/reports/customers?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setPagination((p) => ({ ...p, ...json.pagination }));
        }
      } catch (err) {
        console.error("Failed to fetch customer stats:", err);
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, sortBy, sortOrder, pagination.limit]
  );

  useEffect(() => {
    fetchData(1, searchApplied);
  }, [fetchData, searchApplied]);

  const handleSort = (key: string) => {
    const newOrder = sortBy === key && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(key);
    setSortOrder(newOrder);
  };

  const handlePageChange = (page: number) => {
    setPagination((p) => ({ ...p, page }));
    fetchData(page, searchApplied);
  };

  const handleSearchApply = () => {
    setSearchApplied(searchDraft);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        "Họ tên": d.name,
        "SĐT": d.phone,
        "Email": d.email || "",
        "Tổng cuốc": d.totalTrips,
        "Tổng chi (đ)": d.totalSpending,
        "Tuyến ưa thích": d.favoriteRoute || "",
        "Hạng": d.badge,
        "Ngày cuối": d.lastTripDate,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Khách hàng");
    XLSX.writeFile(wb, `bao-cao-khach-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns = [
    {
      key: "name",
      label: "Khách hàng",
      sortable: true,
      render: (item: CustomerStats) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-slate-400">{item.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: "totalTrips",
      label: "Tổng cuốc",
      sortable: true,
      render: (item: CustomerStats) => <span className="font-semibold">{item.totalTrips}</span>,
      className: "text-center",
    },
    {
      key: "totalSpending",
      label: "Tổng chi",
      sortable: true,
      render: (item: CustomerStats) => (
        <span className="font-semibold text-slate-800">{formatVND(item.totalSpending)}</span>
      ),
    },
    {
      key: "favoriteRoute",
      label: "Tuyến ưa thích",
      sortable: false,
      render: (item: CustomerStats) => (
        <span className="text-slate-600 text-xs">{item.favoriteRoute || "—"}</span>
      ),
    },
    {
      key: "badge",
      label: "Hạng",
      sortable: false,
      render: (item: CustomerStats) => <Badge badge={item.badge} />,
    },
    {
      key: "lastTripDate",
      label: "Ngày cuối",
      sortable: false,
      render: (item: CustomerStats) => (
        <span className="text-slate-500 text-xs">{item.lastTripDate || "—"}</span>
      ),
    },
  ];

  const buildCardRows = (item: CustomerStats) => [
    [
      { label: "Tổng cuốc", value: String(item.totalTrips), color: "text-slate-800" },
      { label: "Tổng chi", value: formatVND(item.totalSpending), color: "text-slate-800" },
      { label: "Hạng", value: item.badge.toUpperCase(), color: item.badge === "vip" ? "text-amber-600" : "text-slate-600" },
    ],
    [
      { label: "Tuyến ưa thích", value: item.favoriteRoute || "—", color: "text-slate-500" },
      { label: "Ngày cuối", value: item.lastTripDate || "—", color: "text-slate-500" },
      { label: "", value: "", color: "text-transparent" },
    ],
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm khách hàng..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchApply()}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={handleSearchApply}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg shrink-0"
        >
          Tìm
        </button>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Xuất</span>
        </button>
      </div>

      <ReportTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        currentPage={pagination.page}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="Chưa có dữ liệu khách hàng"
        pageSize={20}
        cardRows={buildCardRows}
        cardAvatar={() => <CustomerAvatar />}
        cardTitle={(item: CustomerStats) => item.name}
        cardSubtitle={(item: CustomerStats) => item.phone}
      />
    </div>
  );
}
