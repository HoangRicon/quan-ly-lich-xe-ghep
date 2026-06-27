import type { Prisma } from "@prisma/client";

import {
  CreateTripError,
  createTripForAccountInTransaction,
  type ParentDb,
} from "@/lib/trips/create-trip";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import {
  serializeQuickEntryItem,
  serializeQuickEntrySession,
  type QuickEntryItemPayload,
  type QuickEntrySessionWithCounts,
} from "./serializer";
import {
  QUICK_ENTRY_ITEM_STATUSES,
  QUICK_ENTRY_PROCESSING_MODES,
  type QuickEntryProcessingMode,
  type QuickEntrySource,
  type QuickTripCandidate,
} from "./types";
import {
  parseQuickEntryDrafts,
  type QuickEntryParseMode,
} from "./smart-parser";
import {
  QUICK_ENTRY_AUTO_SAVE_THRESHOLD,
  validateQuickTripCandidate,
} from "./validation";

export interface QuickEntryContext {
  accountId: number;
  actorId: number | null;
}

type TenantDb = ReturnType<typeof createTenantPrisma>;
type SerializedQuickEntryItem = ReturnType<typeof serializeQuickEntryItem>;

export interface CreateQuickEntryItemsInput {
  sessionId: number;
  rawText: string;
  source: QuickEntrySource;
  autoSave: boolean;
  parseMode?: QuickEntryParseMode;
  expectedDraftCount?: number;
  processingMode?: QuickEntryProcessingMode;
}

export type CreateQuickEntryItemsResult =
  | {
      processingMode: "sync";
      accepted: false;
      items: SerializedQuickEntryItem[];
    }
  | {
      processingMode: "async";
      accepted: true;
      queuedAt: string;
      items: SerializedQuickEntryItem[];
    };

const SESSION_WITH_COUNTS_INCLUDE = {
  items: {
    select: {
      parseStatus: true,
    },
  },
} satisfies Prisma.QuickTripEntrySessionInclude;

const UNFINISHED_STATUSES = [
  QUICK_ENTRY_ITEM_STATUSES.PENDING,
  QUICK_ENTRY_ITEM_STATUSES.PARSED,
  QUICK_ENTRY_ITEM_STATUSES.NEEDS_REVIEW,
];
const INVALID_DRIVER_WARNING = "invalid_driver";
const SAVED_STATUSES = [
  QUICK_ENTRY_ITEM_STATUSES.AUTO_SAVED,
  QUICK_ENTRY_ITEM_STATUSES.SAVED,
];
const quickEntryProcessingQueues = new Map<string, Promise<void>>();

function getTenantDb(parentDb: ParentDb, context: QuickEntryContext): TenantDb {
  return createTenantPrisma(parentDb, context.accountId);
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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

function extractCandidate(item: QuickEntryItemPayload): QuickTripCandidate {
  if (
    item.parsedData === null ||
    typeof item.parsedData !== "object" ||
    Array.isArray(item.parsedData)
  ) {
    return {
      confidence: 0,
      missingFields: [],
      warnings: [],
    };
  }

  const data = item.parsedData as Record<string, unknown>;

  return normalizeCandidate(data as unknown as QuickTripCandidate);
}

function statusForValidation(candidate: QuickTripCandidate): string {
  return candidate.missingFields.length > 0
    ? QUICK_ENTRY_ITEM_STATUSES.NEEDS_REVIEW
    : QUICK_ENTRY_ITEM_STATUSES.PARSED;
}

function getSafeSaveErrorMessage(error: unknown): string {
  if (error instanceof CreateTripError) {
    return error.message;
  }

  return "Save failed";
}

function normalizeSourceType(sourceType: string | undefined): string {
  const normalized = sourceType?.trim().slice(0, 50);
  return normalized || "conversation";
}

function uniqueWarnings(warnings: string[]): string[] {
  return [...new Set(warnings)];
}

function normalizeManualEditedCandidate(
  candidate: QuickTripCandidate,
): QuickTripCandidate {
  const confidence = Number(candidate.confidence);

  return normalizeCandidate({
    ...candidate,
    confidence: Math.max(
      Number.isFinite(confidence) ? confidence : 0,
      QUICK_ENTRY_AUTO_SAVE_THRESHOLD,
    ),
    missingFields: [],
    warnings: [],
  });
}

function hasBlockingValidationIssue(candidate: QuickTripCandidate) {
  return candidate.missingFields.length > 0;
}

function getQuickEntryProcessingQueueKey(
  context: QuickEntryContext,
  input: CreateQuickEntryItemsInput,
) {
  return `${context.accountId}:${input.sessionId}`;
}

async function validateQuickTripCandidateForAccount(
  db: TenantDb,
  candidate: QuickTripCandidate,
) {
  const validation = validateQuickTripCandidate(normalizeCandidate(candidate));
  const warnings = [...validation.candidate.warnings];
  const driverId = validation.candidate.driverId as unknown;

  if (driverId != null) {
    const hasValidDriverId =
      typeof driverId === "number" &&
      Number.isInteger(driverId) &&
      driverId > 0;
    const driver = hasValidDriverId
      ? await db.user.findFirst({
          where: { id: driverId, role: "driver" },
          select: { id: true },
        })
      : null;

    if (!driver) {
      warnings.push(INVALID_DRIVER_WARNING);
    }
  }

  const validatedCandidate = {
    ...validation.candidate,
    warnings: uniqueWarnings(warnings),
  };

  return {
    candidate: validatedCandidate,
    canAutoSave:
      validation.canAutoSave && validatedCandidate.warnings.length === 0,
  };
}

async function findSessionWithCounts(db: TenantDb, sessionId: number) {
  return (await db.quickTripEntrySession.findFirst({
    where: { id: sessionId },
    include: SESSION_WITH_COUNTS_INCLUDE,
  })) as QuickEntrySessionWithCounts | null;
}

async function findItem(db: TenantDb, itemId: number) {
  return (await db.quickTripEntryItem.findFirst({
    where: { id: itemId },
  })) as QuickEntryItemPayload | null;
}

async function touchQuickEntrySession(
  db: TenantDb,
  sessionId: number,
  lastInputAt: Date,
) {
  await db.quickTripEntrySession.update({
    where: { id: sessionId },
    data: { lastInputAt },
  });
}

async function markQuickEntryItemFailed(
  parentDb: ParentDb,
  context: QuickEntryContext,
  itemId: number,
  errorMessage: string,
) {
  try {
    const db = getTenantDb(parentDb, context);
    const item = await findItem(db, itemId);

    if (!item) {
      return null;
    }

    const updatedItem = (await db.quickTripEntryItem.update({
      where: { id: itemId },
      data: {
        parseStatus: QUICK_ENTRY_ITEM_STATUSES.FAILED,
        errorMessage,
      },
    })) as QuickEntryItemPayload;

    return serializeQuickEntryItem(updatedItem);
  } catch {
    return null;
  }
}

async function persistQuickEntryChunk(
  parentDb: ParentDb,
  context: QuickEntryContext,
  input: CreateQuickEntryItemsInput,
  chunk: Awaited<ReturnType<typeof parseQuickEntryDrafts>>[number],
  placeholderItemId?: number,
): Promise<SerializedQuickEntryItem> {
  const db = getTenantDb(parentDb, context);
  const validation = await validateQuickTripCandidateForAccount(
    db,
    chunk.candidate,
  );
  const candidate = validation.candidate;
  const itemData = {
    rawText: chunk.rawText,
    source: input.source,
    parseStatus: statusForValidation(candidate),
    parsedData: toInputJsonValue(candidate),
    missingFields: toInputJsonValue(candidate.missingFields),
    warnings: toInputJsonValue(candidate.warnings),
    confidence: candidate.confidence,
    errorMessage: null,
  };
  const item = placeholderItemId
    ? ((await db.quickTripEntryItem.update({
        where: { id: placeholderItemId },
        data: itemData,
      })) as QuickEntryItemPayload)
    : ((await db.quickTripEntryItem.create({
        data: {
          sessionId: input.sessionId,
          ...itemData,
        },
      })) as QuickEntryItemPayload);

  if (input.autoSave && validation.canAutoSave) {
    return saveQuickEntryItem(parentDb, context, item.id, true);
  }

  return serializeQuickEntryItem(item);
}

async function processQuickEntryItemsNow(
  parentDb: ParentDb,
  context: QuickEntryContext,
  input: CreateQuickEntryItemsInput,
  placeholderItemIds: number[] = [],
) {
  const parsedChunks = await parseQuickEntryDrafts({
    rawText: input.rawText,
    parseMode: input.parseMode ?? "smart",
    expectedDraftCount: input.expectedDraftCount,
  });

  if (parsedChunks.length === 0) {
    if (placeholderItemIds.length > 0) {
      const failedItems = await Promise.all(
        placeholderItemIds.map((placeholderItemId) =>
          markQuickEntryItemFailed(
            parentDb,
            context,
            placeholderItemId,
            "No draft created from input",
          ),
        ),
      );
      return failedItems.filter(
        (item): item is SerializedQuickEntryItem => item !== null,
      );
    }

    return [];
  }

  const createdItems: SerializedQuickEntryItem[] = [];

  for (const [index, chunk] of parsedChunks.entries()) {
    createdItems.push(
      await persistQuickEntryChunk(
        parentDb,
        context,
        input,
        chunk,
        placeholderItemIds[index],
      ),
    );
  }

  for (const unusedPlaceholderId of placeholderItemIds.slice(parsedChunks.length)) {
    await markQuickEntryItemFailed(
      parentDb,
      context,
      unusedPlaceholderId,
      "No draft created for this placeholder",
    );
  }

  return createdItems;
}

export function enqueueQuickEntryItemsProcessing(
  parentDb: ParentDb,
  context: QuickEntryContext,
  input: CreateQuickEntryItemsInput,
  placeholderItemIds: number[],
) {
  const queueKey = getQuickEntryProcessingQueueKey(context, input);
  const previousJob = quickEntryProcessingQueues.get(queueKey) ?? Promise.resolve();
  const nextJob = previousJob
    .catch(() => undefined)
    .then(async () => {
      try {
        await processQuickEntryItemsNow(parentDb, context, input, placeholderItemIds);
      } catch (error) {
        console.error("Quick entry background processing error:", error);
        await Promise.all(
          placeholderItemIds.map((placeholderItemId) =>
            markQuickEntryItemFailed(
              parentDb,
              context,
              placeholderItemId,
              "Background processing failed",
            ),
          ),
        );
      }
    });

  quickEntryProcessingQueues.set(queueKey, nextJob);
  void nextJob.finally(() => {
    if (quickEntryProcessingQueues.get(queueKey) === nextJob) {
      quickEntryProcessingQueues.delete(queueKey);
    }
  });
}

async function createPendingQuickEntryPlaceholderItems(
  db: TenantDb,
  input: CreateQuickEntryItemsInput,
) {
  const count = input.expectedDraftCount ?? 1;
  const safeCount = Number.isInteger(count) && count > 0 ? Math.min(count, 100) : 1;
  const placeholderItems: QuickEntryItemPayload[] = [];

  for (let index = 0; index < safeCount; index += 1) {
    const placeholderItem = (await db.quickTripEntryItem.create({
      data: {
        sessionId: input.sessionId,
        rawText:
          safeCount === 1 ? input.rawText : `${input.rawText}\n#${index + 1}`,
        source: input.source,
        parseStatus: QUICK_ENTRY_ITEM_STATUSES.PENDING,
        parsedData: null,
        missingFields: toInputJsonValue([]),
        warnings: toInputJsonValue([]),
        confidence: null,
        errorMessage: null,
      },
    })) as QuickEntryItemPayload;

    placeholderItems.push(placeholderItem);
  }

  return placeholderItems;
}

export async function listQuickEntrySessions(
  parentDb: ParentDb,
  context: QuickEntryContext,
) {
  const db = getTenantDb(parentDb, context);
  const sessions = (await db.quickTripEntrySession.findMany({
    where: { status: "active" },
    orderBy: { updatedAt: "desc" },
    include: SESSION_WITH_COUNTS_INCLUDE,
  })) as QuickEntrySessionWithCounts[];

  return sessions.map(serializeQuickEntrySession);
}

export async function createQuickEntrySession(
  parentDb: ParentDb,
  context: QuickEntryContext,
  input: { name: string; sourceType?: string },
) {
  const db = getTenantDb(parentDb, context);
  const name = input.name.trim().slice(0, 120);
  if (!name) {
    throw new Error("Session name is required");
  }

  const sourceType = normalizeSourceType(input.sourceType);
  const session = (await db.quickTripEntrySession.create({
    data: {
      name,
      sourceType,
      ...(context.actorId ? { createdById: context.actorId } : {}),
    },
    include: SESSION_WITH_COUNTS_INCLUDE,
  })) as QuickEntrySessionWithCounts;

  return serializeQuickEntrySession(session);
}

export async function updateQuickEntrySession(
  parentDb: ParentDb,
  context: QuickEntryContext,
  sessionId: number,
  input: { name?: string; status?: "active" | "archived" },
) {
  const db = getTenantDb(parentDb, context);
  const existing = await findSessionWithCounts(db, sessionId);

  if (!existing) {
    throw new Error("Session not found");
  }

  const data: Prisma.QuickTripEntrySessionUpdateInput = {};

  if (input.name !== undefined) {
    const name = input.name.trim().slice(0, 120);
    if (!name) {
      throw new Error("Session name is required");
    }
    data.name = name;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  const session = (await db.quickTripEntrySession.update({
    where: { id: sessionId },
    data,
    include: SESSION_WITH_COUNTS_INCLUDE,
  })) as QuickEntrySessionWithCounts;

  return serializeQuickEntrySession(session);
}

export async function listQuickEntryItems(
  parentDb: ParentDb,
  context: QuickEntryContext,
  sessionId: number,
) {
  const db = getTenantDb(parentDb, context);
  const session = await findSessionWithCounts(db, sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  const items = (await db.quickTripEntryItem.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  })) as QuickEntryItemPayload[];

  return items.map(serializeQuickEntryItem);
}

export async function createQuickEntryItems(
  parentDb: ParentDb,
  context: QuickEntryContext,
  input: CreateQuickEntryItemsInput,
): Promise<CreateQuickEntryItemsResult> {
  const db = getTenantDb(parentDb, context);
  const session = await findSessionWithCounts(db, input.sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  const now = new Date();
  const processingMode =
    input.processingMode ?? QUICK_ENTRY_PROCESSING_MODES.SYNC;

  await touchQuickEntrySession(db, input.sessionId, now);

  if (processingMode === QUICK_ENTRY_PROCESSING_MODES.ASYNC) {
    const placeholderItems = await createPendingQuickEntryPlaceholderItems(db, input);
    enqueueQuickEntryItemsProcessing(
      parentDb,
      context,
      input,
      placeholderItems.map((item) => item.id),
    );

    return {
      processingMode: QUICK_ENTRY_PROCESSING_MODES.ASYNC,
      accepted: true,
      queuedAt: now.toISOString(),
      items: placeholderItems.map(serializeQuickEntryItem),
    };
  }

  const createdItems = await processQuickEntryItemsNow(parentDb, context, input);

  return {
    processingMode: QUICK_ENTRY_PROCESSING_MODES.SYNC,
    accepted: false,
    items: createdItems,
  };
}

export async function updateQuickEntryItem(
  parentDb: ParentDb,
  context: QuickEntryContext,
  itemId: number,
  parsedData: QuickTripCandidate,
) {
  return parentDb.$transaction(async (tx) => {
    const txDb = createTenantPrisma(tx, context.accountId);
    const lockedRows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM quick_trip_entry_items
      WHERE id = ${itemId} AND account_id = ${context.accountId}
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new Error("Item not found");
    }

    const existingItem = await findItem(txDb, itemId);

    if (!existingItem) {
      throw new Error("Item not found");
    }

    if (
      existingItem.createdTripId ||
      SAVED_STATUSES.includes(
        existingItem.parseStatus as (typeof SAVED_STATUSES)[number],
      )
    ) {
      throw new Error("Saved item cannot be edited");
    }

    const validation = await validateQuickTripCandidateForAccount(
      txDb,
      normalizeManualEditedCandidate(parsedData),
    );
    const candidate = validation.candidate;
    const item = (await txDb.quickTripEntryItem.update({
      where: { id: itemId },
      data: {
        parsedData: toInputJsonValue(candidate),
        missingFields: toInputJsonValue(candidate.missingFields),
        warnings: toInputJsonValue(candidate.warnings),
        confidence: candidate.confidence,
        parseStatus: statusForValidation(candidate),
        errorMessage: null,
      },
    })) as QuickEntryItemPayload;

    return serializeQuickEntryItem(item);
  });
}

export async function reparseQuickEntryItem(
  parentDb: ParentDb,
  context: QuickEntryContext,
  itemId: number,
  rawText: string,
  parseMode: QuickEntryParseMode = "smart",
) {
  const text = rawText.trim();

  if (!text) {
    throw new Error("Input text is required");
  }

  const parsedChunks = await parseQuickEntryDrafts({
    rawText: text,
    parseMode,
  });
  const firstChunk = parsedChunks[0];

  return parentDb.$transaction(async (tx) => {
    const txDb = createTenantPrisma(tx, context.accountId);
    const lockedRows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM quick_trip_entry_items
      WHERE id = ${itemId} AND account_id = ${context.accountId}
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new Error("Item not found");
    }

    const existingItem = await findItem(txDb, itemId);

    if (!existingItem) {
      throw new Error("Item not found");
    }

    if (
      existingItem.createdTripId ||
      SAVED_STATUSES.includes(
        existingItem.parseStatus as (typeof SAVED_STATUSES)[number],
      )
    ) {
      throw new Error("Saved item cannot be edited");
    }

    if (!firstChunk) {
      const item = (await txDb.quickTripEntryItem.update({
        where: { id: itemId },
        data: {
          rawText: text,
          parseStatus: QUICK_ENTRY_ITEM_STATUSES.FAILED,
          parsedData: null,
          missingFields: toInputJsonValue([]),
          warnings: toInputJsonValue([]),
          confidence: null,
          errorMessage: "No draft created from input",
        },
      })) as QuickEntryItemPayload;

      return serializeQuickEntryItem(item);
    }

    const validation = await validateQuickTripCandidateForAccount(
      txDb,
      firstChunk.candidate,
    );
    const candidate = validation.candidate;
    const item = (await txDb.quickTripEntryItem.update({
      where: { id: itemId },
      data: {
        rawText: text,
        parsedData: toInputJsonValue(candidate),
        missingFields: toInputJsonValue(candidate.missingFields),
        warnings: toInputJsonValue(candidate.warnings),
        confidence: candidate.confidence,
        parseStatus: statusForValidation(candidate),
        errorMessage: null,
      },
    })) as QuickEntryItemPayload;

    return serializeQuickEntryItem(item);
  });
}

export async function saveQuickEntryItem(
  parentDb: ParentDb,
  context: QuickEntryContext,
  itemId: number,
  autoSaved = false,
) {
  try {
    return await parentDb.$transaction(async (tx) => {
      const txDb = createTenantPrisma(tx, context.accountId);
      const lockedRows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id
        FROM quick_trip_entry_items
        WHERE id = ${itemId} AND account_id = ${context.accountId}
        FOR UPDATE
      `;

      if (lockedRows.length === 0) {
        throw new Error("Item not found");
      }

      const item = await findItem(txDb, itemId);

      if (!item) {
        throw new Error("Item not found");
      }

      if (item.createdTripId) {
        return serializeQuickEntryItem(item);
      }

      if (item.parseStatus === QUICK_ENTRY_ITEM_STATUSES.DISCARDED) {
        return serializeQuickEntryItem(item);
      }

      const validation = await validateQuickTripCandidateForAccount(
        txDb,
        extractCandidate(item),
      );
      const candidate = validation.candidate;

      if (hasBlockingValidationIssue(candidate)) {
        const updatedItem = (await txDb.quickTripEntryItem.update({
          where: { id: item.id },
          data: {
            parseStatus: QUICK_ENTRY_ITEM_STATUSES.NEEDS_REVIEW,
            parsedData: toInputJsonValue(candidate),
            missingFields: toInputJsonValue(candidate.missingFields),
            warnings: toInputJsonValue(candidate.warnings),
            confidence: candidate.confidence,
            errorMessage: "Item needs review before saving",
          },
        })) as QuickEntryItemPayload;

        return serializeQuickEntryItem(updatedItem);
      }

      const trip = await createTripForAccountInTransaction(
        tx,
        {
          customerPhone: candidate.customerPhone!,
          customerName: candidate.customerName,
          departure: candidate.departure!,
          destination: candidate.destination!,
          pickupLocation: candidate.pickupLocation,
          dropoffLocation: candidate.dropoffLocation,
          departureTime: candidate.departureTime!,
          price: candidate.price!,
          title: `${candidate.departure} - ${candidate.destination}`,
          totalSeats: candidate.totalSeats || 1,
          tripType: candidate.tripType ?? "ghep",
          tripDirection: candidate.tripDirection ?? "oneway",
          driverId: candidate.driverId ?? null,
          notes: candidate.notes || item.rawText,
          seats: candidate.totalSeats || 1,
        },
        context,
      );

      const updatedItem = (await txDb.quickTripEntryItem.update({
        where: { id: item.id },
        data: {
          parseStatus: autoSaved
            ? QUICK_ENTRY_ITEM_STATUSES.AUTO_SAVED
            : QUICK_ENTRY_ITEM_STATUSES.SAVED,
          createdTripId: trip.id,
          errorMessage: null,
        },
      })) as QuickEntryItemPayload;

      return serializeQuickEntryItem(updatedItem);
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Item not found") {
      throw error;
    }

    const db = getTenantDb(parentDb, context);
    const item = await findItem(db, itemId);

    if (!item) {
      throw new Error("Item not found");
    }

    const updatedItem = (await db.quickTripEntryItem.update({
      where: { id: itemId },
      data: {
        parseStatus: QUICK_ENTRY_ITEM_STATUSES.FAILED,
        errorMessage: getSafeSaveErrorMessage(error),
      },
    })) as QuickEntryItemPayload;

    return serializeQuickEntryItem(updatedItem);
  }
}

export async function saveValidQuickEntryItems(
  parentDb: ParentDb,
  context: QuickEntryContext,
  sessionId: number,
) {
  const db = getTenantDb(parentDb, context);
  const session = await findSessionWithCounts(db, sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  const items = (await db.quickTripEntryItem.findMany({
    where: {
      sessionId,
      parseStatus: QUICK_ENTRY_ITEM_STATUSES.PARSED,
    },
    orderBy: { createdAt: "asc" },
  })) as QuickEntryItemPayload[];
  const results: ReturnType<typeof serializeQuickEntryItem>[] = [];

  for (const item of items) {
    try {
      results.push(await saveQuickEntryItem(parentDb, context, item.id));
    } catch (error) {
      const updatedItem = (await db.quickTripEntryItem.update({
        where: { id: item.id },
        data: {
          parseStatus: QUICK_ENTRY_ITEM_STATUSES.FAILED,
          errorMessage: getSafeSaveErrorMessage(error),
        },
      })) as QuickEntryItemPayload;
      results.push(serializeQuickEntryItem(updatedItem));
    }
  }

  return results;
}

export async function discardQuickEntryItem(
  parentDb: ParentDb,
  context: QuickEntryContext,
  itemId: number,
) {
  return parentDb.$transaction(async (tx) => {
    const txDb = createTenantPrisma(tx, context.accountId);
    const lockedRows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id
      FROM quick_trip_entry_items
      WHERE id = ${itemId} AND account_id = ${context.accountId}
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      throw new Error("Item not found");
    }

    const item = await findItem(txDb, itemId);

    if (!item) {
      throw new Error("Item not found");
    }

    if (
      item.createdTripId ||
      SAVED_STATUSES.includes(item.parseStatus as (typeof SAVED_STATUSES)[number])
    ) {
      throw new Error("Saved item cannot be discarded");
    }

    const updatedItem = (await txDb.quickTripEntryItem.update({
      where: { id: itemId },
      data: {
        parseStatus: QUICK_ENTRY_ITEM_STATUSES.DISCARDED,
        errorMessage: null,
      },
    })) as QuickEntryItemPayload;

    return serializeQuickEntryItem(updatedItem);
  });
}

export async function deleteQuickEntrySession(
  parentDb: ParentDb,
  context: QuickEntryContext,
  sessionId: number,
  confirmDiscard: boolean,
) {
  const db = getTenantDb(parentDb, context);
  const session = await findSessionWithCounts(db, sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  const unfinishedCount = await db.quickTripEntryItem.count({
    where: {
      sessionId,
      parseStatus: { in: UNFINISHED_STATUSES },
    },
  });

  if (unfinishedCount > 0 && !confirmDiscard) {
    return { deleted: false, blocked: true, unfinishedCount };
  }

  await db.quickTripEntrySession.delete({
    where: { id: sessionId },
  });

  return { deleted: true, blocked: false, unfinishedCount: 0 };
}
