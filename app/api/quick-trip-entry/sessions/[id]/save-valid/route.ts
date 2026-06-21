import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  saveValidQuickEntryItems,
  type QuickEntryContext,
} from "@/lib/quick-trip-entry/service";

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

async function getContext(): Promise<QuickEntryContext | NextResponse> {
  const user = await getSession();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  return { accountId: user.accountId, actorId: user.id };
}

export async function POST(
  request: Request,
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

    const data = await saveValidQuickEntryItems(prisma, context, sessionId);
    return jsonSuccess(data);
  } catch (error) {
    if (error instanceof Error && error.message === "Session not found") {
      return jsonError(error.message, 404);
    }

    console.error("Save valid quick entry items error:", error);
    return jsonError("Internal server error", 500);
  }
}
