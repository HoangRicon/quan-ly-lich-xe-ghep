import { useEffect, useMemo, useState } from "react";

export type TripStatusDto = {
  id: number;
  key: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

const FALLBACK: TripStatusDto[] = [
  { id: -1, key: "scheduled", label: "Chờ gán", color: "amber", sortOrder: 1, isActive: true },
  { id: -2, key: "confirmed", label: "Đã gán", color: "blue", sortOrder: 2, isActive: true },
  { id: -3, key: "running", label: "Đang đi", color: "green", sortOrder: 3, isActive: true },
  { id: -4, key: "completed", label: "Hoàn thành", color: "slate", sortOrder: 4, isActive: true },
  { id: -5, key: "cancelled", label: "Đã hủy", color: "red", sortOrder: 5, isActive: true },
];

export function statusColorClasses(color: string) {
  const c = (color || "slate").toLowerCase();
  switch (c) {
    case "amber":
    case "orange":
      return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" };
    case "blue":
      return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" };
    case "green":
      return { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" };
    case "red":
      return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" };
    case "purple":
      return { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
  }
}

export function useTripStatuses() {
  const [statuses, setStatuses] = useState<TripStatusDto[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/trip-statuses", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.statuses)) {
          const active = data.statuses.filter((s: TripStatusDto) => s.isActive !== false);
          setStatuses(active.length ? active : FALLBACK);
        }
      } catch {
        // keep fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const map = useMemo(() => {
    const m = new Map<string, TripStatusDto>();
    for (const s of statuses) m.set(s.key, s);
    return m;
  }, [statuses]);

  const priority = useMemo(() => {
    const p: Record<string, number> = {};
    for (const s of statuses) p[s.key] = s.sortOrder ?? 99;
    return p;
  }, [statuses]);

  const nextMap = useMemo(() => {
    const keys = statuses.map((s) => s.key);
    const m: Record<string, string[]> = {};
    for (let i = 0; i < keys.length; i++) {
      m[keys[i]] = keys.slice(i + 1);
    }
    return m;
  }, [statuses]);

  return { statuses, map, priority, nextMap, loading };
}

