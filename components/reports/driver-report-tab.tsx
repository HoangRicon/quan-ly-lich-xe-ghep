"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Search, Users } from "lucide-react";
import { ReportTable } from "./report-table";
import * as XLSX from "xlsx";

interface DriverStats {
  id: number;
  fullName: string;
  phone: string;
  totalTrips: number;
  completedTrips: number;
  unassignedTrips: number;
  inProgressTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  totalProfit: number;
  avgTripValue: number;
  badge: string;
}

interface DriverReportTabProps {
  startDate: string;
  endDate: string;
  selectedDriver: string;
}

function formatVND(amount: number): string {
  if (amount >= 1000000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1000000)}M`;
  }
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function Badge({ badge }: { badge: string }) {
  const config: Record<string, { label: string; className: string }> = {
    top: { label: "Top", className: "bg-amber-100 text-amber-700" },
    active: { label: "Active", className: "bg-green-100 text-green-700" },
    normal: { label: "Normal", className: "bg-slate-100 text-slate-600" },
  };
  const c = config[badge] || config.normal;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function DriverAvatar() {
  return (
    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
      <Users className="w-5 h-5 text-blue-600" />
    </div>
  );
}

export function DriverReportTab({
  startDate,
  endDate,
  selectedDriver,
}: DriverReportTabProps) {
  const [data, setData] = useState<DriverStats[]>([]);
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
  const pageSize = 20;

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

        const res = await fetch(`/api/reports/drivers?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setPagination((p) => ({ ...p, ...json.pagination }));
        }
      } catch (err) {
        console.error("Failed to fetch driver stats:", err);
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
        "Họ tên": d.fullName,
        "SĐT": d.phone,
        "Tổng cuốc": d.totalTrips,
        "Hoàn thành": d.completedTrips,
        "Đang chạy": d.inProgressTrips,
        "Chưa gán": d.unassignedTrips,
        "Đã hủy": d.cancelledTrips,
        "Doanh thu (đ)": d.totalRevenue,
        "Lợi nhuận (đ)": d.totalProfit,
        "TB cuốc (đ)": Math.round(d.avgTripValue),
        "Hạng": d.badge,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tài xế");
    XLSX.writeFile(wb, `bao-cao-tai-xe-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns = [
    {
      key: "fullName",
      label: "Tên tài xế",
      sortable: true,
      render: (item: DriverStats) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{item.fullName}</div>
            {item.phone && <div className="text-xs text-slate-400">{item.phone}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "totalTrips",
      label: "Tổng cuốc",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="font-semibold">{item.totalTrips}</span>
      ),
      className: "text-center",
    },
    {
      key: "completedTrips",
      label: "Hoàn thành",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="text-green-600 font-medium">{item.completedTrips}</span>
      ),
      className: "text-center",
    },
    {
      key: "inProgressTrips",
      label: "Đang chạy",
      sortable: true,
      render: (item: DriverStats) => <span className="text-blue-600">{item.inProgressTrips}</span>,
      className: "text-center",
    },
    {
      key: "unassignedTrips",
      label: "Chưa gán",
      sortable: true,
      render: (item: DriverStats) => <span className="text-orange-500">{item.unassignedTrips}</span>,
      className: "text-center",
    },
    {
      key: "totalRevenue",
      label: "Doanh thu",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="font-semibold text-slate-800">{formatVND(item.totalRevenue)}</span>
      ),
    },
    {
      key: "totalProfit",
      label: "Lợi nhuận",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="text-blue-600 font-medium">{formatVND(item.totalProfit)}</span>
      ),
    },
    {
      key: "badge",
      label: "Hạng",
      sortable: false,
      render: (item: DriverStats) => <Badge badge={item.badge} />,
    },
  ];

  const buildCardRows = (item: DriverStats) => [
    [
      { label: "Tổng cuốc", value: String(item.totalTrips), color: "text-slate-800" },
      { label: "Hoàn thành", value: String(item.completedTrips), color: "text-green-600" },
      { label: "Đang chạy", value: String(item.inProgressTrips), color: "text-blue-600" },
    ],
    [
      { label: "Chưa gán", value: String(item.unassignedTrips), color: "text-orange-500" },
      { label: "Doanh thu", value: formatVND(item.totalRevenue), color: "text-slate-800" },
      { label: "Lợi nhuận", value: formatVND(item.totalProfit), color: "text-blue-600" },
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
            placeholder="Tìm tài xế..."
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
        emptyMessage="Chưa có dữ liệu tài xế"
        pageSize={pageSize}
        cardRows={buildCardRows}
        cardAvatar={() => <DriverAvatar />}
        cardTitle={(item: DriverStats) => item.fullName}
        cardSubtitle={(item: DriverStats) => item.phone || ""}
      />
    </div>
  );
}
