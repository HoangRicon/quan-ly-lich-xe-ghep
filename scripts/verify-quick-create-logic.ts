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
import { PROMPT_SUGGESTIONS } from "../lib/quick-create/constants";
import { generateAutoNote } from "../lib/quick-create/auto-note";
import { parseQuickTripChunk } from "../lib/quick-trip-entry/parser";
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
assert.equal(PROMPT_SUGGESTIONS.length, 2, "Quick-create should show exactly 2 prompt suggestions");
assert.deepEqual(
  PROMPT_SUGGESTIONS.map((suggestion) => suggestion.mode),
  ["smart", "rule"],
  "Quick suggestions should include one AI example and one rule example",
);
assert.equal(
  PROMPT_SUGGESTIONS[0].text,
  "2 cuốc HP – HN 150k, 1 cuốc HN – HP 160k",
);
assert.equal(
  PROMPT_SUGGESTIONS[1].text,
  "8h ngày mai bx HP - HN 900k 0912345678",
);
const ruleSuggestionCandidate = parseQuickTripChunk(
  PROMPT_SUGGESTIONS[1].text,
  new Date("2026-06-27T00:00:00+07:00"),
);
assert.equal(ruleSuggestionCandidate.customerPhone, "0912345678");
assert.equal(ruleSuggestionCandidate.departure, "HP");
assert.equal(ruleSuggestionCandidate.destination, "HN");
assert.equal(ruleSuggestionCandidate.price, 900000);
assert.equal(ruleSuggestionCandidate.tripType, "bao");
assert.deepEqual(ruleSuggestionCandidate.missingFields, []);

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

// ============================================================
// generateAutoNote — extract từ trip-form.tsx, share giữa 2 form
// ============================================================

// Test case 1: Bao xe — output có chứa "bx" ở timePart
const baoNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: "500000",
  phone: "0912345678",
  seats: 1,
  tripType: "bao",
  tripDirection: "oneway",
});
assert.ok(baoNote.includes("bx"), `Bao note phải chứa "bx", got: ${baoNote}`);
assert.ok(baoNote.endsWith("0912345678"), `Bao note phải kết thúc bằng phone`);
assert.ok(baoNote.includes("HN - HP"), `Bao note phải có route "HN - HP"`);
assert.ok(baoNote.includes("500k"), `Bao note phải format price thành "500k"`);

// Test case 2: 2 chiều — output có hậu tố " 2C" trong timePart
const roundtripNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: "300000",
  phone: "0987654321",
  seats: 2,
  tripType: "ghep",
  tripDirection: "roundtrip",
});
assert.ok(roundtripNote.includes(" 2C"), `Roundtrip note phải chứa " 2C", got: ${roundtripNote}`);
assert.ok(roundtripNote.includes("2k"), `Roundtrip note với 2 ghế phải có "2k"`);

// Test case 3: Có vị trí đón/trả — output có 3 dòng (split \n)
const locationNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: "150000",
  phone: "0912345678",
  seats: 1,
  tripType: "ghep",
  tripDirection: "oneway",
  pickupLocation: "123 Cầu Giấy",
  dropoffLocation: "456 Lê Chân",
});
const lines = locationNote.split("\n");
assert.equal(lines.length, 3, `Có vị trí đón/trả → 3 dòng, got: ${locationNote}`);
assert.ok(lines[1].includes("Vị trí đón: 123 Cầu Giấy"));
assert.ok(lines[2].includes("Vị trí trả: 456 Lê Chân"));

// Test case 4: Có vị trí đón nhưng KHÔNG có vị trí trả → 2 dòng
const pickupOnlyNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: "150000",
  phone: "0912345678",
  seats: 1,
  tripType: "ghep",
  tripDirection: "oneway",
  pickupLocation: "123 Cầu Giấy",
});
const pickupLines = pickupOnlyNote.split("\n");
assert.equal(pickupLines.length, 2, `Chỉ có pickup → 2 dòng, got: ${pickupOnlyNote}`);

// Test case 5: 2 ghế trở lên — seatType = "2k"
const twoSeatNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: "200000",
  phone: "0912345678",
  seats: 3,
  tripType: "ghep",
  tripDirection: "oneway",
});
assert.ok(twoSeatNote.includes("2k"), `3 ghế phải có "2k", got: ${twoSeatNote}`);
assert.ok(twoSeatNote.includes("200k"), `Price 200000 phải format "200k", got: ${twoSeatNote}`);

// Test case 6: Format time phụ thuộc vào diffMinutes từ hiện tại.
// Trên 60 phút: format HHhMM. Dưới 60 phút: format 0-Xp.
// Test bằng cách inject departureTime rất xa trong tương lai (>60 phút).
// Để đảm bảo test deterministic, dùng now() tham chiếu: thời gian "14:30" hôm nay
// có thể < 60p hoặc > 60p tùy giờ hiện tại. Test bằng regex cả 2 pattern.
const futureNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: "150000",
  phone: "0912345678",
  seats: 1,
  tripType: "ghep",
  tripDirection: "oneway",
});
const hasZeroXFormat = /^0-\d+p 1k /.test(futureNote);
const hasHHMMFormat = /^\d{2}h\d{2} 1k /.test(futureNote);
assert.ok(
  hasZeroXFormat || hasHHMMFormat,
  `Note phải bắt đầu bằng "0-Xp 1k" hoặc "HHhMM 1k", got: ${futureNote}`,
);

// Test case 7: Price dưới 1000 → giữ nguyên số (không format "k")
const cheapNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: "500",
  phone: "0912345678",
  seats: 1,
  tripType: "ghep",
  tripDirection: "oneway",
});
assert.ok(cheapNote.includes(" 500 "), `Price 500 phải giữ nguyên "500", got: ${cheapNote}`);

// Test case 8: Price là number (không phải string) — phải hoạt động
const numberPriceNote = generateAutoNote({
  departureTime: "14:30",
  departure: "HN",
  destination: "HP",
  price: 150000,
  phone: "0912345678",
  seats: 1,
  tripType: "ghep",
  tripDirection: "oneway",
});
assert.ok(numberPriceNote.includes("150k"), `Price là number phải format "150k", got: ${numberPriceNote}`);

console.log("quick-create logic checks passed");
