import {
  getQuickTripAiProvider,
  type QuickTripAiProvider,
} from "./ai-provider";
import { parseQuickTripChunk, parseQuickTripInput } from "./parser";
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

function normalizeCandidate(candidate: QuickTripCandidate): QuickTripCandidate {
  const confidence = Number(candidate.confidence);

  return {
    ...candidate,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    missingFields: toStringArray(candidate.missingFields),
    warnings: toStringArray(candidate.warnings),
  };
}

function normalizeParsedChunk(chunk: ParsedQuickTripChunk): ParsedQuickTripChunk {
  const ruleCandidate = parseQuickTripChunk(chunk.rawText);
  const aiCandidate = chunk.candidate;

  return {
    rawText: chunk.rawText,
    candidate: normalizeCandidate({
      ...ruleCandidate,
      ...aiCandidate,
      confidence: Math.max(
        Number(ruleCandidate.confidence) || 0,
        Number(aiCandidate.confidence) || 0,
      ),
      missingFields: [],
      warnings: uniqueWarnings([
        ...toStringArray(ruleCandidate.warnings),
        ...toStringArray(aiCandidate.warnings),
      ]),
    }),
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
    return ruleChunks;
  }

  const provider =
    input.provider === undefined ? getQuickTripAiProvider() : input.provider;

  if (!provider) {
    return ruleChunks;
  }

  try {
    const aiChunks = await provider.parseMany(input.rawText, {
      expectedDraftCount: input.expectedDraftCount,
    });
    const normalizedAiChunks = aiChunks
      .map(normalizeParsedChunk)
      .filter((chunk) => chunk.rawText.trim());

    return normalizedAiChunks.length > 0 ? normalizedAiChunks : ruleChunks;
  } catch {
    return ruleChunks.map((chunk) => ({
      ...chunk,
      candidate: {
        ...chunk.candidate,
        warnings: uniqueWarnings([...chunk.candidate.warnings, "ai_parse_failed"]),
      },
    }));
  }
}
