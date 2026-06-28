import assert from "node:assert/strict";

import { parseQuickTripChunk } from "../lib/quick-trip-entry/parser";
import { splitQuickTripInput } from "../lib/quick-trip-entry/split-input";
import type { QuickTripCandidate } from "../lib/quick-trip-entry/types";
import { validateQuickTripCandidate } from "../lib/quick-trip-entry/validation";

const now = new Date("2026-06-21T00:00:00+07:00");

const oneLine = "8h HN - HP 150k 0912345678 1k";
assert.deepEqual(splitQuickTripInput(oneLine), [oneLine]);

const twoLinePaste = [
  "8h HN - HP 150k 0912345678 1k",
  "9h HP - HN 200k 0987654321 2 khách",
].join("\n");
assert.equal(splitQuickTripInput(twoLinePaste).length, 2);

const groupedMultiDrafts = splitQuickTripInput(
  "tao 3 cuoc xe HN - HP, 2 cuoc ND - TB",
);
assert.equal(groupedMultiDrafts.length, 5);
assert.deepEqual(groupedMultiDrafts.slice(0, 3), [
  "HN - HP",
  "HN - HP",
  "HN - HP",
]);
assert.deepEqual(groupedMultiDrafts.slice(3), ["ND - TB", "ND - TB"]);
assert.equal(
  splitQuickTripInput("tao 3 cuoc xe HN - HP va 2 cuoc ND - TB").length,
  5,
);
assert.equal(
  splitQuickTripInput("tạo 3 cuốc xe HN - HP và 2 cuốc ND - TB").length,
  5,
);

const completeCandidate = parseQuickTripChunk(oneLine, now);
assert.equal(completeCandidate.customerPhone, "0912345678");
assert.equal(completeCandidate.departure, "HN");
assert.equal(completeCandidate.destination, "HP");
assert.equal(completeCandidate.departureTime, "2026-06-21T01:00:00.000Z");
assert.equal(completeCandidate.price, 150000);
assert.equal(completeCandidate.totalSeats, 1);
assert.equal(completeCandidate.tripType, "ghep");
assert.equal(validateQuickTripCandidate(completeCandidate).canAutoSave, true);

const accentedColonTimeCandidate = parseQuickTripChunk(
  "9:00 Hà Nội - Hải Phòng 150k 0912345678",
  now,
);
assert.equal(accentedColonTimeCandidate.departure, "Hà Nội");
assert.equal(accentedColonTimeCandidate.destination, "Hải Phòng");
assert.equal(
  accentedColonTimeCandidate.departureTime,
  "2026-06-21T02:00:00.000Z",
);
assert.equal(accentedColonTimeCandidate.price, 150000);
assert.equal(accentedColonTimeCandidate.customerPhone, "0912345678");

const shorthandPriceCandidate = parseQuickTripChunk(
  "9h HN - HP 300 ca 0912345678",
  now,
);
assert.equal(shorthandPriceCandidate.departureTime, "2026-06-21T02:00:00.000Z");
assert.equal(shorthandPriceCandidate.price, 300000);
assert.equal(validateQuickTripCandidate(shorthandPriceCandidate).canAutoSave, true);

const tomorrowCandidate = parseQuickTripChunk(
  "ngay mai 9h HN - HP 150k 0912345678",
  now,
);
assert.equal(tomorrowCandidate.departureTime, "2026-06-22T02:00:00.000Z");
assert.equal(tomorrowCandidate.departure, "HN");
assert.equal(tomorrowCandidate.destination, "HP");
assert.equal(validateQuickTripCandidate(tomorrowCandidate).canAutoSave, true);

const dayAfterTomorrowCandidate = parseQuickTripChunk(
  "ngay kia 9h HN - HP 150k 0912345678",
  now,
);
assert.equal(
  dayAfterTomorrowCandidate.departureTime,
  "2026-06-23T02:00:00.000Z",
);

const nextWeekCandidate = parseQuickTripChunk(
  "tuan sau 9h HN - HP 150k 0912345678",
  now,
);
assert.equal(nextWeekCandidate.departureTime, "2026-06-28T02:00:00.000Z");

const twoWeeksLaterCandidate = parseQuickTripChunk(
  "2 tuan nua 9h HN - HP 150k 0912345678",
  now,
);
assert.equal(twoWeeksLaterCandidate.departureTime, "2026-07-05T02:00:00.000Z");

const nextMonthCandidate = parseQuickTripChunk(
  "thang sau 9h HN - HP 150k 0912345678",
  now,
);
assert.equal(nextMonthCandidate.departureTime, "2026-07-21T02:00:00.000Z");
assert.equal(nextMonthCandidate.departure, "HN");
assert.equal(nextMonthCandidate.destination, "HP");

const incompleteCandidate = parseQuickTripChunk("HN - HP 0912345678", now);
const incompleteValidation = validateQuickTripCandidate(incompleteCandidate);
assert.equal(incompleteValidation.canAutoSave, false);
assert.ok(incompleteValidation.candidate.missingFields.includes("price"));

const numericIdCandidate = parseQuickTripChunk(
  "8h HN - HP ma 123456 0912345678 1k",
  now,
);
const numericIdValidation = validateQuickTripCandidate(numericIdCandidate);
assert.equal(numericIdCandidate.price, undefined);
assert.equal(numericIdValidation.canAutoSave, false);
assert.ok(numericIdValidation.candidate.missingFields.includes("price"));

const validCandidateBase: QuickTripCandidate = {
  customerPhone: "0912345678",
  departure: "HN",
  destination: "HP",
  departureTime: new Date("2026-06-21T08:00:00+07:00").toISOString(),
  price: 150000,
  totalSeats: 1,
  tripType: "ghep",
  tripDirection: "oneway",
  confidence: 0.9,
  missingFields: [],
  warnings: [],
};

for (const invalidPrice of [Number.NaN, Infinity, -Infinity]) {
  const invalidPriceValidation = validateQuickTripCandidate({
    ...validCandidateBase,
    price: invalidPrice,
  });
  assert.equal(invalidPriceValidation.canAutoSave, false);
  assert.ok(
    invalidPriceValidation.candidate.warnings.includes("invalid_price"),
  );
}

for (const invalidSeats of [Number.NaN, Infinity, -Infinity]) {
  const invalidSeatsValidation = validateQuickTripCandidate({
    ...validCandidateBase,
    totalSeats: invalidSeats,
  });
  assert.equal(invalidSeatsValidation.canAutoSave, false);
  assert.ok(
    invalidSeatsValidation.candidate.warnings.includes("invalid_total_seats"),
  );
}

const invalidEnumValidation = validateQuickTripCandidate({
  ...validCandidateBase,
  tripType: "vip" as QuickTripCandidate["tripType"],
  tripDirection: "return" as QuickTripCandidate["tripDirection"],
});
assert.equal(invalidEnumValidation.canAutoSave, false);
assert.ok(invalidEnumValidation.candidate.warnings.includes("invalid_trip_type"));
assert.ok(
  invalidEnumValidation.candidate.warnings.includes("invalid_trip_direction"),
);

const whitespaceRequiredValidation = validateQuickTripCandidate({
  ...validCandidateBase,
  departure: "   ",
});
assert.equal(whitespaceRequiredValidation.canAutoSave, false);
assert.ok(
  whitespaceRequiredValidation.candidate.missingFields.includes("departure"),
);

const invalidDepartureTimeValidation = validateQuickTripCandidate({
  ...validCandidateBase,
  departureTime: "khong-phai-ngay-hop-le",
});
assert.equal(invalidDepartureTimeValidation.canAutoSave, false);
assert.ok(
  invalidDepartureTimeValidation.candidate.warnings.includes(
    "invalid_departure_time",
  ),
);

console.log("quick-trip parser checks passed");
