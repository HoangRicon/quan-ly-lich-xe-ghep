import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const routeSource = await readFile(
    "app/api/quick-trip-entry/sessions/[id]/items/route.ts",
    "utf8",
  );
  const serviceSource = await readFile("lib/quick-trip-entry/service.ts", "utf8");

  assert.match(
    routeSource,
    /normalizeProcessingMode/,
    "Route must normalize processing mode from request body",
  );
  assert.match(
    routeSource,
    /processingMode:\s*normalizeProcessingMode\(body\.processingMode\)/,
    "Route must pass processingMode into quick-entry service",
  );
  assert.match(
    routeSource,
    /data\.processingMode === "async"/,
    "Route must branch on async quick-entry processing mode",
  );
  assert.match(
    routeSource,
    /status:\s*202/,
    "Async quick-entry submissions must return HTTP 202 Accepted",
  );

  assert.match(
    serviceSource,
    /enqueueQuickEntryItemsProcessing/,
    "Service must support enqueueing background quick-entry processing",
  );
  assert.match(
    serviceSource,
    /parseStatus:\s*QUICK_ENTRY_ITEM_STATUSES\.PENDING/,
    "Async quick-entry submissions must create a pending placeholder item",
  );

  console.log("quick-trip async contract checks passed");
}

void main();
