"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  Download,
  Car,
  Users,
  DollarSign,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Phone,
  MessageCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Sidebar, Header, BottomNav } from "@/components/dashboard";

interface Trip {
  id: number;
  departure: string;
  destination: string;
  departureTime: string;
  status: string;
  price: number;
  pointsEarned?: number | null;
  profit?: number | null;
  notes?: string;
  driver?: {
    id: number;
    fullName: string;
    phone?: string | null;
  };
  customers: Array<{
    customer: {
      id: number;
      name: string;
      phone: string;
    };
    seats?: number;
    status?: string;
  }>;
}

interface Driver {
  id: number;
  fullName: string;
}

type DateFilter = "all" | "today" | "week" | "month" | "custom";

interface Stats {
  totalRevenue: number;
  totalTrips: number;
  uniqueCustomers: number;
  avgTripValue: number;
  completedTrips: number;
  completedRevenue: number;
  completedProfit: number;
  forecastRevenue: number;
  forecastProfit: number;
  unassignedTrips: number;
  assignedNotCompleted: number;
  revenueChange: number;
  tripsChange: number;
}

interface CustomerSummary {
  id: number;
  name: string;
  phone: string;
  totalTrips: number;
  totalRevenue: number;
  totalProfit: number;
  lastTripDate: string;
}

export default function ReportsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Draft filters (so người dùng chọn xong mới nhấn "Áp dụng" để fetch lại)
  const [draftDateFilter, setDraftDateFilter] = useState<DateFilter>("all");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftSelectedDriver, setDraftSelectedDriver] = useState("");
  const [draftStatusFilter, setDraftStatusFilter] = useState<string>("all");

  const [activeTab, setActiveTab] = useState<"overview" | "details">("overview");
  const [tripSearchDraft, setTripSearchDraft] = useState("");
  const [tripSearchApplied, setTripSearchApplied] = useState("");

  const [customerSearchDraft, setCustomerSearchDraft] = useState("");
  const [customerSearchApplied, setCustomerSearchApplied] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const customerExportRef = useRef<HTMLButtonElement | null>(null);

  const tripsPageSize = 10;
  const customersPageSize = 8;
  const [tripPage, setTripPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);

  // Customer detail modal: xem tất cả cuốc xe của 1 khách (có phân trang + tìm kiếm/bộ lọc)
  const [customerTripsModalOpen, setCustomerTripsModalOpen] = useState(false);
  const [selectedCustomerForTrips, setSelectedCustomerForTrips] = useState<CustomerSummary | null>(null);
  const [customerTripSearchDraft, setCustomerTripSearchDraft] = useState("");
  const [customerTripSearchApplied, setCustomerTripSearchApplied] = useState("");
  const [customerTripStatusFilter, setCustomerTripStatusFilter] = useState<string>("all");
  const [customerTripPage, setCustomerTripPage] = useState(1);
  const customerTripsPageSize = 8;

  const topListPageSize = 6;
  const [topDriversPage, setTopDriversPage] = useState(1);
  const [topRoutesPage, setTopRoutesPage] = useState(1);

  const draftDateRangeInvalid =
    Boolean(draftStartDate && draftEndDate) && draftStartDate > draftEndDate;

  const isDraftDirty =
    draftDateFilter !== dateFilter ||
    draftStartDate !== startDate ||
    draftEndDate !== endDate ||
    draftSelectedDriver !== selectedDriver ||
    draftStatusFilter !== statusFilter;

  const dateFilterForButtons = filtersOpen ? draftDateFilter : dateFilter;

  const applyDraftFilters = () => {
    if (draftDateRangeInvalid) return;
    setDateFilter(draftDateFilter);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setSelectedDriver(draftSelectedDriver);
    setStatusFilter(draftStatusFilter);
  };

  const clearAllFilters = () => {
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
    setSelectedDriver("");
    setStatusFilter("all");

    setDraftDateFilter("all");
    setDraftStartDate("");
    setDraftEndDate("");
    setDraftSelectedDriver("");
    setDraftStatusFilter("all");
  };

  const openCustomerTripsModal = (customer: CustomerSummary) => {
    setSelectedCustomerForTrips(customer);
    setCustomerTripSearchDraft("");
    setCustomerTripSearchApplied("");
    setCustomerTripStatusFilter("all");
    setCustomerTripPage(1);
    setCustomerTripsModalOpen(true);
  };

  const closeCustomerTripsModal = () => {
    setCustomerTripsModalOpen(false);
  };

  const selectedDriverName = useMemo(() => {
    if (!selectedDriver) return "";
    const idNum = Number(selectedDriver);
    return drivers.find((d) => d.id === idNum)?.fullName ?? "";
  }, [drivers, selectedDriver]);

  // Quick filter buttons
  const handleQuickFilter = (filter: DateFilter) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    let nextStart = "";
    let nextEnd = "";

    if (filter === "today") {
      nextStart = todayStr;
      nextEnd = todayStr;
    } else if (filter === "week") {
      const weekStart = new Date(today);
      // Sunday -> Monday logic: trừ đi số ngày để về đầu tuần
      weekStart.setDate(today.getDate() - today.getDay());
      nextStart = weekStart.toISOString().split("T")[0];
      nextEnd = todayStr;
    } else if (filter === "month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      nextStart = monthStart.toISOString().split("T")[0];
      nextEnd = todayStr;
    } else if (filter === "all") {
      nextStart = "";
      nextEnd = "";
    }

    // Quick filter = áp dụng ngay
    setDateFilter(filter);
    setStartDate(nextStart);
    setEndDate(nextEnd);

    setDraftDateFilter(filter);
    setDraftStartDate(nextStart);
    setDraftEndDate(nextEnd);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const baseParams = new URLSearchParams();
      if (selectedDriver) baseParams.set("driverId", selectedDriver);
      if (statusFilter && statusFilter !== "all") baseParams.set("status", statusFilter);

      const currentParams = new URLSearchParams(baseParams);
      if (startDate) currentParams.set("startDate", startDate);
      if (endDate) currentParams.set("endDate", endDate);

      const tripsQuery = currentParams.toString();
      const allTripsQuery = baseParams.toString();

      const [tripsRes, allTripsRes, driversRes] = await Promise.all([
        fetch(`/api/trips?${tripsQuery ? `${tripsQuery}&` : ""}limit=500`),
        // All trips (không giới hạn theo start/end) để tính so sánh "kỳ trước" chính xác hơn theo driver/status
        fetch(`/api/trips?${allTripsQuery ? `${allTripsQuery}&` : ""}limit=5000`),
        fetch("/api/drivers"),
      ]);

      const [tripsData, allTripsData, driversData] = await Promise.all([
        tripsRes.json(),
        allTripsRes.json(),
        driversRes.json(),
      ]);

      if (tripsData.success) setTrips(tripsData.data);
      if (allTripsData.success) setAllTrips(allTripsData.data);
      if (driversData.success) setDrivers(driversData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedDriver, statusFilter]);

  useEffect(() => {
    // Mặc định mở lọc trên màn hình lớn, đóng trên mobile để gọn hơn
    setFiltersOpen(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  }, []);

  useEffect(() => {
    setTripPage(1);
  }, [startDate, endDate, selectedDriver, statusFilter, tripSearchApplied]);

  useEffect(() => {
    setCustomerPage(1);
  }, [startDate, endDate, selectedDriver, statusFilter, tripSearchApplied, customerSearchApplied]);

  useEffect(() => {
    setCustomerTripPage(1);
  }, [
    customerTripSearchApplied,
    customerTripStatusFilter,
    selectedCustomerForTrips,
    customerTripsModalOpen,
  ]);

  useEffect(() => {
    setTopDriversPage(1);
    setTopRoutesPage(1);
  }, [startDate, endDate, selectedDriver, statusFilter]);

  // Computed stats for filtered data
  const stats: Stats = useMemo(() => {
    const completedTrips = trips.filter((t) => t.status === "completed");
    const assignedNotCompleted = trips.filter(
      (t) => t.driver && t.status !== "completed" && t.status !== "cancelled"
    );
    const unassignedTrips = trips.filter(
      (t) => !t.driver && t.status !== "cancelled"
    );

    const totalRevenue = completedTrips.reduce((sum, t) => {
      const price = Number(t.price) || 0;
      return sum + (price > 0 && price < 100000000 ? price : 0);
    }, 0);

    const completedProfit = completedTrips.reduce((sum, t) => {
      const p = Number(t.profit ?? 0);
      return sum + (p > 0 && p < 100000000 ? p : 0);
    }, 0);

    const forecastRevenue = assignedNotCompleted.reduce((sum, t) => {
      const price = Number(t.price) || 0;
      return sum + (price > 0 && price < 100000000 ? price : 0);
    }, 0);

    const forecastProfit = assignedNotCompleted.reduce((sum, t) => {
      const p = Number(t.profit ?? 0);
      return sum + (p > 0 && p < 100000000 ? p : 0);
    }, 0);

    const totalTrips = trips.length;
    const uniqueCustomers = new Set(
      trips
        .flatMap((t) => (t.customers || []).map((c) => c.customer?.id))
        .filter(Boolean)
    ).size;
    const avgTripValue =
      completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;

    // Calculate previous period for comparison
    let prevPeriodRevenue = 0;
    let prevPeriodTrips = 0;

    if (startDate && endDate) {
      const daysDiff = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - daysDiff - 1);
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const prevTrips = allTrips.filter((t) => {
        const tripDate = new Date(t.departureTime);
        return tripDate >= prevStart && tripDate <= prevEnd;
      });

      prevPeriodRevenue = prevTrips
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + (t.price || 0), 0);
      prevPeriodTrips = prevTrips.length;
    }

    const revenueChange =
      prevPeriodRevenue > 0
        ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
        : 0;
    const tripsChange =
      prevPeriodTrips > 0
        ? ((totalTrips - prevPeriodTrips) / prevPeriodTrips) * 100
        : 0;

    return {
      totalRevenue,
      totalTrips,
      uniqueCustomers,
      avgTripValue,
      completedTrips: completedTrips.length,
      completedRevenue: totalRevenue,
      completedProfit,
      forecastRevenue,
      forecastProfit,
      unassignedTrips: unassignedTrips.length,
      assignedNotCompleted: assignedNotCompleted.length,
      revenueChange,
      tripsChange,
    };
  }, [trips, allTrips, startDate, endDate]);

  const safeMoney = (val: unknown) => {
    const num = Number(val ?? 0);
    // Giữ logic tương tự phần KPI để loại giá/profit bất thường
    return num > 0 && num < 100000000 ? num : 0;
  };

  type TrendPoint = {
    bucketTs: number;
    label: string;
    completedRevenue: number;
    forecastRevenue: number;
    completedProfit: number;
  };

  const revenueTrend = useMemo<TrendPoint[]>(() => {
    if (trips.length === 0) return [];

    const pricesOk = (t: Trip) => safeMoney(t.price);
    const profitOk = (t: Trip) => safeMoney(t.profit);

    const tripDates = trips.map((t) => new Date(t.departureTime).getTime()).filter(Boolean);
    const minTs = Math.min(...tripDates);
    const maxTs = Math.max(...tripDates);

    const rangeStart = startDate ? new Date(startDate).getTime() : minTs;
    const rangeEnd = endDate ? new Date(endDate).getTime() : maxTs;

    const diffDays = Math.ceil(Math.abs(rangeEnd - rangeStart) / (1000 * 60 * 60 * 24));

    let unit: "day" | "week" | "month" = "day";
    if (diffDays > 120) unit = "month";
    else if (diffDays > 45) unit = "week";

    const toDayTs = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    };

    const startOfWeekMon = (d: Date) => {
      const x = new Date(d);
      const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
      x.setDate(x.getDate() - day);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const toMonthTs = (d: Date) => {
      const x = new Date(d);
      x.setDate(1);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    };

    const formatLabel = (bucketDateTs: number) => {
      const d = new Date(bucketDateTs);
      if (unit === "day") {
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      }
      if (unit === "week") {
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      }
      return d.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });
    };

    const map = new Map<string, TrendPoint>();

    trips.forEach((t) => {
      const d = new Date(t.departureTime);
      const bucketDate =
        unit === "day" ? toDayTs(d) : unit === "week" ? startOfWeekMon(d).getTime() : toMonthTs(d);
      const key =
        unit === "day"
          ? new Date(bucketDate).toISOString().slice(0, 10)
          : unit === "week"
            ? new Date(bucketDate).toISOString().slice(0, 10)
            : `${new Date(bucketDate).getFullYear()}-${String(new Date(bucketDate).getMonth() + 1).padStart(2, "0")}`;

      const existing = map.get(key) ?? {
        bucketTs: bucketDate,
        label: formatLabel(bucketDate),
        completedRevenue: 0,
        forecastRevenue: 0,
        completedProfit: 0,
      };

      const isCompleted = t.status === "completed";
      const isCancelled = t.status === "cancelled";
      const isForecast = Boolean(t.driver) && !isCompleted && !isCancelled;

      if (isCompleted) {
        existing.completedRevenue += pricesOk(t);
        existing.completedProfit += profitOk(t);
      } else if (isForecast) {
        existing.forecastRevenue += pricesOk(t);
      }

      map.set(key, existing);
    });

    const points = Array.from(map.values()).sort((a, b) => a.bucketTs - b.bucketTs);

    const maxBuckets = 12;
    if (points.length <= maxBuckets) return points;

    const step = Math.ceil(points.length / maxBuckets);
    const merged: TrendPoint[] = [];
    for (let i = 0; i < points.length; i += step) {
      const chunk = points.slice(i, i + step);
      if (chunk.length === 0) continue;

      const bucketTs = chunk[0].bucketTs;
      merged.push({
        bucketTs,
        label: chunk[0].label,
        completedRevenue: chunk.reduce((s, p) => s + p.completedRevenue, 0),
        forecastRevenue: chunk.reduce((s, p) => s + p.forecastRevenue, 0),
        completedProfit: chunk.reduce((s, p) => s + p.completedProfit, 0),
      });
    }

    return merged;
  }, [trips, startDate, endDate]);

  const statusCounts = useMemo(() => {
    const base = {
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    } as Record<"scheduled" | "in_progress" | "completed" | "cancelled", number>;

    trips.forEach((t) => {
      if (t.status in base) base[t.status as keyof typeof base] += 1;
    });

    return base;
  }, [trips]);

  type TopItem = {
    key: string;
    label: string;
    totalTrips: number;
    completedTrips: number;
    completedRevenue: number;
  };

  const topDrivers = useMemo<TopItem[]>(() => {
    const map = new Map<string, TopItem>();

    trips.forEach((t) => {
      const label = t.driver?.fullName || "Chưa gán";
      const key = label;
      const existing =
        map.get(key) ??
        ({
          key,
          label,
          totalTrips: 0,
          completedTrips: 0,
          completedRevenue: 0,
        } satisfies TopItem);

      existing.totalTrips += 1;
      if (t.status === "completed") {
        existing.completedTrips += 1;
        existing.completedRevenue += safeMoney(t.price);
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.completedRevenue !== a.completedRevenue) return b.completedRevenue - a.completedRevenue;
      return b.completedTrips - a.completedTrips;
    });
  }, [trips]);

  const topRoutes = useMemo<TopItem[]>(() => {
    const map = new Map<string, TopItem>();

    trips.forEach((t) => {
      const label = `${t.departure} → ${t.destination}`;
      const key = label;
      const existing =
        map.get(key) ??
        ({
          key,
          label,
          totalTrips: 0,
          completedTrips: 0,
          completedRevenue: 0,
        } satisfies TopItem);

      existing.totalTrips += 1;
      if (t.status === "completed") {
        existing.completedTrips += 1;
        existing.completedRevenue += safeMoney(t.price);
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.completedRevenue !== a.completedRevenue) return b.completedRevenue - a.completedRevenue;
      return b.completedTrips - a.completedTrips;
    });
  }, [trips]);

  const topDriversTotalPages = Math.max(1, Math.ceil(topDrivers.length / topListPageSize));
  const effectiveTopDriversPage = Math.min(Math.max(1, topDriversPage), topDriversTotalPages);
  const pagedTopDrivers = topDrivers.slice(
    (effectiveTopDriversPage - 1) * topListPageSize,
    effectiveTopDriversPage * topListPageSize
  );

  const topRoutesTotalPages = Math.max(1, Math.ceil(topRoutes.length / topListPageSize));
  const effectiveTopRoutesPage = Math.min(Math.max(1, topRoutesPage), topRoutesTotalPages);
  const pagedTopRoutes = topRoutes.slice(
    (effectiveTopRoutesPage - 1) * topListPageSize,
    effectiveTopRoutesPage * topListPageSize
  );

  const visibleTrips = useMemo(() => {
    const q = tripSearchApplied.trim().toLowerCase();
    if (!q) return trips;

    return trips.filter((t) => {
      const firstCustomer = t.customers?.[0]?.customer;
      const haystack = [
        String(t.id),
        t.departure,
        t.destination,
        t.driver?.fullName ?? "",
        t.status,
        firstCustomer?.name ?? "",
        firstCustomer?.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [trips, tripSearchApplied]);

  const customerTripsVisible = useMemo(() => {
    if (!selectedCustomerForTrips) return [];

    const customerId = selectedCustomerForTrips.id;
    let list = trips.filter((t) => (t.customers || []).some((tc) => tc.customer?.id === customerId));

    if (customerTripStatusFilter !== "all") {
      list = list.filter((t) => t.status === customerTripStatusFilter);
    }

    const q = customerTripSearchApplied.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const firstCustomer = t.customers?.[0]?.customer;
        const haystack = [
          String(t.id),
          t.departure,
          t.destination,
          t.driver?.fullName ?? "",
          t.status,
          firstCustomer?.name ?? "",
          firstCustomer?.phone ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    // Newest first for better “xem chi tiết” UX
    return [...list].sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());
  }, [selectedCustomerForTrips, trips, customerTripSearchApplied, customerTripStatusFilter]);

  const customerTripsTotalPages = Math.max(
    1,
    Math.ceil(customerTripsVisible.length / customerTripsPageSize)
  );
  const effectiveCustomerTripsPage = Math.min(
    Math.max(1, customerTripPage),
    customerTripsTotalPages
  );
  const pagedCustomerTrips = useMemo(() => {
    const startIdx = (effectiveCustomerTripsPage - 1) * customerTripsPageSize;
    return customerTripsVisible.slice(startIdx, startIdx + customerTripsPageSize);
  }, [customerTripsVisible, effectiveCustomerTripsPage]);

  const tripTotalPages = Math.max(1, Math.ceil(visibleTrips.length / tripsPageSize));
  const effectiveTripPage = Math.min(Math.max(1, tripPage), tripTotalPages);
  const pagedTrips = useMemo(() => {
    const startIdx = (effectiveTripPage - 1) * tripsPageSize;
    return visibleTrips.slice(startIdx, startIdx + tripsPageSize);
  }, [visibleTrips, effectiveTripPage]);

  const tripPageMaxButtons = 5;
  const tripPageStart = Math.max(
    1,
    effectiveTripPage - Math.floor(tripPageMaxButtons / 2)
  );
  const tripPageEnd = Math.min(tripTotalPages, tripPageStart + tripPageMaxButtons - 1);
  const tripPageStartAdj = Math.max(1, tripPageEnd - tripPageMaxButtons + 1);
  const tripPageNumbers = Array.from(
    { length: tripPageEnd - tripPageStartAdj + 1 },
    (_, i) => tripPageStartAdj + i
  );

  const customerSummaries = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();

    trips.forEach((trip) => {
      const tripDate = new Date(trip.departureTime);
      const price = Number(trip.price) || 0;
      const profit = Number(trip.profit ?? 0) || 0;

      (trip.customers || []).forEach((tc) => {
        if (!tc.customer) return;
        const key = `${tc.customer.phone}-${tc.customer.name}`;
        const existing = map.get(key);

        if (!existing) {
          map.set(key, {
            id: tc.customer.id,
            name: tc.customer.name,
            phone: tc.customer.phone,
            totalTrips: 1,
            totalRevenue: price,
            totalProfit: profit,
            lastTripDate: tripDate.toISOString(),
          });
        } else {
          existing.totalTrips += 1;
          existing.totalRevenue += price;
          existing.totalProfit += profit;
          if (tripDate > new Date(existing.lastTripDate)) {
            existing.lastTripDate = tripDate.toISOString();
          }
        }
      });
    });

    let result = Array.from(map.values());

    if (customerSearchApplied.trim()) {
      const q = customerSearchApplied.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return result;
  }, [trips, customerSearchApplied]);

  const customerTotalPages = Math.max(
    1,
    Math.ceil(customerSummaries.length / customersPageSize)
  );
  const effectiveCustomerPage = Math.min(
    Math.max(1, customerPage),
    customerTotalPages
  );
  const pagedCustomerSummaries = useMemo(() => {
    const startIdx = (effectiveCustomerPage - 1) * customersPageSize;
    return customerSummaries.slice(
      startIdx,
      startIdx + customersPageSize
    );
  }, [customerSummaries, effectiveCustomerPage]);

  const customerPageMaxButtons = 5;
  const customerPageStart = Math.max(
    1,
    effectiveCustomerPage - Math.floor(customerPageMaxButtons / 2)
  );
  const customerPageEnd = Math.min(
    customerTotalPages,
    customerPageStart + customerPageMaxButtons - 1
  );
  const customerPageStartAdj = Math.max(1, customerPageEnd - customerPageMaxButtons + 1);
  const customerPageNumbers = Array.from(
    { length: customerPageEnd - customerPageStartAdj + 1 },
    (_, i) => customerPageStartAdj + i
  );

  // Export to Excel
  const handleExport = () => {
    const exportData = trips.map((trip) => ({
      "Mã cuốc": trip.id,
      "Ngày đón": new Date(trip.departureTime).toLocaleDateString("vi-VN"),
      "Giờ đón": new Date(trip.departureTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      "Điểm đi": trip.departure,
      "Điểm đến": trip.destination,
      "Zom": trip.driver?.fullName || "Chưa gán",
      "Giá tiền": trip.price || 0,
      "Trạng thái": trip.status === "completed" ? "Hoàn thành" : trip.status === "in_progress" ? "Đang chạy" : trip.status === "scheduled" ? "Chờ" : "Hủy",
      "Khách hàng": trip.customers?.[0]?.customer?.name || "-",
      "SĐT khách": trip.customers?.[0]?.customer?.phone || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao cao");
    
    ws["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 8 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
    ];

    const fileName = `bao-cao-${startDate || "all"}-${endDate || "all"}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Hoàn thành</span>;
      case "in_progress":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Đang chạy</span>;
      case "scheduled":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Chờ</span>;
      case "cancelled":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Hủy</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const formatDateTimeShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const handleExportCustomersDetail = () => {
    if (trips.length === 0) return;

    const rows: any[] = [];

    trips.forEach((trip) => {
      (trip.customers || []).forEach((tc) => {
        if (!tc.customer) return;
        rows.push({
          "Tên khách": tc.customer.name,
          "SĐT khách": tc.customer.phone,
          "Mã cuốc": trip.id,
          "Ngày đón": new Date(trip.departureTime).toLocaleDateString(
            "vi-VN"
          ),
          "Giờ đón": new Date(trip.departureTime).toLocaleTimeString(
            "vi-VN",
            { hour: "2-digit", minute: "2-digit" }
          ),
          "Điểm đi": trip.departure,
          "Điểm đến": trip.destination,
          "Zom": trip.driver?.fullName || "Chưa gán",
          "Giá tiền": trip.price || 0,
          "Lợi nhuận": trip.profit || 0,
          "Trạng thái":
            trip.status === "completed"
              ? "Hoàn thành"
              : trip.status === "in_progress"
              ? "Đang chạy"
              : trip.status === "scheduled"
              ? "Chờ"
              : trip.status === "cancelled"
              ? "Hủy"
              : trip.status,
        });
      });
    });

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Khach hang");

    const fileName = `khach-hang-chi-tiet-${startDate || "all"}-${
      endDate || "all"
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar>
        <Header />
        <div className="p-4 lg:p-6 pb-24 lg:pb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Báo cáo tổng hợp</h1>
              <p className="text-xs text-slate-500 mt-1">
                Doanh thu, lợi nhuận và khách hàng lấy trực tiếp từ dữ liệu lịch trình.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportCustomersDetail}
                disabled={trips.length === 0}
                ref={customerExportRef}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 border border-amber-200"
              >
                <Users className="w-4 h-4" />
                Xuất khách hàng chi tiết
              </button>
              <button
                onClick={handleExport}
                disabled={trips.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Xuất cuốc xe</span>
                <span className="sm:hidden">Xuất</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === "details"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Chi tiết
            </button>
          </div>

          {/* Quick Date Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <button
              onClick={() => handleQuickFilter("today")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilterForButtons === "today" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => handleQuickFilter("week")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilterForButtons === "week" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tuần này
            </button>
            <button
              onClick={() => handleQuickFilter("month")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilterForButtons === "month" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => handleQuickFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilterForButtons === "all" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => handleQuickFilter("custom")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                dateFilterForButtons === "custom" 
                  ? "bg-blue-600 text-white" 
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tùy chọn
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Bộ lọc chi tiết</span>
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    filtersOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
                {filtersOpen ? "Thu gọn" : "Mở rộng"}
              </button>
            </div>

            {filtersOpen ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Date Range */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Từ ngày</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={draftStartDate}
                        onChange={(e) => {
                          setDraftStartDate(e.target.value);
                          setDraftDateFilter("custom");
                        }}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Đến ngày</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={draftEndDate}
                        onChange={(e) => {
                          setDraftEndDate(e.target.value);
                          setDraftDateFilter("custom");
                        }}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* Driver Filter */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Zom</label>
                    <div className="relative">
                      <select
                        value={draftSelectedDriver}
                        onChange={(e) => setDraftSelectedDriver(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white"
                      >
                        <option value="">Tất cả</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.fullName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Trạng thái cuốc</label>
                    <div className="relative">
                      <select
                        value={draftStatusFilter}
                        onChange={(e) => setDraftStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white"
                      >
                        <option value="all">Tất cả</option>
                        <option value="scheduled">Chờ</option>
                        <option value="in_progress">Đang chạy</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Hủy</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Xóa lọc
                  </button>

                  <div className="flex items-center gap-2">
                    {draftDateRangeInvalid && (
                      <span className="text-xs text-red-600 font-medium">
                        Từ ngày không được lớn hơn đến ngày
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={applyDraftFilters}
                      disabled={!isDraftDirty || draftDateRangeInvalid}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Áp dụng
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {(startDate || endDate) && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {startDate && endDate
                      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                      : startDate
                        ? `Từ ${formatDate(startDate)}`
                        : `Đến ${formatDate(endDate)}`}
                  </span>
                )}

                {selectedDriverName && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    Zom: {selectedDriverName}
                  </span>
                )}

                {statusFilter !== "all" && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    Trạng thái:{" "}
                    {statusFilter === "scheduled"
                      ? "Chờ"
                      : statusFilter === "in_progress"
                        ? "Đang chạy"
                        : statusFilter === "completed"
                          ? "Hoàn thành"
                          : statusFilter === "cancelled"
                            ? "Hủy"
                            : statusFilter}
                  </span>
                )}

                {(!startDate && !endDate && !selectedDriverName && statusFilter === "all") ? (
                  <span className="text-xs text-slate-500">Chưa có bộ lọc</span>
                ) : (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Xóa
                  </button>
                )}
              </div>
            )}
          </div>

          {activeTab === "overview" && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Doanh thu thực tế */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    {stats.revenueChange !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          stats.revenueChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.revenueChange >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(stats.revenueChange).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Doanh thu thực tế</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.completedRevenue)}
                  </p>
                </div>

                {/* Lợi nhuận thực tế */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Lợi nhuận thực tế</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.completedProfit)}
                  </p>
                </div>

                {/* Doanh thu dự kiến */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Doanh thu dự kiến</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.forecastRevenue)}
                  </p>
                </div>

                {/* Lợi nhuận dự kiến */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Lợi nhuận dự kiến</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatCurrency(stats.forecastProfit)}
                  </p>
                </div>
              </div>

              {/* Secondary KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Tổng cuốc */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    {stats.tripsChange !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          stats.tripsChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.tripsChange >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(stats.tripsChange).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Tổng cuốc</p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.totalTrips}
                  </p>
                </div>

                {/* Đã hoàn thành */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Đã hoàn thành</p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.completedTrips}
                  </p>
                </div>

                {/* Chưa gán Zom */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Chưa gán Zom</p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.unassignedTrips}
                  </p>
                </div>

                {/* Đã gán, chưa hoàn thành */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Đã gán, chưa hoàn thành
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.assignedNotCompleted}
                  </p>
                </div>
              </div>

              {/* Charts & Top insights */}
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Xu hướng doanh thu</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hoàn thành vs dự kiến (gán Zom, chưa hoàn thành)
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-600" />
                        Hoàn thành
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Dự kiến
                      </span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
                      Đang tải...
                    </div>
                  ) : revenueTrend.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
                      Không có dữ liệu
                    </div>
                  ) : (
                    (() => {
                      const maxVal = Math.max(
                        1,
                        ...revenueTrend.map((p) =>
                          Math.max(p.completedRevenue, p.forecastRevenue)
                        )
                      );
                      const chartH = 150;

                      return (
                        <div className="flex items-end justify-between h-44 gap-2">
                          {revenueTrend.map((p) => {
                            const completedH =
                              p.completedRevenue > 0
                                ? Math.round((p.completedRevenue / maxVal) * chartH)
                                : 0;
                            const forecastH =
                              p.forecastRevenue > 0
                                ? Math.round((p.forecastRevenue / maxVal) * chartH)
                                : 0;

                            return (
                              <div
                                key={p.bucketTs}
                                className="flex flex-col items-center flex-1 min-w-0"
                              >
                                <div className="flex items-end gap-1">
                                  <div
                                    className="w-2 rounded bg-green-600"
                                    style={{ height: completedH }}
                                  />
                                  <div
                                    className="w-2 rounded bg-amber-500"
                                    style={{ height: forecastH }}
                                  />
                                </div>
                                <div className="text-[11px] text-slate-500 mt-2 truncate">
                                  {p.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Lợi nhuận</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Chỉ tính cuốc đã hoàn thành
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-[11px] text-slate-500 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      Lợi nhuận
                    </span>
                  </div>

                  {loading ? (
                    <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
                      Đang tải...
                    </div>
                  ) : revenueTrend.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
                      Không có dữ liệu
                    </div>
                  ) : (
                    (() => {
                      const maxVal = Math.max(
                        1,
                        ...revenueTrend.map((p) => p.completedProfit)
                      );
                      const chartH = 150;

                      return (
                        <div className="flex items-end justify-between h-44 gap-2">
                          {revenueTrend.map((p) => {
                            const h =
                              p.completedProfit > 0
                                ? Math.round((p.completedProfit / maxVal) * chartH)
                                : 0;

                            return (
                              <div
                                key={p.bucketTs}
                                className="flex flex-col items-center flex-1 min-w-0"
                              >
                                <div className="flex items-end gap-1">
                                  <div
                                    className="w-2 rounded bg-emerald-600"
                                    style={{ height: h }}
                                  />
                                </div>
                                <div className="text-[11px] text-slate-500 mt-2 truncate">
                                  {p.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">Cơ cấu trạng thái</p>

                  {loading ? (
                    <div className="mt-4 text-sm text-slate-500">Đang tải...</div>
                  ) : (
                    (() => {
                      const total =
                        statusCounts.scheduled +
                        statusCounts.in_progress +
                        statusCounts.completed +
                        statusCounts.cancelled;

                      const rows: Array<{
                        k: "scheduled" | "in_progress" | "completed" | "cancelled";
                        label: string;
                        color: string;
                      }> = [
                        { k: "scheduled", label: "Chờ", color: "bg-blue-600" },
                        { k: "in_progress", label: "Đang chạy", color: "bg-amber-500" },
                        { k: "completed", label: "Hoàn thành", color: "bg-green-600" },
                        { k: "cancelled", label: "Hủy", color: "bg-slate-400" },
                      ];

                      return (
                        <div className="mt-4 space-y-3">
                          {rows.map((r) => {
                            const count = statusCounts[r.k];
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            return (
                              <div key={r.k}>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs text-slate-700 font-medium">
                                    {r.label}
                                  </span>
                                  <span className="text-xs text-slate-500 whitespace-nowrap">
                                    {count} • {pct.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="mt-2 h-2 bg-slate-100 rounded overflow-hidden">
                                  <div
                                    className={`${r.color} h-2`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Top Zom theo doanh thu</p>
                      <p className="text-xs text-slate-500 mt-1">Thể hiện theo cuốc đã hoàn thành</p>
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      Trang {effectiveTopDriversPage}/{topDriversTotalPages}
                    </div>
                  </div>

                  <div className="mt-3">
                    {loading ? (
                      <div className="py-6 text-center text-slate-500">Đang tải...</div>
                    ) : topDrivers.length === 0 ? (
                      <div className="py-6 text-center text-slate-500">Không có dữ liệu</div>
                    ) : (
                      (() => {
                        const maxVal = Math.max(
                          1,
                          ...topDrivers.map((d) => d.completedRevenue)
                        );
                        return (
                          <div>
                            <div className="divide-y divide-slate-100">
                              {pagedTopDrivers.map((d, idx) => {
                                const rank =
                                  (effectiveTopDriversPage - 1) * topListPageSize + idx + 1;
                                const widthPct =
                                  d.completedRevenue > 0
                                    ? (d.completedRevenue / maxVal) * 100
                                    : 0;

                                return (
                                  <div key={d.key} className="py-3 flex items-center gap-3">
                                    <div className="text-xs font-semibold text-slate-500 w-8">
                                      #{rank}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-800 font-medium truncate">
                                          {d.label}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                                          {formatCurrency(d.completedRevenue)}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                                          <div
                                            className="bg-green-600 h-2"
                                            style={{ width: `${widthPct}%` }}
                                          />
                                        </div>
                                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                          {d.completedTrips}/{d.totalTrips}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                              <button
                                onClick={() =>
                                  setTopDriversPage((p) => Math.max(1, p - 1))
                                }
                                disabled={effectiveTopDriversPage === 1 || loading}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Trang trước"
                              >
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                              </button>
                              <div className="text-xs text-slate-500">
                                {pagedTopDrivers.length} dòng
                              </div>
                              <button
                                onClick={() =>
                                  setTopDriversPage((p) =>
                                    Math.min(topDriversTotalPages, p + 1)
                                  )
                                }
                                disabled={effectiveTopDriversPage === topDriversTotalPages || loading}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Trang sau"
                              >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Top tuyến theo doanh thu</p>
                    <p className="text-xs text-slate-500 mt-1">Điểm đi → Điểm đến</p>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    Trang {effectiveTopRoutesPage}/{topRoutesTotalPages}
                  </div>
                </div>

                <div className="mt-3">
                  {loading ? (
                    <div className="py-6 text-center text-slate-500">Đang tải...</div>
                  ) : topRoutes.length === 0 ? (
                    <div className="py-6 text-center text-slate-500">Không có dữ liệu</div>
                  ) : (
                    (() => {
                      const maxVal = Math.max(
                        1,
                        ...topRoutes.map((d) => d.completedRevenue)
                      );
                      return (
                        <div>
                          <div className="divide-y divide-slate-100">
                            {pagedTopRoutes.map((d, idx) => {
                              const rank =
                                (effectiveTopRoutesPage - 1) * topListPageSize + idx + 1;
                              const widthPct =
                                d.completedRevenue > 0
                                  ? (d.completedRevenue / maxVal) * 100
                                  : 0;

                              return (
                                <div
                                  key={d.key}
                                  className="py-3 flex items-center gap-3"
                                >
                                  <div className="text-xs font-semibold text-slate-500 w-8">
                                    #{rank}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-800 font-medium truncate">
                                        {d.label}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                                        {formatCurrency(d.completedRevenue)}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                                        <div
                                          className="bg-amber-500 h-2"
                                          style={{ width: `${widthPct}%` }}
                                        />
                                      </div>
                                      <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                        {d.completedTrips}/{d.totalTrips}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                            <button
                              onClick={() =>
                                setTopRoutesPage((p) => Math.max(1, p - 1))
                              }
                              disabled={effectiveTopRoutesPage === 1 || loading}
                              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Trang trước"
                            >
                              <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <div className="text-xs text-slate-500">
                              {pagedTopRoutes.length} dòng
                            </div>
                            <button
                              onClick={() =>
                                setTopRoutesPage((p) =>
                                  Math.min(topRoutesTotalPages, p + 1)
                                )
                              }
                              disabled={
                                effectiveTopRoutesPage === topRoutesTotalPages ||
                                loading
                              }
                              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Trang sau"
                            >
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Trip Search */}
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={tripSearchDraft}
                      onChange={(e) => setTripSearchDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setTripSearchApplied(tripSearchDraft);
                          setTripPage(1);
                        }
                      }}
                      placeholder="Tìm theo mã, điểm đi/đến, Zom hoặc khách..."
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTripSearchApplied(tripSearchDraft);
                        setTripPage(1);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      <Search className="w-4 h-4" />
                      Tìm
                    </button>

                    {(tripSearchApplied || tripSearchDraft) && (
                      <button
                        onClick={() => {
                          setTripSearchDraft("");
                          setTripSearchApplied("");
                          setTripPage(1);
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-sm font-medium"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Mobile list */}
                <div className="md:hidden p-3">
                  {loading ? (
                    <div className="py-8 text-center text-slate-500">Đang tải...</div>
                  ) : pagedTrips.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">Không có dữ liệu</div>
                  ) : (
                    <div className="space-y-2">
                      {pagedTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className="bg-white border border-slate-200 rounded-xl p-3 hover:bg-slate-50 cursor-pointer"
                          onClick={() => setSelectedTrip(trip)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">
                                #{trip.id}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {formatDate(trip.departureTime)} - {formatTime(trip.departureTime)}
                              </div>
                            </div>
                            <div>{getStatusBadge(trip.status)}</div>
                          </div>

                          <div className="mt-2">
                            <div className="text-sm font-medium text-slate-800">
                              {trip.departure} → {trip.destination}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Zom: {trip.driver?.fullName || "Chưa gán"}
                            </div>
                            <div className="text-xs text-slate-500">
                              Khách: {trip.customers?.[0]?.customer?.name || "-"}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <span className="text-xs text-slate-500 whitespace-nowrap">
                                Giá: {formatCurrency(trip.price || 0)}
                              </span>
                              {trip.pointsEarned != null ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 whitespace-nowrap">
                                  {trip.pointsEarned}đ
                                </span>
                              ) : null}
                              {trip.profit != null ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">
                                  +{formatCurrency(trip.profit || 0)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
                                  LN —
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Mã
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Ngày/Giờ
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Lộ trình
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Zom
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Khách hàng
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Giá
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Đang tải...
                            </td>
                          </tr>
                        ) : pagedTrips.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Không có dữ liệu
                            </td>
                          </tr>
                        ) : (
                          pagedTrips.map((trip) => (
                            <tr
                              key={trip.id}
                              className="hover:bg-slate-50 cursor-pointer"
                              onClick={() => setSelectedTrip(trip)}
                            >
                              <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                                #{trip.id}
                              </td>
                              <td className="px-3 py-3 text-sm whitespace-nowrap">
                                <div className="text-slate-800">
                                  {formatDate(trip.departureTime)}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {formatTime(trip.departureTime)}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm">
                                <div className="text-slate-800">
                                  {trip.departure}
                                </div>
                                <div className="text-xs text-slate-400">
                                  → {trip.destination}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                                {trip.driver?.fullName || (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                                {trip.customers?.[0]?.customer ? (
                                  <div>
                                    <div className="font-medium">
                                      {trip.customers[0].customer.name}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      {trip.customers[0].customer.phone}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                                {formatCurrency(trip.price || 0)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {getStatusBadge(trip.status)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    Kết quả:{" "}
                    <span className="font-semibold text-slate-800">
                      {visibleTrips.length}
                    </span>{" "}
                    • Trang{" "}
                    <span className="font-semibold text-slate-800">
                      {effectiveTripPage}
                    </span>{" "}
                    / {tripTotalPages}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTripPage((p) => Math.max(1, p - 1))}
                      disabled={loading || effectiveTripPage === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>

                    {tripPageNumbers.map((p) => (
                      <button
                        key={p}
                        onClick={() => setTripPage(p)}
                        disabled={loading}
                        className={`px-2 py-1 rounded-lg border text-sm ${
                          p === effectiveTripPage
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setTripPage((p) => Math.min(tripTotalPages, p + 1))
                      }
                      disabled={loading || effectiveTripPage === tripTotalPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "details" && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Khách hàng (tổng hợp từ cuốc xe)
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Dữ liệu đã áp dụng bộ lọc thời gian, trạng thái và Zom ở trên.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <p className="text-xs text-slate-500">
                      Tổng khách:{" "}
                      <span className="font-semibold text-slate-800">
                        {customerSummaries.length}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Tổng doanh thu thực tế:{" "}
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(
                          customerSummaries.reduce(
                            (sum, c) => sum + c.totalRevenue,
                            0
                          )
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customerSearchDraft}
                      onChange={(e) => setCustomerSearchDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setCustomerSearchApplied(customerSearchDraft);
                          setCustomerPage(1);
                        }
                      }}
                      placeholder="Tìm theo tên hoặc số điện thoại khách hàng..."
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCustomerSearchApplied(customerSearchDraft);
                        setCustomerPage(1);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      <Search className="w-4 h-4" />
                      Tìm
                    </button>

                    {(customerSearchApplied || customerSearchDraft) && (
                      <button
                        onClick={() => {
                          setCustomerSearchDraft("");
                          setCustomerSearchApplied("");
                          setCustomerPage(1);
                        }}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-sm font-medium"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Mobile cards */}
                <div className="md:hidden p-3">
                  {loading ? (
                    <div className="py-8 text-center text-slate-500">Đang tải...</div>
                  ) : pagedCustomerSummaries.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      Không có khách hàng nào trong bộ lọc hiện tại
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pagedCustomerSummaries.map((c) => (
                        <div
                          key={`${c.phone}-${c.id}`}
                          className="bg-white border border-slate-200 rounded-xl p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-800">
                                {c.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {c.phone}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <a
                                  href={`tel:${c.phone}`}
                                  className="p-1 rounded bg-blue-50 hover:bg-blue-100"
                                >
                                  <Phone className="w-3 h-3 text-blue-600" />
                                </a>
                                <a
                                  href={`https://zalo.me/${c.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-blue-50 hover:bg-blue-100"
                                >
                                  <MessageCircle className="w-3 h-3 text-blue-500" />
                                </a>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => openCustomerTripsModal(c)}
                              className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-blue-600 text-white whitespace-nowrap hover:bg-blue-700"
                            >
                              Chi tiết cuốc
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                              Cuốc: <span className="ml-1 font-bold text-slate-800">{c.totalTrips}</span>
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                              DT: <span className="ml-1 font-bold text-emerald-800">{formatCurrency(c.totalRevenue)}</span>
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${
                                c.totalProfit >= 0
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              LN: <span className="ml-1 font-bold">{formatCurrency(c.totalProfit)}</span>
                            </span>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-500">
                            Gần nhất: {formatDateTimeShort(c.lastTripDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Khách hàng
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Số cuốc
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Doanh thu
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Lợi nhuận
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Chuyến gần nhất
                          </th>
                          <th className="text-left px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            Hành động
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Đang tải...
                            </td>
                          </tr>
                        ) : pagedCustomerSummaries.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-8 text-center text-slate-500"
                            >
                              Không có khách hàng nào trong bộ lọc hiện tại
                            </td>
                          </tr>
                        ) : (
                          pagedCustomerSummaries.map((c) => (
                            <tr key={`${c.phone}-${c.id}`}>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                <div className="font-medium">{c.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-500">
                                    {c.phone}
                                  </span>
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="p-1 rounded bg-blue-50 hover:bg-blue-100"
                                  >
                                    <Phone className="w-3 h-3 text-blue-600" />
                                  </a>
                                  <a
                                    href={`https://zalo.me/${c.phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden lg:flex p-1 rounded bg-blue-50 hover:bg-blue-100"
                                  >
                                    <MessageCircle className="w-3 h-3 text-blue-500" />
                                  </a>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                {c.totalTrips}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                                {formatCurrency(c.totalRevenue)}
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                                {formatCurrency(c.totalProfit)}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                                {formatDateTimeShort(c.lastTripDate)}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                <button
                                  type="button"
                                  onClick={() => openCustomerTripsModal(c)}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Chi tiết cuốc
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    Kết quả:{" "}
                    <span className="font-semibold text-slate-800">
                      {customerSummaries.length}
                    </span>{" "}
                    • Trang{" "}
                    <span className="font-semibold text-slate-800">
                      {effectiveCustomerPage}
                    </span>{" "}
                    / {customerTotalPages}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCustomerPage((p) => Math.max(1, p - 1))
                      }
                      disabled={loading || effectiveCustomerPage === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>

                    {customerPageNumbers.map((p) => (
                      <button
                        key={p}
                        onClick={() => setCustomerPage(p)}
                        disabled={loading}
                        className={`px-2 py-1 rounded-lg border text-sm ${
                          p === effectiveCustomerPage
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setCustomerPage((p) => Math.min(customerTotalPages, p + 1))
                      }
                      disabled={loading || effectiveCustomerPage === customerTotalPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Sidebar>
      <BottomNav />

      {/* Trip Detail Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedTrip(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-semibold text-slate-800">Chi tiết chuyến #{selectedTrip.id}</h2>
              <button
                onClick={() => setSelectedTrip(null)}
                className="p-2 -mr-2 text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Date & Time */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Thời gian</p>
                <p className="font-medium text-slate-800">
                  {formatDate(selectedTrip.departureTime)} - {formatTime(selectedTrip.departureTime)}
                </p>
              </div>

              {/* Route */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2">Lộ trình</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-slate-800">{selectedTrip.departure}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-slate-800">{selectedTrip.destination}</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Giá tiền</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(selectedTrip.price || 0)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selectedTrip.pointsEarned != null ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                      {selectedTrip.pointsEarned}đ
                    </span>
                  ) : null}
                  {selectedTrip.profit != null ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      +{formatCurrency(selectedTrip.profit || 0)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                      LN —
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Trạng thái</p>
                {getStatusBadge(selectedTrip.status)}
              </div>

              {/* Notes */}
              {/* Notes */}
              {selectedTrip.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Ghi chú</p>
                  <p className="text-sm text-slate-800">{selectedTrip.notes}</p>
                </div>
              )}

              {/* Driver */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Zom</p>
                {selectedTrip.driver ? (
                  <div>
                    <p className="font-medium text-slate-800">{selectedTrip.driver.fullName}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">Chưa gán</p>
                )}
              </div>

              {/* Customers */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2">Khách hàng ({selectedTrip.customers?.length || 0})</p>
                {selectedTrip.customers && selectedTrip.customers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTrip.customers.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                        <div>
                          <p className="font-medium text-slate-800">{c.customer.name}</p>
                          <p className="text-sm text-slate-500">{c.customer.phone}</p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${c.customer.phone}`}
                            className="p-2 rounded-lg bg-blue-600 text-white"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://zalo.me/${c.customer.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden lg:flex p-2 rounded-lg bg-blue-50 text-blue-600"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">Chưa có khách</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
