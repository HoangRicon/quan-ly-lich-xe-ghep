import {
  getQuickTripAiProvider,
  type QuickTripAiProvider,
} from "./ai-provider";
import {
  hasRelativeDateExpression,
  hasRelativeTimeOffsetExpression,
  parseQuickTripChunk,
  parseQuickTripInput,
} from "./parser";
import { inferGroupedDraftCount } from "./grouped-draft-request";
import type { ParsedQuickTripChunk, QuickTripCandidate } from "./types";

export type QuickEntryParseMode = "rule" | "smart";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function uniqueWarnings(warnings: string[]): string[] {
  return [...new Set(warnings)];
}

function pickUsefulCandidateFields(
  candidate: Partial<QuickTripCandidate>,
): Partial<QuickTripCandidate> {
  return Object.fromEntries(
    Object.entries(candidate).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      return typeof value !== "string" || value.trim() !== "";
    }),
  ) as Partial<QuickTripCandidate>;
}

function chooseMergedPrice(
  rulePrice: number | undefined,
  aiPrice: number | undefined,
) {
  if (!Number.isFinite(aiPrice) || aiPrice == null || aiPrice <= 0) {
    return rulePrice;
  }

  if (
    Number.isFinite(rulePrice) &&
    rulePrice != null &&
    rulePrice > 0 &&
    rulePrice >= 10_000 &&
    aiPrice < 10_000
  ) {
    return rulePrice;
  }

  return aiPrice;
}

function chooseMergedDepartureTime(
  rawText: string,
  ruleDepartureTime: string | undefined,
  aiDepartureTime: string | undefined,
) {
  if (
    (hasRelativeDateExpression(rawText) ||
      hasRelativeTimeOffsetExpression(rawText)) &&
    ruleDepartureTime
  ) {
    return ruleDepartureTime;
  }

  return aiDepartureTime ?? ruleDepartureTime;
}

function normalizeCandidate(candidate: QuickTripCandidate): QuickTripCandidate {
  const confidence = Number(candidate.confidence);

  return {
    ...candidate,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    missingFields: toStringArray(candidate.missingFields),
    warnings: toStringArray(candidate.warnings),
  };
}

function stripAutoLocations(candidate: QuickTripCandidate): QuickTripCandidate {
  const rest = { ...candidate };
  delete rest.pickupLocation;
  delete rest.dropoffLocation;

  return rest;
}

function stripAutoLocationChunk(chunk: ParsedQuickTripChunk): ParsedQuickTripChunk {
  return {
    ...chunk,
    candidate: stripAutoLocations(chunk.candidate),
  };
}

function normalizeParsedChunk(chunk: ParsedQuickTripChunk): ParsedQuickTripChunk {
  const ruleCandidate = parseQuickTripChunk(chunk.rawText);
  const aiCandidate = chunk.candidate;

  return {
    rawText: chunk.rawText,
    candidate: stripAutoLocations(normalizeCandidate({
      ...ruleCandidate,
      ...pickUsefulCandidateFields(aiCandidate),
      departureTime: chooseMergedDepartureTime(
        chunk.rawText,
        ruleCandidate.departureTime,
        aiCandidate.departureTime,
      ),
      price: chooseMergedPrice(ruleCandidate.price, aiCandidate.price),
      confidence: Math.max(
        Number(ruleCandidate.confidence) || 0,
        Number(aiCandidate.confidence) || 0,
      ),
      missingFields: [],
      warnings: uniqueWarnings([
        ...toStringArray(ruleCandidate.warnings),
        ...toStringArray(aiCandidate.warnings),
      ]),
    })),
  };
}

export async function parseQuickEntryDrafts(input: {
  rawText: string;
  parseMode?: QuickEntryParseMode;
  expectedDraftCount?: number;
  provider?: QuickTripAiProvider | null;
}): Promise<ParsedQuickTripChunk[]> {
  const ruleChunks = parseQuickTripInput(input.rawText);

  if (input.parseMode === "rule") {
    return ruleChunks.map(stripAutoLocationChunk);
  }

  const provider =
    input.provider === undefined ? getQuickTripAiProvider() : input.provider;

  if (!provider) {
    return ruleChunks.map(stripAutoLocationChunk);
  }

  try {
    const aiChunks = await provider.parseMany(input.rawText, {
      expectedDraftCount: input.expectedDraftCount,
    });
    const normalizedAiChunks = aiChunks
      .map(normalizeParsedChunk)
      .filter((chunk) => chunk.rawText.trim());
    const groupedDraftCount = inferGroupedDraftCount(input.rawText);

    if (
      groupedDraftCount &&
      normalizedAiChunks.length < groupedDraftCount &&
      ruleChunks.length >= groupedDraftCount
    ) {
      return ruleChunks.map(stripAutoLocationChunk);
    }

    return normalizedAiChunks.length > 0
      ? normalizedAiChunks
      : ruleChunks.map(stripAutoLocationChunk);
  } catch {
    return ruleChunks.map((chunk) =>
      stripAutoLocationChunk({
        ...chunk,
        candidate: {
          ...chunk.candidate,
          warnings: uniqueWarnings([...chunk.candidate.warnings, "ai_parse_failed"]),
        },
      }),
    );
  }
}
