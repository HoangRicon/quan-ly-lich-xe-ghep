import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createQuickEntryItems,
  listQuickEntryItems,
  type QuickEntryContext,
} from "@/lib/quick-trip-entry/service";
import type {
  QuickEntryProcessingMode,
  QuickEntrySource,
} from "@/lib/quick-trip-entry/types";

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

function normalizeSource(value: unknown): QuickEntrySource {
  return value === "voice" || value === "paste" ? value : "text";
}

function normalizeParseMode(value: unknown) {
  return value === "rule" ? "rule" : "smart";
}

function normalizeExpectedDraftCount(value: unknown): number | undefined {
  const count = Number(value);
  return Number.isInteger(count) && count > 0 && count <= 100 ? count : undefined;
}

function normalizeProcessingMode(value: unknown): QuickEntryProcessingMode {
  return value === "async" ? "async" : "sync";
}

async function getContext(): Promise<QuickEntryContext | NextResponse> {
  const user = await getSession();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  return { accountId: user.accountId, actorId: user.id };
}

function serviceError(error: unknown, label: string) {
  if (error instanceof Error && error.message === "Session not found") {
    return jsonError(error.message, 404);
  }

  console.error(label, error);
  return jsonError("Internal server error", 500);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getContext();
    if (context instanceof NextResponse) return context;

    const { id } = await params;
    const sessionId = parseRouteId(id);

    if (sessionId === null) {
      return jsonError("Invalid session id", 400);
    }

    const data = await listQuickEntryItems(prisma, context, sessionId);
    return jsonSuccess(data);
  } catch (error) {
    return serviceError(error, "List quick entry items error:");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getContext();
    if (context instanceof NextResponse) return context;

    const { id } = await params;
    const sessionId = parseRouteId(id);

    if (sessionId === null) {
      return jsonError("Invalid session id", 400);
    }

    const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<
      string,
      unknown
    >;
    const rawText = String(body.rawText || "").trim();

    if (!rawText) {
      return jsonError("Input text is required", 400);
    }

    const data = await createQuickEntryItems(prisma, context, {
      sessionId,
      rawText,
      source: normalizeSource(body.source),
      autoSave: body.autoSave !== false,
      parseMode: normalizeParseMode(body.parseMode),
      expectedDraftCount: normalizeExpectedDraftCount(body.expectedDraftCount),
      processingMode: normalizeProcessingMode(body.processingMode),
    });

    if (data.processingMode === "async") {
      return jsonSuccess(data, { status: 202 });
    }

    return jsonSuccess(data.items, { status: 201 });
  } catch (error) {
    return serviceError(error, "Create quick entry items error:");
  }
}
