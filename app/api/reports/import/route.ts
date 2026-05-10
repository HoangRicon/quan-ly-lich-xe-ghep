import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";

interface ImportRow {
  title?: string;
  departure?: string;
  destination?: string;
  departureTime?: string;
  price?: string | number;
  totalSeats?: string | number;
  customerPhone?: string;
  customerName?: string;
  notes?: string;
  tripDirection?: string;
  tripType?: string;
}

function sanitizeDecimal10_2(x: number | null | undefined): number {
  if (x == null || !Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data } = body as { data: ImportRow[] };

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Dữ liệu rỗng hoặc không hợp lệ" },
        { status: 400 }
      );
    }

    const db = createTenantPrisma(prisma, user.accountId);

    let imported = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because header is row 1, data starts at row 2

      try {
        // Validate required fields
        if (!row.departure || !row.destination) {
          errors.push({ row: rowNum, message: "Thiếu điểm đi hoặc điểm đến" });
          failed++;
          continue;
        }

        if (!row.departureTime) {
          errors.push({ row: rowNum, message: "Thiếu giờ khởi hành" });
          failed++;
          continue;
        }

        if (!row.price && row.price !== 0) {
          errors.push({ row: rowNum, message: "Thiếu giá vé" });
          failed++;
          continue;
        }

        const parsedPrice = parseFloat(String(row.price).replace(/[.,]/g, ""));
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          errors.push({ row: rowNum, message: "Giá vé không hợp lệ" });
          failed++;
          continue;
        }

        const parsedSeats = parseInt(String(row.totalSeats || 1), 10);
        const safeSeats = Number.isFinite(parsedSeats) && parsedSeats > 0 ? parsedSeats : 1;
        const safePrice = sanitizeDecimal10_2(parsedPrice);

        // Parse departure time
        let parsedDepartureTime: Date;
        try {
          parsedDepartureTime = new Date(row.departureTime);
          if (isNaN(parsedDepartureTime.getTime())) {
            throw new Error("Invalid date");
          }
        } catch {
          errors.push({ row: rowNum, message: "Định dạng giờ khởi hành không hợp lệ" });
          failed++;
          continue;
        }

        // Handle customer
        let customerId: number | null = null;
        if (row.customerPhone) {
          const customer = await db.customer.upsert({
            where: {
              idx_customers_account_phone: {
                phone: String(row.customerPhone),
                accountId: user.accountId,
              },
            },
            create: {
              phone: String(row.customerPhone),
              name: row.customerName || "Khách import",
              accountId: user.accountId,
            },
            update: {
              totalTrips: { increment: 1 },
            },
          });
          customerId = customer.id;
        }

        // Create trip
        await db.trip.create({
          data: {
            title: row.title || `${row.departure} → ${row.destination}`,
            departure: String(row.departure).trim(),
            destination: String(row.destination).trim(),
            departureTime: parsedDepartureTime,
            price: safePrice,
            totalSeats: safeSeats,
            tripDirection: row.tripDirection === "roundtrip" ? "roundtrip" : "oneway",
            tripType: row.tripType === "bao" ? "bao" : "ghep",
            notes: row.notes || undefined,
            status: "scheduled",
            account: { connect: { id: user.accountId } },
            ...(customerId
              ? {
                  customers: {
                    create: {
                      customer: { connect: { id: customerId } },
                      seats: 1,
                      status: "confirmed",
                      accountId: user.accountId,
                    },
                  },
                }
              : {}),
          } as Prisma.TripCreateInput,
        });

        imported++;
      } catch (err) {
        console.error(`Import row ${rowNum} error:`, err);
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : "Lỗi không xác định",
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { imported, failed, errors },
    });
  } catch (error) {
    console.error("Reports import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
