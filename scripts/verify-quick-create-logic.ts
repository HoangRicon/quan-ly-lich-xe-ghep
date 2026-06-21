import assert from "node:assert/strict";

import {
  buildIsoDateTimeFromLocalParts,
  canCreateRideFromDraft,
  getSaveResultError,
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
  warnings: ["invalid_driver"],
});
assert.equal(canCreateRideFromDraft(warningDraft), false);

const reviewDraft = buildDraft({
  status: "needs_review",
  createdTripId: null,
});
assert.equal(
  getSaveResultError(reviewDraft),
  "Bản nháp vẫn cần chỉnh sửa trước khi tạo cuốc xe",
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
