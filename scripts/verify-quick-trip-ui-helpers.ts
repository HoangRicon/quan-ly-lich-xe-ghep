import assert from "node:assert/strict";

import {
  appendVoiceTranscript,
  getQuickEntrySaveMessage,
  isDiscardableQuickEntryItemStatus,
  isSaveableQuickEntryItemStatus,
  isSavedQuickEntryItemStatus,
  normalizeManualEditedCandidate,
} from "../components/quick-trip-entry/state-helpers";

assert.equal(appendVoiceTranscript("", "  8h HN HP 150k  "), "8h HN HP 150k");
assert.equal(
  appendVoiceTranscript("0988123456 anh Nam", "8h mai"),
  "0988123456 anh Nam 8h mai",
);

assert.equal(isSaveableQuickEntryItemStatus("parsed"), true);
assert.equal(isSaveableQuickEntryItemStatus("auto_saved"), false);
assert.equal(isSaveableQuickEntryItemStatus("saved"), false);
assert.equal(isSaveableQuickEntryItemStatus("needs_review"), false);

assert.equal(isSavedQuickEntryItemStatus("saved"), true);
assert.equal(isSavedQuickEntryItemStatus("auto_saved"), true);
assert.equal(isSavedQuickEntryItemStatus("needs_review"), false);

assert.equal(getQuickEntrySaveMessage("saved"), "Da luu Trip");
assert.equal(getQuickEntrySaveMessage("auto_saved"), "Da luu Trip");
assert.equal(getQuickEntrySaveMessage("needs_review"), "Can sua draft truoc khi luu Trip");
assert.equal(getQuickEntrySaveMessage("failed"), "Khong luu duoc Trip");

assert.deepEqual(
  normalizeManualEditedCandidate({
    departure: "HN",
    confidence: 0.2,
    missingFields: ["price"],
    warnings: ["low_confidence"],
  }),
  {
    departure: "HN",
    confidence: 0.9,
    missingFields: [],
    warnings: [],
  },
);

assert.equal(isDiscardableQuickEntryItemStatus("parsed"), true);
assert.equal(isDiscardableQuickEntryItemStatus("needs_review"), true);
assert.equal(isDiscardableQuickEntryItemStatus("failed"), true);
assert.equal(isDiscardableQuickEntryItemStatus("auto_saved"), false);
assert.equal(isDiscardableQuickEntryItemStatus("saved"), false);

console.log("quick-trip UI helper checks passed");
