import assert from "node:assert/strict";

import { QUICK_ENTRY_ITEM_STATUSES } from "../lib/quick-trip-entry/types";
import { QUICK_ENTRY_AUTO_SAVE_THRESHOLD } from "../lib/quick-trip-entry/validation";

assert.equal(QUICK_ENTRY_AUTO_SAVE_THRESHOLD, 0.85);

for (const status of [
  "pending",
  "parsed",
  "needs_review",
  "auto_saved",
  "saved",
  "failed",
  "discarded",
]) {
  assert.ok((Object.values(QUICK_ENTRY_ITEM_STATUSES) as string[]).includes(status));
}

console.log("quick-trip service constants check passed");
