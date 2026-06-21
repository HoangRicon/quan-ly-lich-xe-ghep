import type { DraftItem } from "./types";

const BLOCKING_STATUSES = new Set(["pending", "failed", "discarded"]);

export function isIsoDateTimeString(value: string | null | undefined) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function buildIsoDateTimeFromLocalParts(
  departureDate: string,
  departureTime: string,
) {
  if (!departureDate || !departureTime) {
    return undefined;
  }

  const [year, month, day] = departureDate.split("-").map(Number);
  const [hours, minutes] = departureTime.split(":").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return undefined;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function canCreateRideFromDraft(item: DraftItem) {
  const parsed = item.parsedData;

  if (!parsed) {
    return false;
  }

  if (BLOCKING_STATUSES.has(item.status)) {
    return false;
  }

  if (item.missingFields.length > 0 || item.warnings.length > 0) {
    return false;
  }

  return (
    typeof parsed.customerPhone === "string" &&
    parsed.customerPhone.trim() !== "" &&
    typeof parsed.departure === "string" &&
    parsed.departure.trim() !== "" &&
    typeof parsed.destination === "string" &&
    parsed.destination.trim() !== "" &&
    isIsoDateTimeString(parsed.departureTime) &&
    typeof parsed.price === "number" &&
    Number.isFinite(parsed.price) &&
    parsed.price > 0
  );
}

export function getSaveResultError(item: DraftItem) {
  if (item.createdTripId || item.status === "saved" || item.status === "auto_saved") {
    return null;
  }

  if (item.errorMessage) {
    return item.errorMessage;
  }

  if (item.status === "needs_review") {
    return "Bản nháp vẫn cần chỉnh sửa trước khi tạo cuốc xe";
  }

  if (item.status === "failed") {
    return "Không tạo được cuốc xe";
  }

  return "Chưa thể tạo cuốc xe từ bản nháp này";
}
