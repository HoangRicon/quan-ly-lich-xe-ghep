/**
 * Quy tắc chuyển trạng thái hợp lệ cho Trip.
 *
 * Mục đích: ngăn chặn trạng thái "đã gán" (confirmed) khi chưa có tài xế,
 * đồng thời giữ logic nhất quán giữa frontend (dropdown) và backend (API validate).
 */

export type TripStatusKey =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled";

export type TransitionValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Trả về danh sách trạng thái hợp lệ tiếp theo cho trip hiện tại.
 * Dùng cho frontend (filter dropdown) và cho validate API.
 *
 * @param currentStatus - trạng thái hiện tại của trip
 * @param hasDriver     - true nếu trip hiện đang có driverId != null
 */
export function getValidNextStatuses(
  currentStatus: string,
  hasDriver: boolean
): string[] {
  if (currentStatus === "scheduled") {
    const next: string[] = ["cancelled"];
    if (hasDriver) next.push("confirmed");
    return next;
  }

  if (currentStatus === "confirmed") {
    return ["scheduled", "cancelled", "completed"];
  }

  if (currentStatus === "running" || currentStatus === "in_progress") {
    return ["scheduled", "cancelled", "completed"];
  }

  if (currentStatus === "completed") {
    const next: string[] = [];
    if (hasDriver) next.push("confirmed");
    next.push("cancelled");
    return next;
  }

  if (currentStatus === "cancelled") {
    return ["scheduled"];
  }

  return [];
}

/**
 * Validate một chuyển trạng thái cụ thể. Trả về { ok: true } nếu hợp lệ,
 * ngược lại trả message tiếng Việt giải thích lý do từ chối.
 *
 * @param currentStatus - trạng thái hiện tại của trip trong DB
 * @param newStatus     - trạng thái user muốn chuyển sang
 * @param newDriverId   - driverId sau khi áp dụng (null nếu bỏ gán)
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  newDriverId: number | null | undefined
): TransitionValidationResult {
  if (currentStatus === newStatus) {
    return { ok: true };
  }

  if (
    (newStatus === "confirmed" || newStatus === "running" || newStatus === "in_progress") &&
    (newDriverId == null || newDriverId === 0)
  ) {
    return {
      ok: false,
      message: "Phải gán tài xế trước khi chuyển sang trạng thái Đã gán.",
    };
  }

  const valid = getValidNextStatuses(
    currentStatus,
    newDriverId != null && newDriverId !== 0
  );
  if (!valid.includes(newStatus)) {
    return {
      ok: false,
      message: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}".`,
    };
  }

  return { ok: true };
}

/**
 * Helper cho API PUT trip: quyết định status nên được set khi driverId thay đổi.
 *
 * Trả về status mới nếu cần auto-cascade, hoặc undefined nếu không thay đổi.
 *
 * @param currentStatus - trạng thái hiện tại
 * @param oldDriverId  - driverId cũ (null nếu chưa gán)
 * @param newDriverId  - driverId mới (null nếu bỏ gán)
 */
export function resolveStatusAfterDriverChange(
  currentStatus: string,
  oldDriverId: number | null | undefined,
  newDriverId: number | null | undefined
): string | undefined {
  const oldHas = oldDriverId != null && oldDriverId !== 0;
  const newHas = newDriverId != null && newDriverId !== 0;

  if (oldHas === newHas) return undefined;

  if (!oldHas && newHas && currentStatus === "scheduled") {
    return "confirmed";
  }

  if (oldHas && !newHas && currentStatus === "confirmed") {
    return "scheduled";
  }

  return undefined;
}
