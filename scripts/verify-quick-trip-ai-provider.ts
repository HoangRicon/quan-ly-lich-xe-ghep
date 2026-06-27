import assert from "node:assert/strict";

import {
  buildQuickTripAiRequest,
  getQuickTripAiConfigFromEnv,
  getQuickTripAiFetchTimeoutMs,
  getQuickTripAiProvider,
  parseQuickTripAiJson,
  parseQuickTripAiJsonMany,
} from "../lib/quick-trip-entry/ai-provider";

const config = getQuickTripAiConfigFromEnv({
  QUICK_TRIP_AI_BASE_URL: "http://localhost:20128/v1",
  QUICK_TRIP_AI_API_KEY: "test-key",
  QUICK_TRIP_AI_MODEL: "cx/gpt-5.4-mini",
});

assert.deepEqual(config, {
  baseUrl: "http://localhost:20128/v1",
  apiKey: "test-key",
  model: "cx/gpt-5.4-mini",
});

const request = buildQuickTripAiRequest("8h HN HP 150k 0912345678", config!);
assert.equal(request.url, "http://localhost:20128/v1/chat/completions");
assert.equal(request.body.model, "cx/gpt-5.4-mini");
assert.equal(request.headers.Authorization, "Bearer test-key");

assert.deepEqual(
  parseQuickTripAiJson('```json\n{"price":150000,"confidence":0.9}\n```'),
  { price: 150000, confidence: 0.9 },
);

const manyFromArray = parseQuickTripAiJsonMany(
  '```json\n[{"rawText":"8h HN HP","price":150000},{"rawText":"9h HP HN","price":200000}]\n```',
);
assert.equal(manyFromArray.length, 2);
assert.equal(manyFromArray[0].rawText, "8h HN HP");
assert.equal(manyFromArray[1].candidate.price, 200000);

const manyFromDrafts = parseQuickTripAiJsonMany(
  '{"drafts":[{"rawText":"8h HN HP","candidate":{"price":150000,"confidence":0.91}}]}',
);
assert.equal(manyFromDrafts.length, 1);
assert.equal(manyFromDrafts[0].candidate.price, 150000);
assert.equal(manyFromDrafts[0].candidate.confidence, 0.91);

const smartRequest = buildQuickTripAiRequest("cuoc 1. cuoc 2.", config!, {
  mode: "many",
  expectedDraftCount: 2,
});
assert.ok(smartRequest.body.messages[0].content.includes("JSON array"));
assert.ok(smartRequest.body.messages[1].content.includes("So draft du kien: 2"));

assert.equal(getQuickTripAiConfigFromEnv({}), null);

async function main() {
  const originalFetch = globalThis.fetch;
  let receivedSignal: AbortSignal | undefined;
  globalThis.fetch = (async (_url, init) => {
    receivedSignal = init?.signal as AbortSignal | undefined;
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"price":150000,"confidence":0.9}' } }],
      }),
    } as Response;
  }) as typeof fetch;

  const originalEnv = {
    QUICK_TRIP_AI_BASE_URL: process.env.QUICK_TRIP_AI_BASE_URL,
    QUICK_TRIP_AI_API_KEY: process.env.QUICK_TRIP_AI_API_KEY,
    QUICK_TRIP_AI_MODEL: process.env.QUICK_TRIP_AI_MODEL,
    QUICK_TRIP_AI_TIMEOUT_MS: process.env.QUICK_TRIP_AI_TIMEOUT_MS,
  };

  process.env.QUICK_TRIP_AI_BASE_URL = "http://localhost:20128/v1";
  process.env.QUICK_TRIP_AI_API_KEY = "test-key";
  process.env.QUICK_TRIP_AI_MODEL = "cx/gpt-5.4-mini";
  process.env.QUICK_TRIP_AI_TIMEOUT_MS = "1500";

  try {
    const timeoutProvider = getQuickTripAiProvider();
    assert.ok(timeoutProvider);
    await timeoutProvider.parse("8h HN - HP 150k");
    assert.ok(receivedSignal instanceof AbortSignal);
    assert.equal(getQuickTripAiFetchTimeoutMs(), 1500);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  console.log("quick-trip AI provider checks passed");
}

void main();
