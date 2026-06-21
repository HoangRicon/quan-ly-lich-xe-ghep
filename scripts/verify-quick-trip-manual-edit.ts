import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const serviceSource = await readFile("lib/quick-trip-entry/service.ts", "utf8");

  assert.match(
    serviceSource,
    /normalizeManualEditedCandidate/,
    "Manual quick-entry edits must be normalized before validation",
  );
  assert.match(
    serviceSource,
    /function normalizeManualEditedCandidate[\s\S]*confidence:\s*Math\.max[\s\S]*QUICK_ENTRY_AUTO_SAVE_THRESHOLD/,
    "Manual edits with enough data must not fall back to confidence 0",
  );
  assert.match(
    serviceSource,
    /missingFields:\s*\[\]/,
    "Manual edits should clear stale missingFields before validation recomputes them",
  );
  assert.match(
    serviceSource,
    /warnings:\s*\[\]/,
    "Manual edits should clear stale warnings before validation recomputes them",
  );

  console.log("quick-trip manual edit checks passed");
}

void main();
