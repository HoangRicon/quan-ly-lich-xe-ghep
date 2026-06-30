import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import { parseReportDateRange } from "@/lib/reports/date-range";
import { parseReportDateBasis } from "@/lib/reports/date-basis";
import { getOverviewReport } from "@/lib/reports/overview-report";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createTenantPrisma(prisma, user.accountId);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const dateBasis = parseReportDateBasis(searchParams.get("dateBasis"));
    const driverId = searchParams.get("driverId");
    const { current, previousRange } = parseReportDateRange(startDate, endDate, startTime, endTime);
    const parsedDriverId =
      driverId && driverId.trim() ? Number(driverId) : undefined;

    if (
      parsedDriverId !== undefined &&
      (!Number.isInteger(parsedDriverId) || parsedDriverId <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid driverId" },
        { status: 400 }
      );
    }

    const data = await getOverviewReport(db, {
      accountId: user.accountId,
      current,
      previousRange,
      dateBasis,
      driverId: parsedDriverId,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Reports stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
