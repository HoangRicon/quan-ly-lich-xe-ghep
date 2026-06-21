import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createQuickEntrySession,
  listQuickEntrySessions,
  type QuickEntryContext,
} from "@/lib/quick-trip-entry/service";

function jsonSuccess(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function serviceError(error: unknown, label: string) {
  if (error instanceof Error && error.message === "Session name is required") {
    return jsonError(error.message, 400);
  }

  console.error(label, error);
  return jsonError("Internal server error", 500);
}

async function getContext(): Promise<QuickEntryContext | NextResponse> {
  const user = await getSession();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  return { accountId: user.accountId, actorId: user.id };
}

export async function GET() {
  try {
    const context = await getContext();
    if (context instanceof NextResponse) return context;

    const data = await listQuickEntrySessions(prisma, context);
    return jsonSuccess(data);
  } catch (error) {
    console.error("List quick entry sessions error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext();
    if (context instanceof NextResponse) return context;

    const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<
      string,
      unknown
    >;
    const name = String(body.name || "").trim();

    if (!name) {
      return jsonError("Session name is required", 400);
    }

    const data = await createQuickEntrySession(prisma, context, {
      name,
      sourceType: body.sourceType
        ? String(body.sourceType).trim().slice(0, 50)
        : "conversation",
    });

    return jsonSuccess(data, { status: 201 });
  } catch (error) {
    return serviceError(error, "Create quick entry session error:");
  }
}
