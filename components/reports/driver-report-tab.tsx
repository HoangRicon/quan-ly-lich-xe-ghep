"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, History, Search, Users, X } from "lucide-react";
import * as XLSX from "xlsx";
import { ReportTable } from "./report-table";
import { TripInfoCardList } from "@/components/trip-info-card";
import { statusColorClasses } from "@/lib/useTripStatuses";

interface DriverStats {
  id: number;
  fullName: string;
  phone: string | null;
  totalTrips: number;
  completedTrips: number;
  assignedTrips: number;
  unassignedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  totalProfit: number;
  totalPoints: number;
  assignedPointProfit: number;
  completionRate: number;
  cancelRate: number;
  avgTripValue: number;
  avgProfitPerCompletedTrip: number;
  lastAssignedAt: string | null;
  lastCompletedAt: string | null;
  badge: string;
}

interface DriverTripHistoryRow {
  tripId: number;
  title: string;
  route: string;
  createdAt: string;
  departureTime: string;
  lastAssignedAt: string | null;
  status: string;
  statusLabel: string;
  statusColor: string;
  price: number;
  pointsEarned: number;
  profit: number;
  profitRate: number | null;
  formulaId: number | null;
  formulaName: string | null;
}

interface DriverReportTabProps {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  selectedDriver: string;
}

function formatVND(amount: number): string {
  if (amount >= 1000000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(amount / 1000000)}M`;
  }
  return new Intl.NumberFormat("vi-VN").format(amount);
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  startTime,
  endTime,
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
  const [historyDriver, setHistoryDriver] = useState<DriverStats | null>(null);
  const [historyRows, setHistoryRows] = useState<DriverTripHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const pageSize = 20;

  const fetchData = useCallback(
    async (page: number, search: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (startTime) params.set("startTime", startTime);
        if (endTime) params.set("endTime", endTime);
        if (selectedDriver) params.set("driverId", selectedDriver);
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
    [startDate, endDate, startTime, endTime, selectedDriver, sortBy, sortOrder, pagination.limit]
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
        "SĐT": d.phone || "",
        "Tổng cuốc": d.totalTrips,
        "Hoàn thành": d.completedTrips,
        "Đã gán": d.assignedTrips,
        "Chưa gán": d.unassignedTrips,
        "Đã hủy": d.cancelledTrips,
        "Tỷ lệ HT (%)": d.completionRate,
        "Tỷ lệ hủy (%)": d.cancelRate,
        "Điểm": d.totalPoints,
        "Công theo gán (đ)": d.assignedPointProfit,
        "Doanh thu (đ)": d.totalRevenue,
        "Lợi nhuận HT (đ)": d.totalProfit,
        "TB cuốc (đ)": Math.round(d.avgTripValue),
        "TB lợi nhuận HT (đ)": Math.round(d.avgProfitPerCompletedTrip),
        "Gán gần nhất": formatDateTime(d.lastAssignedAt),
        "Hoàn thành gần nhất": formatDateTime(d.lastCompletedAt),
        "Hạng": d.badge,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tài xế");
    XLSX.writeFile(wb, `bao-cao-tai-xe-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const openHistory = async (driver: DriverStats) => {
    setHistoryDriver(driver);
    setHistoryLoading(true);
    setHistoryRows([]);
    setHistoryError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (startTime) params.set("startTime", startTime);
      if (endTime) params.set("endTime", endTime);
      params.set("limit", "100");
      const res = await fetch(`/api/reports/drivers/${driver.id}/trips?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không tải được lịch sử cuốc");
      }
      setHistoryRows(json.data || []);
    } catch (err) {
      console.error("Failed to fetch driver trip history:", err);
      setHistoryError(
        err instanceof Error ? err.message : "Không tải được lịch sử cuốc"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = [
    {
      key: "name",
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
      render: (item: DriverStats) => <span className="font-semibold">{item.totalTrips}</span>,
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
      key: "assignedTrips",
      label: "Đã gán",
      sortable: false,
      render: (item: DriverStats) => (
        <span className="text-sky-600 font-medium">{item.assignedTrips}</span>
      ),
      className: "text-center",
    },
    {
      key: "unassignedTrips",
      label: "Chưa gán",
      sortable: false,
      render: (item: DriverStats) => (
        <span className="text-orange-500">{item.unassignedTrips}</span>
      ),
      className: "text-center",
    },
    {
      key: "completionRate",
      label: "Tỷ lệ HT",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="font-medium text-green-600">{formatPercent(item.completionRate)}</span>
      ),
      className: "text-center",
    },
    {
      key: "cancelRate",
      label: "Tỷ lệ hủy",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="font-medium text-rose-600">{formatPercent(item.cancelRate)}</span>
      ),
      className: "text-center",
    },
    {
      key: "totalPoints",
      label: "Điểm",
      sortable: false,
      render: (item: DriverStats) => (
        <span className="font-semibold text-amber-600">
          {item.totalPoints.toLocaleString("vi-VN")}
        </span>
      ),
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
      label: "LN HT",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="text-blue-600 font-medium">{formatVND(item.totalProfit)}</span>
      ),
    },
    {
      key: "assignedPointProfit",
      label: "Công theo gán",
      sortable: false,
      render: (item: DriverStats) => (
        <span className="text-amber-700 font-semibold">
          {formatVND(item.assignedPointProfit)}
        </span>
      ),
    },
    {
      key: "avgProfitPerCompletedTrip",
      label: "TB LN HT",
      sortable: false,
      render: (item: DriverStats) => (
        <span className="text-blue-600 font-medium">
          {formatVND(item.avgProfitPerCompletedTrip)}
        </span>
      ),
    },
    {
      key: "lastAssignedAt",
      label: "Gán gần nhất",
      sortable: true,
      render: (item: DriverStats) => (
        <span className="text-slate-500 whitespace-nowrap">
          {formatDateTime(item.lastAssignedAt)}
        </span>
      ),
    },
    {
      key: "lastCompletedAt",
      label: "Hoàn thành gần nhất",
      sortable: false,
      render: (item: DriverStats) => (
        <span className="text-slate-500 whitespace-nowrap">
          {formatDateTime(item.lastCompletedAt)}
        </span>
      ),
    },
    {
      key: "history",
      label: "Đối chiếu",
      sortable: false,
      render: (item: DriverStats) => (
        <button
          type="button"
          onClick={() => openHistory(item)}
          aria-label={`Xem lịch sử cuốc của ${item.fullName}`}
          className="inline-flex min-h-8 items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <History className="w-3.5 h-3.5" />
          Cuốc
        </button>
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
      { label: "Đã hủy", value: String(item.cancelledTrips), color: "text-rose-600" },
    ],
    [
      { label: "Doanh thu", value: formatVND(item.totalRevenue), color: "text-slate-800" },
      { label: "LN HT", value: formatVND(item.totalProfit), color: "text-blue-600" },
      { label: "Điểm", value: item.totalPoints.toLocaleString("vi-VN"), color: "text-amber-600" },
    ],
    [
      { label: "Công theo gán", value: formatVND(item.assignedPointProfit), color: "text-amber-700" },
      { label: "Tỷ lệ HT", value: formatPercent(item.completionRate), color: "text-green-600" },
      { label: "Tỷ lệ hủy", value: formatPercent(item.cancelRate), color: "text-rose-600" },
    ],
    [
      { label: "Gán gần nhất", value: formatDateTime(item.lastAssignedAt), color: "text-slate-600" },
    ],
  ];

  return (
    <div className="space-y-3">
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
        cardAction={(item: DriverStats) => (
          <button
            type="button"
            onClick={() => openHistory(item)}
            aria-label={`Xem lịch sử cuốc của ${item.fullName}`}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <History className="h-3.5 w-3.5" />
            Cuốc
          </button>
        )}
      />

      {historyDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 lg:p-8 flex items-end lg:items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl h-[70vh] lg:h-[75vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 flex-shrink-0">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  Lịch sử cuốc: {historyDriver.fullName}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Điểm/công được đối chiếu theo thời điểm gán tài xế cuối cùng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDriver(null)}
                aria-label="Đóng lịch sử cuốc"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-3 pb-[72px]" style={{ WebkitOverflowScrolling: "touch" }}>
              <style>{`
                .touch-pan-y::-webkit-scrollbar {
                  width: 4px;
                  height: 4px;
                }
                .touch-pan-y::-webkit-scrollbar-track {
                  background: transparent;
                }
                .touch-pan-y::-webkit-scrollbar-thumb {
                  background: #cbd5e1;
                  border-radius: 999px;
                }
                .touch-pan-y::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
              `}</style>
              {historyLoading ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Đang tải lịch sử cuốc...
                </div>
              ) : historyError ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  <p className="font-medium text-rose-600">{historyError}</p>
                  <button
                    type="button"
                    onClick={() => openHistory(historyDriver)}
                    className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Thử tải lại
                  </button>
                </div>
              ) : historyRows.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Chưa có cuốc nào trong kỳ để đối chiếu
                </div>
              ) : (
                <TripInfoCardList
                  trips={historyRows.map((row) => {
                    const statusColor = statusColorClasses(row.statusColor || "slate");
                    return {
                      id: row.tripId,
                      departure: row.route.split(" → ")[0] || "",
                      destination: row.route.split(" → ")[1] || row.route,
                      status: row.status,
                      statusLabel: row.statusLabel || row.status,
                      statusColor: row.statusColor || "slate",
                      pointsEarned: row.pointsEarned,
                      profit: row.profit,
                      profitRate: row.profitRate,
                      matchedFormulaId: row.formulaId,
                      matchedFormulaName: row.formulaName,
                      createdAt: row.createdAt,
                      assignedAt: row.lastAssignedAt,
                      departureTime: row.departureTime,
                    };
                  })}
                  className="max-w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
