"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Search, Route } from "lucide-react";
import { ReportTable } from "./report-table";
import * as XLSX from "xlsx";
import type { ReportDateBasis } from "@/lib/reports/date-basis";

interface RouteStats {
  route: string;
  departure: string;
  destination: string;
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  totalProfit: number;
  avgTripValue: number;
  avgProfit: number;
  avgSeats: number;
}

interface RouteReportTabProps {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  dateBasis: ReportDateBasis;
}

function formatVND(amount: number): string {
  if (amount >= 1000000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1000000)}M`;
  }
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function RouteAvatar() {
  return (
    <div className="w-full h-full bg-orange-100 flex items-center justify-center">
      <Route className="w-5 h-5 text-orange-600" />
    </div>
  );
}

export function RouteReportTab({
  startDate,
  endDate,
  startTime,
  endTime,
  dateBasis,
}: RouteReportTabProps) {
  const [data, setData] = useState<RouteStats[]>([]);
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
        if (startTime) params.set("startTime", startTime);
        if (endTime) params.set("endTime", endTime);
        params.set("dateBasis", dateBasis);
        if (search) params.set("search", search);
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        params.set("page", String(page));
        params.set("limit", String(pagination.limit));

        const res = await fetch(`/api/reports/routes?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setPagination((p) => ({ ...p, ...json.pagination }));
        }
      } catch (err) {
        console.error("Failed to fetch route stats:", err);
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, startTime, endTime, dateBasis, sortBy, sortOrder, pagination.limit]
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
      data.map((r) => ({
        "Tuyến đường": r.route,
        "Tổng cuốc": r.totalTrips,
        "Hoàn thành": r.completedTrips,
        "Đã gán": r.assignedTrips,
        "Chưa gán": r.unassignedTrips,
        "Đã hủy": r.cancelledTrips,
        "Doanh thu (đ)": r.totalRevenue,
        "Lợi nhuận (đ)": r.totalProfit,
        "TB cuốc (đ)": Math.round(r.avgTripValue),
        "TB lợi nhuận (đ)": Math.round(r.avgProfit),
        "TB ghế": r.avgSeats,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tuyến đường");
    XLSX.writeFile(wb, `bao-cao-tuyen-duong-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns = [
    {
      key: "route",
      label: "Tuyến đường",
      sortable: true,
      render: (item: RouteStats) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Route className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="font-medium text-sm">{item.route}</div>
            <div className="text-xs text-slate-400">
              {item.departure} → {item.destination}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "totalTrips",
      label: "Tổng cuốc",
      sortable: true,
      render: (item: RouteStats) => <span className="font-semibold">{item.totalTrips}</span>,
      className: "text-center",
    },
    {
      key: "completedTrips",
      label: "Hoàn thành",
      sortable: true,
      render: (item: RouteStats) => (
        <span className="text-green-600 font-medium">{item.completedTrips}</span>
      ),
      className: "text-center",
    },
    {
      key: "assignedTrips",
      label: "Đã gán",
      sortable: true,
      render: (item: RouteStats) => <span className="text-sky-600 font-medium">{item.assignedTrips}</span>,
      className: "text-center",
    },
    {
      key: "unassignedTrips",
      label: "Chưa gán",
      sortable: true,
      render: (item: RouteStats) => <span className="text-orange-500">{item.unassignedTrips}</span>,
      className: "text-center",
    },
    {
      key: "totalRevenue",
      label: "Doanh thu",
      sortable: true,
      render: (item: RouteStats) => (
        <span className="font-semibold text-slate-800">{formatVND(item.totalRevenue)}</span>
      ),
    },
    {
      key: "totalProfit",
      label: "Lợi nhuận",
      sortable: true,
      render: (item: RouteStats) => (
        <span className="text-blue-600 font-medium">{formatVND(item.totalProfit)}</span>
      ),
    },
    {
      key: "avgSeats",
      label: "TB ghế",
      sortable: true,
      render: (item: RouteStats) => <span className="text-slate-500">{item.avgSeats}</span>,
      className: "text-center",
    },
  ];

  const buildCardRows = (item: RouteStats) => [
    [
      { label: "Tổng cuốc", value: String(item.totalTrips), color: "text-slate-800" },
      { label: "Hoàn thành", value: String(item.completedTrips), color: "text-green-600" },
      { label: "Đã gán", value: String(item.assignedTrips), color: "text-sky-600" },
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
            placeholder="Tìm tuyến đường..."
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
        emptyMessage="Chưa có dữ liệu tuyến đường"
        pageSize={20}
        cardRows={buildCardRows}
        cardAvatar={() => <RouteAvatar />}
        cardTitle={(item: RouteStats) => item.route}
        cardSubtitle={(item: RouteStats) => `${item.departure} → ${item.destination}`}
      />
    </div>
  );
}
