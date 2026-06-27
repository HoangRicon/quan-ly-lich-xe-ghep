import {
  inferGroupedDraftCount,
  normalizeVietnameseText,
} from "@/lib/quick-trip-entry/grouped-draft-request";
import type { DraftItem } from "./types";

const BLOCKING_STATUSES = new Set(["pending", "failed", "discarded"]);

export interface DraftFieldIssueCard {
  key: string;
  label: string;
  description: string;
  tone: "missing";
}

export interface DraftUncertaintyNote {
  key: string;
  title: string;
  description: string;
}

export interface DraftAnalysisBadge {
  label: string;
  title: string;
  className: string;
}

export const RULE_FALLBACK_ANALYSIS_MESSAGE =
  "AI không kết nối được, hệ thống đã tạo bản nháp bằng quy tắc thường. Vui lòng kiểm tra lại thông tin trước khi tạo cuốc.";

const MISSING_FIELD_COPY: Record<string, { label: string; description: string }> = {
  customerPhone: {
    label: "Thiếu SĐT",
    description: "Bổ sung số điện thoại khách để có thể tạo cuốc xe.",
  },
  customerName: {
    label: "Thiếu tên",
    description: "Có thể tạo cuốc nếu đã có SĐT, nhưng nên bổ sung tên khách.",
  },
  departure: {
    label: "Thiếu điểm đón",
    description: "Bổ sung điểm đi hoặc khu vực đón khách.",
  },
  destination: {
    label: "Thiếu điểm trả",
    description: "Bổ sung điểm đến hoặc khu vực trả khách.",
  },
  departureTime: {
    label: "Thiếu giờ đi",
    description: "Bổ sung ngày giờ khởi hành rõ ràng.",
  },
  price: {
    label: "Thiếu giá",
    description: "Bổ sung giá tiền dự kiến cho cuốc xe.",
  },
};

const WARNING_NOTE_COPY: Record<string, { title: string; description: string }> = {
  invalid_departure_time: {
    title: "Giờ đi chưa chắc chắn",
    description: "AI không đọc được ngày giờ hợp lệ, hãy kiểm tra lại thời gian đi.",
  },
  invalid_price: {
    title: "Giá chưa chắc chắn",
    description: "AI không đọc được giá hợp lệ, hãy kiểm tra lại giá tiền.",
  },
  invalid_total_seats: {
    title: "Số ghế chưa chắc chắn",
    description: "Số khách hoặc số ghế đang không hợp lệ, hãy kiểm tra lại.",
  },
  invalid_trip_type: {
    title: "Loại cuốc chưa rõ",
    description: "Loại ghép/bao chưa hợp lệ, hãy chọn lại trong form sửa.",
  },
  invalid_trip_direction: {
    title: "Chiều đi chưa rõ",
    description: "Chiều đi một chiều/hai chiều chưa hợp lệ, hãy chọn lại.",
  },
  invalid_driver: {
    title: "Tài xế chưa hợp lệ",
    description: "Tài xế AI gán vào không tồn tại hoặc không có vai trò tài xế.",
  },
  ai_parse_failed: {
    title: "AI không kết nối được",
    description: RULE_FALLBACK_ANALYSIS_MESSAGE,
  },
  low_confidence: {
    title: "Độ tin cậy thấp",
    description: "AI chưa tự tin với một vài thông tin, hãy xem lại trước khi tạo cuốc.",
  },
};

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

  if (item.missingFields.length > 0) {
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

export function getDraftFieldIssueCards(item: DraftItem): DraftFieldIssueCard[] {
  return item.missingFields.map((field) => {
    const copy = MISSING_FIELD_COPY[field] ?? {
      label: "Thiếu thông tin",
      description: `Bổ sung trường ${field} trước khi tạo cuốc xe.`,
    };

    return {
      key: `missing:${field}`,
      label: copy.label,
      description: copy.description,
      tone: "missing" as const,
    };
  });
}

export function getDraftUncertaintyNotes(item: DraftItem): DraftUncertaintyNote[] {
  return item.warnings.map((warning) => {
    const copy = WARNING_NOTE_COPY[warning] ?? {
      title: "Thông tin chưa rõ",
      description: `Cần xem lại chi tiết ${warning} trong prompt hoặc dữ liệu draft.`,
    };

    return {
      key: `warning:${warning}`,
      title: copy.title,
      description: copy.description,
    };
  });
}

export function getDraftAnalysisBadge(item: DraftItem): DraftAnalysisBadge | null {
  const source = item.parsedData?.analysisSource;
  const parsedWarnings = Array.isArray(item.parsedData?.warnings)
    ? item.parsedData.warnings
    : [];
  const hasRuleFallbackWarning =
    item.warnings.includes("ai_parse_failed") ||
    parsedWarnings.includes("ai_parse_failed");

  if (source === "ai") {
    return {
      label: "AI phân tích",
      title: "Bản nháp được AI phân tích.",
      className: "bg-indigo-50 text-indigo-700 border-indigo-100",
    };
  }

  if (source === "rule" || hasRuleFallbackWarning) {
    return {
      label: "Quy tắc thường",
      title: item.parsedData?.analysisMessage ?? RULE_FALLBACK_ANALYSIS_MESSAGE,
      className: "bg-slate-50 text-slate-700 border-slate-200",
    };
  }

  return null;
}

const VIETNAMESE_NUMBER_WORDS: Record<string, number> = {
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  tu: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
};

export function normalizeVietnameseTextLegacy(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function inferExpectedDraftCount(rawText: string): number | undefined {
  const groupedCount = inferGroupedDraftCount(rawText);
  if (groupedCount) return groupedCount;

  const text = normalizeVietnameseText(rawText);
  const countWords = Object.keys(VIETNAMESE_NUMBER_WORDS).join("|");
  const countPattern = `(?<count>\\d{1,2}|${countWords})`;
  const nounPattern =
    "(?:cuoc(?:\\s+xe)?|chuyen(?:\\s+xe)?|ban\\s+nhap|draft)";
  const patterns = [
    new RegExp(`\\b(?:tao|them|lap|can)\\s+${countPattern}\\s+${nounPattern}\\b`, "i"),
    new RegExp(`\\b${countPattern}\\s+${nounPattern}\\b`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const rawCount = match?.groups?.count;
    if (!rawCount) continue;

    const count = /^\d+$/.test(rawCount)
      ? Number(rawCount)
      : VIETNAMESE_NUMBER_WORDS[rawCount];

    if (Number.isInteger(count) && count >= 2 && count <= 20) {
      return count;
    }
  }

  return undefined;
}

export function getSaveResultError(item: DraftItem) {
  if (item.createdTripId || item.status === "saved" || item.status === "auto_saved") {
    return null;
  }

  if (item.errorMessage) {
    return item.errorMessage;
  }

  if (item.status === "needs_review") {
    return "Bản nháp vẫn cần bổ sung thông tin trước khi tạo cuốc xe";
  }

  if (item.status === "failed") {
    return "Không tạo được cuốc xe";
  }

  return "Chưa thể tạo cuốc xe từ bản nháp này";
}
