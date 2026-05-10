/**
 * Gom trạng thái cuốc cho báo cáo / thống kê, khớp lịch trình:
 * - `running` / `in_progress` gộp vào **đã gán** (không tách "đang chạy")
 * - `confirmed`, `scheduled` + có tài xế → đã gán
 */

export type TripStatusBucket =
  | "completed"
  | "cancelled"
  | "unassigned"
  | "assigned";

export function isTripRunningStatus(status: string): boolean {
  return status === "running" || status === "in_progress";
}

/** Chờ gán tài xế */
export function isTripUnassignedBucket(
  status: string,
  driverId: number | null | undefined
): boolean {
  return status === "scheduled" && (driverId == null || driverId === 0);
}

/**
 * Mỗi cuốc vào đúng một nhóm (cộng dồn không trùng / không thiếu).
 */
export function tripStatusBucket(trip: {
  status: string;
  driverId?: number | null;
}): TripStatusBucket {
  const s = trip.status || "";
  const driverId = trip.driverId ?? null;
  const hasDriver = driverId != null && driverId !== 0;

  if (s === "cancelled") return "cancelled";
  if (s === "completed") return "completed";
  // Đang chạy = đã có tài xế, gộp vào "đã gán"
  if (isTripRunningStatus(s)) return "assigned";
  if (isTripUnassignedBucket(s, driverId)) return "unassigned";
  if (s === "confirmed" || (s === "scheduled" && hasDriver)) return "assigned";

  if (hasDriver) return "assigned";
  return "unassigned";
}
