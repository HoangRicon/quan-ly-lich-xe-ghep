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
  assert.match(
    serviceSource,
    /export async function reparseQuickEntryItem/,
    "Prompt edits must expose a reparse service for the existing draft item",
  );
  assert.match(
    serviceSource,
    /rawText:\s*text[\s\S]*parsedData:\s*toInputJsonValue\(candidate\)/,
    "Reparse must update the edited prompt text and refreshed parsed data together",
  );
  assert.match(
    serviceSource,
    /function statusForValidation\(candidate: QuickTripCandidate\): string \{\s*return candidate\.missingFields\.length > 0\s*\?/,
    "Draft status must not require review only because soft warnings exist",
  );
  assert.match(
    serviceSource,
    /function hasBlockingValidationIssue\(candidate: QuickTripCandidate\) \{\s*return candidate\.missingFields\.length > 0;\s*\}/,
    "Saving a complete draft must not be blocked only because soft warnings exist",
  );

  console.log("quick-trip manual edit checks passed");
}

void main();
