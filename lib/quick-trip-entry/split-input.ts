import { expandGroupedDraftRequests } from "./grouped-draft-request";

const PHONE_PATTERN = /(?:^|[^\d])(?:0\d{9,10}|84\d{9,10})(?!\d)/;
const TIME_PATTERN = /(?:^|[^\d])(?:[01]?\d|2[0-3])(?:\s*h(?:\s*[0-5]\d)?|:[0-5]\d)\b/i;
const PRICE_K_PATTERN = /(?:^|[\s,;])\d{2,4}(?:[.,]\d+)?\s*k\b/i;
const ROUTE_SEPARATOR_PATTERN = /\s(?:-|->|=>|>|→|đi|di|đến|den)\s/i;

function normalizeInput(rawText: string): string {
  return rawText.replace(/\r\n?/g, "\n").trim();
}

function looksLikeNewTripLine(line: string): boolean {
  const signals = [
    PHONE_PATTERN.test(line),
    TIME_PATTERN.test(line),
    PRICE_K_PATTERN.test(line),
  ].filter(Boolean).length;

  return signals >= 2 || (signals >= 1 && ROUTE_SEPARATOR_PATTERN.test(line));
}

export function splitQuickTripInput(rawText: string): string[] {
  const normalized = normalizeInput(rawText);

  if (!normalized) {
    return [];
  }

  const groupedDrafts = expandGroupedDraftRequests(normalized);
  if (groupedDrafts.length > 0) {
    return groupedDrafts;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return lines;
  }

  const chunks: string[] = [];
  let currentLines: string[] = [];

  for (const line of lines) {
    if (currentLines.length > 0 && looksLikeNewTripLine(line)) {
      chunks.push(currentLines.join("\n"));
      currentLines = [];
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    chunks.push(currentLines.join("\n"));
  }

  return chunks;
}
