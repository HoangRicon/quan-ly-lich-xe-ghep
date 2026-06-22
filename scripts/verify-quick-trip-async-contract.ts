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
    /quickEntryProcessingQueues/,
    "Async quick-entry processing must keep a per-session queue",
  );
  assert.match(
    serviceSource,
    /getQuickEntryProcessingQueueKey/,
    "Async queue must be keyed per account and session",
  );
  assert.match(
    serviceSource,
    /parseStatus:\s*QUICK_ENTRY_ITEM_STATUSES\.PENDING/,
    "Async quick-entry submissions must create a pending placeholder item",
  );
  assert.match(
    serviceSource,
    /createPendingQuickEntryPlaceholderItems/,
    "Async quick-entry submissions must create one pending placeholder per expected draft",
  );
  assert.match(
    serviceSource,
    /placeholderItemIds:\s*number\[\]/,
    "Background quick-entry processing must accept multiple placeholder item ids",
  );

  const hookSource = await readFile("hooks/use-quick-create-drafts.ts", "utf8");
  assert.match(
    hookSource,
    /processingMode:\s*"async"/,
    "Quick-create draft submission must request async processing",
  );
  assert.match(
    hookSource,
    /expectedDraftCount:\s*inferExpectedDraftCount\(rawText\)/,
    "Quick-create draft submission must pass inferred expected draft count",
  );
  assert.match(
    hookSource,
    /normalizeCreatedDraftItems/,
    "Quick-create draft hook must normalize async response items",
  );

  const duplicateRouteSource = await readFile(
    "app/api/quick-trip-entry/items/[itemId]/duplicate/route.ts",
    "utf8",
  );
  assert.doesNotMatch(
    duplicateRouteSource,
    /parseStatus:\s*"pending"/,
    "Duplicating a parsed draft must not force the copy back to pending",
  );
  assert.match(
    duplicateRouteSource,
    /parseStatus:\s*original\.parseStatus/,
    "Duplicating a draft must preserve the original status",
  );

  console.log("quick-trip async contract checks passed");
}

void main();
