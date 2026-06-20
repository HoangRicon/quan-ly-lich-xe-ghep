import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import { parseReportDateRange } from "@/lib/reports/date-range";
import {
  getDriverReport,
  type DriverReportSortKey,
} from "@/lib/reports/driver-report";

const SUPPORTED_SORT_KEYS = new Set<string>([
  "totalRevenue",
  "totalTrips",
  "totalProfit",
  "completedTrips",
  "completionRate",
  "cancelRate",
  "lastAssignedAt",
  "name",
]);

function parseSortBy(value: string | null): DriverReportSortKey | undefined {
  return value && SUPPORTED_SORT_KEYS.has(value)
    ? (value as DriverReportSortKey)
    : undefined;
}

function parseSortOrder(value: string | null): "asc" | "desc" | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function parseDriverId(value: string | null): number | undefined {
  if (!value || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

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
    const driverId = parseDriverId(searchParams.get("driverId"));
    const search = searchParams.get("search") || "";
    const sortBy = parseSortBy(searchParams.get("sortBy"));
    const sortOrder = parseSortOrder(searchParams.get("sortOrder"));
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const { current } = parseReportDateRange(startDate, endDate);

    if (Number.isNaN(driverId)) {
      return NextResponse.json(
        { error: "Invalid driverId" },
        { status: 400 }
      );
    }

    const { data, pagination } = await getDriverReport(db, {
      accountId: user.accountId,
      current,
      driverId,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data, pagination });
  } catch (error) {
    console.error("Reports drivers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
