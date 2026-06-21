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

const completeCandidate = parseQuickTripChunk(oneLine, now);
assert.equal(completeCandidate.customerPhone, "0912345678");
assert.equal(completeCandidate.departure, "HN");
assert.equal(completeCandidate.destination, "HP");
assert.equal(completeCandidate.price, 150000);
assert.equal(completeCandidate.totalSeats, 1);
assert.equal(completeCandidate.tripType, "ghep");
assert.equal(validateQuickTripCandidate(completeCandidate).canAutoSave, true);

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
