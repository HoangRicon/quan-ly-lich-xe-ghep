import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteQuickEntrySession,
  updateQuickEntrySession,
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

function serviceError(error: unknown, label: string) {
  if (error instanceof Error) {
    if (error.message === "Session not found") {
      return jsonError(error.message, 404);
    }
    if (error.message === "Session name is required") {
      return jsonError(error.message, 400);
    }
  }

  console.error(label, error);
  return jsonError("Internal server error", 500);
}

export async function PATCH(
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
    const update: { name?: string; status?: "active" | "archived" } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 120);
      if (!name) {
        return jsonError("Session name is required", 400);
      }
      update.name = name;
    }

    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "archived") {
        return jsonError("Invalid session status", 400);
      }
      update.status = body.status;
    }

    const session = await updateQuickEntrySession(
      prisma,
      context,
      sessionId,
      update,
    );

    return jsonSuccess(session);
  } catch (error) {
    return serviceError(error, "Update quick entry session error:");
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const result = await deleteQuickEntrySession(
      prisma,
      context,
      sessionId,
      searchParams.get("confirmDiscard") === "true",
    );

    if (result.blocked) {
      return NextResponse.json(
        { success: false, error: "Session has unfinished items", data: result },
        { status: 409 },
      );
    }

    return jsonSuccess(result);
  } catch (error) {
    return serviceError(error, "Delete quick entry session error:");
  }
}
