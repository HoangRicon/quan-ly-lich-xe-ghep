/**
 * Date utility functions for the app.
 * Uses local time (Asia/Ho_Chi_Minh) consistently across the codebase.
 */

export type DateFilter = "today" | "week" | "month" | "all" | "custom";

/**
 * Get local date as YYYY-MM-DD string.
 * Use this instead of toISOString() to avoid UTC offset issues.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Returns the start of the current week (Monday) in local time.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  // (getDay() + 6) % 7: Mon=0, Tue=1, ..., Sun=6
  const dayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the start of the current month in local time.
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Returns the start of the current day (midnight) in local time.
 */
export function getDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Computes start/end date range for a given quick filter.
 * Uses Asia/Ho_Chi_Minh local time consistently.
 */
export function getQuickDateRange(filter: DateFilter): DateRange {
  const today = new Date();

  if (filter === "today") {
    return { start: toLocalDateString(today), end: toLocalDateString(today) };
  }

  if (filter === "week") {
    const weekStart = getWeekStart(today);
    return { start: toLocalDateString(weekStart), end: toLocalDateString(today) };
  }

  if (filter === "month") {
    const monthStart = getMonthStart(today);
    return { start: toLocalDateString(monthStart), end: toLocalDateString(today) };
  }

  // "all" and "custom" have no preset range
  return { start: "", end: "" };
}

/**
 * Parses a YYYY-MM-DD string into a local-time Date at midnight.
 * This is the inverse of toLocalDateString().
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Adds a number of days to a date (local time).
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Subtracts a number of days from a date (local time).
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}
