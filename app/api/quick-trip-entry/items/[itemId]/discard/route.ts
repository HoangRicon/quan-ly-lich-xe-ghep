import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  discardQuickEntryItem,
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
    if (error.message === "Item not found") {
      return jsonError(error.message, 404);
    }
    if (error.message === "Saved item cannot be discarded") {
      return jsonError(error.message, 409);
    }
  }

  console.error(label, error);
  return jsonError("Internal server error", 500);
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

    const data = await discardQuickEntryItem(prisma, context, id);
    return jsonSuccess(data);
  } catch (error) {
    return serviceError(error, "Discard quick entry item error:");
  }
}
