import assert from "node:assert/strict";

import type { QuickTripAiProvider } from "../lib/quick-trip-entry/ai-provider";
import { parseQuickEntryDrafts } from "../lib/quick-trip-entry/smart-parser";

let receivedExpectedDraftCount: number | undefined;

const provider: QuickTripAiProvider = {
  async parse() {
    return {};
  },
  async parseMany(_rawText, options) {
    receivedExpectedDraftCount = options?.expectedDraftCount;
    return [
      {
        rawText: "8h HN - HP 150k 0912345678",
        candidate: {
          customerPhone: "0912345678",
          departure: "HN",
          destination: "HP",
          departureTime: "2026-06-22T01:00:00.000Z",
          price: 150000,
          confidence: 0.95,
          missingFields: [],
          warnings: [],
        },
      },
      {
        rawText: "9h HP - HN 200k 0987654321",
        candidate: {
          customerPhone: "0987654321",
          departure: "HP",
          destination: "HN",
          departureTime: "2026-06-22T02:00:00.000Z",
          price: 200000,
          confidence: 0.94,
          missingFields: [],
          warnings: [],
        },
      },
    ];
  },
};

async function main() {
  const smartDrafts = await parseQuickEntryDrafts({
    rawText:
      "Tao 2 cuoc: 8h HN HP 150k 0912345678; 9h HP HN 200k 0987654321",
    parseMode: "smart",
    expectedDraftCount: 2,
    provider,
  });

  assert.equal(receivedExpectedDraftCount, 2);
  assert.equal(smartDrafts.length, 2);
  assert.equal(smartDrafts[0].candidate.confidence, 0.95);
  assert.deepEqual(smartDrafts[0].candidate.warnings, []);

  const failingProvider: QuickTripAiProvider = {
    async parse() {
      return {};
    },
    async parseMany() {
      throw new Error("AI down");
    },
  };

  const fallbackDrafts = await parseQuickEntryDrafts({
    rawText: "8h HN - HP 150k 0912345678",
    parseMode: "smart",
    provider: failingProvider,
  });

  assert.equal(fallbackDrafts.length, 1);
  assert.ok(fallbackDrafts[0].candidate.warnings.includes("ai_parse_failed"));
  assert.equal(fallbackDrafts[0].candidate.price, 150000);

  const partialAiProvider: QuickTripAiProvider = {
    async parse() {
      return {};
    },
    async parseMany() {
      return [
        {
          rawText: "8h HN - HP 150k 0912345678",
          candidate: {
            customerName: "Anh Nam",
            confidence: 0.96,
            missingFields: [],
            warnings: [],
          },
        },
      ];
    },
  };

  const mergedDrafts = await parseQuickEntryDrafts({
    rawText: "8h HN - HP 150k 0912345678",
    parseMode: "smart",
    provider: partialAiProvider,
  });

  assert.equal(mergedDrafts.length, 1);
  assert.equal(mergedDrafts[0].candidate.customerName, "Anh Nam");
  assert.equal(mergedDrafts[0].candidate.customerPhone, "0912345678");
  assert.equal(mergedDrafts[0].candidate.departure, "HN");
  assert.equal(mergedDrafts[0].candidate.destination, "HP");
  assert.equal(mergedDrafts[0].candidate.price, 150000);

  console.log("quick-trip smart service checks passed");
}

void main();
