import { NextRequest, NextResponse } from "next/server";
import { prisma as rootPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const db = rootPrisma as any;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get("accountId");
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const accountIdNum = parseInt(accountId);
    if (isNaN(accountIdNum)) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }

    const account = await db.account.findUnique({
      where: { id: accountIdNum },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        slug: account.slug,
        userCount: account._count.users,
        createdAt: account.createdAt,
      },
    });
  } catch (error) {
    console.error("Get account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
