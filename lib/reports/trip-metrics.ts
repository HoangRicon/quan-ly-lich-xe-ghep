import {
  tripStatusBucket,
  type TripStatusBucket,
} from "@/lib/trip-status-buckets";

const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";

type DecimalLike = {
  toNumber?: () => number;
  valueOf?: () => unknown;
};

export type ReportStatusBucket = TripStatusBucket;

export function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return roundOne((numerator / denominator) * 100);
}

export function changePercent(current: number, previous: number): number {
  if (previous > 0) {
    return roundOne(((current - previous) / previous) * 100);
  }

  return current > 0 ? 100 : 0;
}

function timeZoneParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: REPORT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
}

export function toDayKey(date: Date): string {
  const parts = timeZoneParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toMonthKey(date: Date): string {
  const parts = timeZoneParts(date);
  return `${parts.year}-${parts.month}`;
}

export function toMoneyNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;

  const decimal = value as DecimalLike;
  if (typeof decimal.toNumber === "function") {
    return decimal.toNumber();
  }

  const primitive = decimal.valueOf?.();
  return Number(primitive ?? value) || 0;
}

export function sumMoney<T>(
  values: T[],
  select: (value: T) => unknown
): number {
  return values.reduce((sum, value) => sum + toMoneyNumber(select(value)), 0);
}

export function reportStatusBucket(trip: {
  status: string;
  driverId?: number | null;
}): ReportStatusBucket {
  return tripStatusBucket(trip);
}
