import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  reparseQuickEntryItem,
  updateQuickEntryItem,
  type QuickEntryContext,
} from "@/lib/quick-trip-entry/service";
import type { QuickTripCandidate } from "@/lib/quick-trip-entry/types";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function getContext(): Promise<QuickEntryContext | NextResponse> {
  const user = await getSession();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  return { accountId: user.accountId, actorId: user.id };
}

function serviceError(error: unknown, label: string) {
  if (error instanceof Error) {
    if (error.message === "Item not found") {
      return jsonError(error.message, 404);
    }
    if (error.message === "Input text is required") {
      return jsonError(error.message, 400);
    }
    if (error.message === "Saved item cannot be edited") {
      return jsonError(error.message, 409);
    }
  }

  console.error(label, error);
  return jsonError("Internal server error", 500);
}

export async function PATCH(
  request: NextRequest,
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

    const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<
      string,
      unknown
    >;

    if (body.reparse === true && typeof body.rawText === "string") {
      const data = await reparseQuickEntryItem(prisma, context, id, body.rawText);
      return jsonSuccess(data);
    }

    if (!isRecord(body.parsedData)) {
      return jsonError("Parsed data is required", 400);
    }

    const data = await updateQuickEntryItem(
      prisma,
      context,
      id,
      body.parsedData as unknown as QuickTripCandidate,
    );

    return jsonSuccess(data);
  } catch (error) {
    return serviceError(error, "Update quick entry item error:");
  }
}
