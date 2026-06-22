import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { QuickEntryContext } from "@/lib/quick-trip-entry/service";

function jsonSuccess(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function parseRouteId(id: string) {
  const value = Number(id);
  return Number.isInteger(value) && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  return value == null ? undefined : (value as Prisma.InputJsonValue);
}

async function getContext(): Promise<QuickEntryContext | NextResponse> {
  const user = await getSession();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  return { accountId: user.accountId, actorId: user.id };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const context = await getContext();
    if (context instanceof NextResponse) return context;

    const { itemId } = await params;
    const id = parseRouteId(itemId);

    if (id === null) {
      return jsonError("Invalid item id", 400);
    }

    const original = await prisma.quickTripEntryItem.findFirst({
      where: { id, accountId: context.accountId },
    });

    if (!original) {
      return jsonError("Item not found", 404);
    }

    const duplicated = await prisma.quickTripEntryItem.create({
      data: {
        sessionId: original.sessionId,
        accountId: original.accountId,
        rawText: original.rawText,
        source: original.source,
        parseStatus: original.parseStatus,
        parsedData: toInputJsonValue(original.parsedData),
        missingFields: toInputJsonValue(original.missingFields),
        warnings: toInputJsonValue(original.warnings),
        confidence: original.confidence,
      },
    });

    const serialized = {
      id: duplicated.id,
      sessionId: duplicated.sessionId,
      rawText: duplicated.rawText,
      source: duplicated.source,
      status: duplicated.parseStatus,
      parsedData: duplicated.parsedData,
      missingFields:
        duplicated.missingFields != null
          ? (duplicated.missingFields as string[])
          : [],
      warnings: duplicated.warnings != null ? (duplicated.warnings as string[]) : [],
      confidence: duplicated.confidence
        ? Number(duplicated.confidence)
        : null,
      createdTripId: duplicated.createdTripId,
      errorMessage: duplicated.errorMessage,
      createdAt: duplicated.createdAt.toISOString(),
      updatedAt: duplicated.updatedAt.toISOString(),
    };

    return jsonSuccess(serialized);
  } catch (error) {
    console.error("Duplicate quick entry item error:", error);
    return jsonError("Internal server error", 500);
  }
}
