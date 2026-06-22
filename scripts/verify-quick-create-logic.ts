import assert from "node:assert/strict";

import {
  buildIsoDateTimeFromLocalParts,
  canCreateRideFromDraft,
  getDraftFieldIssueCards,
  getDraftUncertaintyNotes,
  getSaveResultError,
  inferExpectedDraftCount,
  isIsoDateTimeString,
} from "../lib/quick-create/draft-helpers";
import type { DraftItem } from "../lib/quick-create/types";

function buildDraft(overrides: Partial<DraftItem> = {}): DraftItem {
  return {
    id: 1,
    sessionId: 1,
    rawText: "8h HN - HP 150k 0912345678",
    source: "text",
    status: "parsed",
    parsedData: {
      customerPhone: "0912345678",
      departure: "Ha Noi",
      destination: "Hai Phong",
      departureTime: "2026-06-22T01:00:00.000Z",
      price: 150000,
      totalSeats: 1,
      tripType: "ghep",
      tripDirection: "oneway",
      confidence: 0.95,
      missingFields: [],
      warnings: [],
    },
    missingFields: [],
    warnings: [],
    confidence: 0.95,
    createdTripId: null,
    errorMessage: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
    ...overrides,
  };
}

const localIso = buildIsoDateTimeFromLocalParts("2026-06-22", "08:30");
assert.ok(localIso);
assert.equal(isIsoDateTimeString(localIso), true);

const validDraft = buildDraft();
assert.equal(canCreateRideFromDraft(validDraft), true);

const invalidTimeDraft = buildDraft({
  parsedData: {
    ...buildDraft().parsedData!,
    departureTime: "2026-06-22T08:30:00",
  },
});
assert.equal(
  canCreateRideFromDraft(invalidTimeDraft),
  true,
  "Local datetime strings that parse to valid dates should still be createable",
);

const missingFieldDraft = buildDraft({
  missingFields: ["departureTime"],
});
assert.equal(canCreateRideFromDraft(missingFieldDraft), false);

const warningDraft = buildDraft({
  status: "needs_review",
  warnings: ["ai_parse_failed"],
});
assert.equal(
  canCreateRideFromDraft(warningDraft),
  true,
  "Warnings without missing required data should not block creating a trip",
);

assert.deepEqual(
  getDraftFieldIssueCards(
    buildDraft({
      missingFields: ["customerPhone", "departureTime"],
      warnings: ["invalid_price", "ai_parse_failed"],
    }),
  ),
  [
    {
      key: "missing:customerPhone",
      label: "Thiếu SĐT",
      description: "Bổ sung số điện thoại khách để có thể tạo cuốc xe.",
      tone: "missing",
    },
    {
      key: "missing:departureTime",
      label: "Thiếu giờ đi",
      description: "Bổ sung ngày giờ khởi hành rõ ràng.",
      tone: "missing",
    },
  ],
);

assert.deepEqual(
  getDraftUncertaintyNotes(
    buildDraft({
      warnings: ["invalid_price", "ai_parse_failed", "unknown_warning"],
    }),
  ),
  [
    {
      key: "warning:invalid_price",
      title: "Giá chưa chắc chắn",
      description: "AI không đọc được giá hợp lệ, hãy kiểm tra lại giá tiền.",
    },
    {
      key: "warning:ai_parse_failed",
      title: "AI chưa đọc được hết",
      description: "Hệ thống đã dùng bộ tách cơ bản, nên có thể cần bổ sung lại prompt.",
    },
    {
      key: "warning:unknown_warning",
      title: "Thông tin chưa rõ",
      description: "Cần xem lại chi tiết unknown_warning trong prompt hoặc dữ liệu draft.",
    },
  ],
);

assert.equal(inferExpectedDraftCount("Tao 2 cuoc xe HN HP"), 2);
assert.equal(inferExpectedDraftCount("tao 3 ban nhap giup anh"), 3);
assert.equal(inferExpectedDraftCount("hai cuoc xe ngay mai"), 2);
assert.equal(inferExpectedDraftCount("tao 3 cuoc xe HN - HP, 2 cuoc ND - TB"), 5);
assert.equal(inferExpectedDraftCount("tạo 3 cuốc xe HN - HP và 2 cuốc ND - TB"), 5);
assert.equal(inferExpectedDraftCount("hom nay co 1 khach di HP"), undefined);
assert.equal(inferExpectedDraftCount("0988123456 di 2 ghe"), undefined);

const reviewDraft = buildDraft({
  status: "needs_review",
  createdTripId: null,
});
assert.equal(
  getSaveResultError(reviewDraft),
  "Bản nháp vẫn cần bổ sung thông tin trước khi tạo cuốc xe",
);

const failedDraft = buildDraft({
  status: "failed",
  errorMessage: "Missing required fields",
});
assert.equal(getSaveResultError(failedDraft), "Missing required fields");

const savedDraft = buildDraft({
  status: "saved",
  createdTripId: 99,
});
assert.equal(getSaveResultError(savedDraft), null);

console.log("quick-create logic checks passed");
