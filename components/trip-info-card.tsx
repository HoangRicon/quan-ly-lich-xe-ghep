"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar, UserCheck, Calculator, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { statusColorClasses } from "@/lib/useTripStatuses";

interface TripInfoCardProps {
  trip: {
    id: number;
    departure: string;
    destination: string;
    status: string;
    statusLabel?: string;
    statusColor?: string;
    pointsEarned?: number | null;
    profit?: number | null;
    profitRate?: number | null;
    matchedFormulaId?: number | null;
    matchedFormulaName?: string | null;
    createdAt: string;
    assignedAt?: string | null;
    departureTime?: string | null;
  };
  className?: string;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

function formatPoints(points: number | null | undefined): string {
  if (points == null) return "—";
  return points.toFixed(1);
}

export function TripInfoCard({ trip, className }: TripInfoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = statusColorClasses(trip.statusColor || "slate");
  const route = `${trip.departure} → ${trip.destination}`;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-200",
        "hover:border-slate-300 hover:shadow-sm",
        expanded && "shadow-md border-slate-300",
        className
      )}
    >
      {/* Main content - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        {/* Left: Trip ID & Route */}
        <div className="flex-1 min-w-0">
          {/* Trip ID */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              #{trip.id}
            </span>
            {/* Status badge */}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-5 font-medium",
                statusColors.bg,
                statusColors.text,
                statusColors.border
              )}
            >
              {trip.statusLabel || trip.status}
            </Badge>
          </div>

          {/* Route */}
          <p className="text-sm font-medium text-slate-800 truncate pr-2">
            {route}
          </p>
        </div>

        {/* Right: Points & Profit */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {/* Points */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">
              Điểm
            </span>
            <span className="text-sm font-bold text-amber-600">
              {formatPoints(trip.pointsEarned)}
            </span>
          </div>

          {/* Profit */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">
              Công
            </span>
            <span className="text-sm font-bold text-emerald-600">
              {formatCurrency(trip.profit)}
            </span>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0 pt-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100 mt-0">
          <div className="pt-2.5 space-y-2">
            {/* Departure time */}
            {trip.departureTime && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500">Khởi hành:</span>
                <span className="text-slate-700 font-medium ml-auto">
                  {formatDate(trip.departureTime)}
                </span>
              </div>
            )}

            {/* Created date */}
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">Tạo lúc:</span>
              <span className="text-slate-700 font-medium ml-auto">
                {formatDate(trip.createdAt)}
              </span>
            </div>

            {/* Assigned date */}
            <div className="flex items-center gap-2 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">Gán tài xế:</span>
              <span className="text-slate-700 font-medium ml-auto">
                {formatDate(trip.assignedAt)}
              </span>
            </div>

            {/* Formula */}
            <div className="flex items-center gap-2 text-xs">
              <Calculator className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">Công thức:</span>
              <span className="text-slate-700 font-medium ml-auto truncate max-w-[160px]">
                {trip.matchedFormulaName || `ID #${trip.matchedFormulaId}` || "—"}
              </span>
            </div>

            {/* Profit rate (if available) */}
            {trip.profitRate != null && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-slate-500">Tỷ lệ công:</span>
                <span className="text-slate-700 font-medium ml-auto">
                  {trip.profitRate.toLocaleString("vi-VN")}đ
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TripInfoCardListProps {
  trips: TripInfoCardProps["trip"][];
  className?: string;
}

export function TripInfoCardList({ trips, className }: TripInfoCardListProps) {
  if (trips.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Chưa có chuyến nào để hiển thị
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {trips.map((trip) => (
        <TripInfoCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
