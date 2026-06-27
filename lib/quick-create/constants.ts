/**
 * Quick Create page constants.
 * Status color mappings and warning badge label mappings.
 */

import type { QuickEntryItemStatus } from "@/lib/quick-trip-entry/types";

export const QUICK_CREATE_PAGE_HREF = "/dashboard/quick-create";
export const SCHEDULE_PAGE_HREF = "/dashboard/schedule";

/** Map draft parse status → Tailwind classes for status badge */
export const DRAFT_STATUS_CONFIG: Record<
  QuickEntryItemStatus,
  { label: string; bg: string; text: string }
> = {
  pending:     { label: "Chờ",      bg: "bg-slate-100", text: "text-slate-600" },
  parsed:     { label: "Đã phân tích", bg: "bg-green-100", text: "text-green-700" },
  needs_review: { label: "Cần bổ sung", bg: "bg-amber-100", text: "text-amber-700" },
  auto_saved: { label: "Đã lưu tự động", bg: "bg-blue-100", text: "text-blue-700" },
  saved:      { label: "Đã tạo",   bg: "bg-green-100", text: "text-green-700" },
  failed:     { label: "Lỗi",      bg: "bg-red-100",   text: "text-red-600" },
  discarded:  { label: "Đã hủy",   bg: "bg-slate-100", text: "text-slate-400" },
};

/** Map missing field codes → Vietnamese labels for warning badges */
export const MISSING_FIELD_LABELS: Record<string, string> = {
  customerPhone:  "Thiếu SĐT",
  customerName:  "Thiếu tên",
  departure:     "Thiếu điểm đón",
  destination:   "Thiếu điểm trả",
  departureTime: "Thiếu giờ đi",
  price:         "Thiếu giá",
};

/** Map warning codes → Vietnamese labels */
export const WARNING_LABELS: Record<string, string> = {
  missing_phone:   "Thiếu SĐT",
  missing_price:   "Thiếu giá",
  missing_departure: "Thiếu điểm đón",
  missing_destination: "Thiếu điểm trả",
  missing_time:    "Thiếu giờ đi",
  invalid_driver:  "Tài xế không hợp lệ",
  ai_parse_failed: "AI lỗi",
};

/** AI Composer state labels */
export const COMPOSER_STATE_LABELS = {
  idle:      "Nhập yêu cầu bằng ngôn ngữ tự nhiên...",
  analyzing:  "Đang phân tích...",
  generating: "Đang tạo bản nháp...",
  done:      "Đã tạo!",
  error:     "Đã xảy ra lỗi",
} as const;

/** Swipe thresholds (px) */
export const SWIPE_THRESHOLD_REVEAL = 40;
export const SWIPE_THRESHOLD_ACTION = 80;

/** Prompt suggestions shown in composer when empty */
export const PROMPT_SUGGESTIONS = [
  {
    mode: "smart",
    label: "Sâu",
    text: "Mai 8h sáng có 2 bác Thắng và Minh đi từ bến xe Hải Phòng ra bến xe Nội Bài, ngồi ghế 3 và 5, trả 150k mỗi người",
  },
  {
    mode: "rule",
    label: "Nhanh",
    text: "8h ngày mai bx HP - HN 900k 0912345678",
  },
] as const;

export type PromptSuggestion = (typeof PROMPT_SUGGESTIONS)[number];

/** localStorage key for recent prompts */
export const RECENT_PROMPTS_KEY = "quick-create-recent-prompts";
export const MAX_RECENT_PROMPTS = 10;

/** SWR refresh interval for drafts (ms) */
export const DRAFT_REFRESH_INTERVAL = 5000;
