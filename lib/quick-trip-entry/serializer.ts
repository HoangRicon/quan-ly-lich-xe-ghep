import type { Prisma } from "@prisma/client";

import { QUICK_ENTRY_ITEM_STATUSES } from "./types";

export type QuickEntrySessionWithCounts =
  Prisma.QuickTripEntrySessionGetPayload<{
    include: {
      items: {
        select: {
          parseStatus: true;
        };
      };
    };
  }>;

export type QuickEntryItemPayload = Prisma.QuickTripEntryItemGetPayload<object>;

function jsonArrayOrEmpty(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function serializeQuickEntrySession(
  session: QuickEntrySessionWithCounts,
) {
  const pendingStatuses = new Set<string>([
    QUICK_ENTRY_ITEM_STATUSES.PENDING,
    QUICK_ENTRY_ITEM_STATUSES.PARSED,
    QUICK_ENTRY_ITEM_STATUSES.NEEDS_REVIEW,
  ]);

  return {
    id: session.id,
    name: session.name,
    sourceType: session.sourceType,
    status: session.status,
    lastInputAt: session.lastInputAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    pendingCount: session.items.filter((item) =>
      pendingStatuses.has(item.parseStatus),
    ).length,
    errorCount: session.items.filter(
      (item) => item.parseStatus === QUICK_ENTRY_ITEM_STATUSES.FAILED,
    ).length,
  };
}

export function serializeQuickEntryItem(item: QuickEntryItemPayload) {
  // Infer parseMode from warnings: if ai_parse_failed exists, it's rule-based
  const warnings = jsonArrayOrEmpty(item.warnings);
  const hasAiFailedWarning = warnings.includes("ai_parse_failed");
  const parseMode: "smart" | "rule" | undefined = hasAiFailedWarning ? "rule" : "smart";

  return {
    id: item.id,
    sessionId: item.sessionId,
    rawText: item.rawText,
    source: item.source,
    parseMode,
    status: item.parseStatus,
    parsedData: item.parsedData,
    missingFields: jsonArrayOrEmpty(item.missingFields),
    warnings,
    confidence: item.confidence == null ? null : Number(item.confidence),
    createdTripId: item.createdTripId,
    errorMessage: item.errorMessage,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
