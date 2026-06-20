import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import { parseReportDateRange } from "@/lib/reports/date-range";
import { getDriverTripHistory } from "@/lib/reports/driver-trip-history";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ driverId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { driverId: rawDriverId } = await params;
    const driverId = Number(rawDriverId);
    if (!Number.isInteger(driverId) || driverId <= 0) {
      return NextResponse.json({ error: "Invalid driverId" }, { status: 400 });
    }

    const db = createTenantPrisma(prisma, user.accountId);
    const driver = await db.user.findFirst({
      where: { id: driverId, accountId: user.accountId, role: "driver" },
      select: { id: true },
    });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const { current } = parseReportDateRange(
      searchParams.get("startDate"),
      searchParams.get("endDate")
    );

    const result = await getDriverTripHistory(db, {
      accountId: user.accountId,
      driverId,
      current,
      page: parsePositiveInt(searchParams.get("page"), 1),
      limit: parsePositiveInt(searchParams.get("limit"), 20),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Reports driver trip history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
