import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import { parseReportDateRange } from "@/lib/reports/date-range";

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
    const status = searchParams.get("status");
    const driverId = searchParams.get("driverId");

    const where: Record<string, unknown> = {
      accountId: user.accountId,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (driverId) {
      where.driverId = parseInt(driverId);
    }

    const { current } = parseReportDateRange(startDate, endDate);
    if (Object.keys(current).length > 0) {
      where.departureTime = current;
    }

    const trips = await db.trip.findMany({
      where,
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        customers: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, email: true, totalTrips: true },
            },
          },
        },
      },
      orderBy: { departureTime: "desc" },
    });

    const statusLabels: Record<string, string> = {
      scheduled: "Chờ xe",
      in_progress: "Đang đi",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };

    const rows = trips.map((trip, idx) => {
      const mainCustomer = trip.customers[0]?.customer;
      return {
        stt: idx + 1,
        ma_chuyen: trip.id,
        tieu_de: trip.title,
        diem_di: trip.departure,
        diem_den: trip.destination,
        khoi_hanh: formatDate(trip.departureTime),
        gio_khoi_hanh: formatTime(trip.departureTime),
        den: trip.arrivalTime ? formatDate(trip.arrivalTime) : "",
        gio_den: trip.arrivalTime ? formatTime(trip.arrivalTime) : "",
        loai_tuyen: trip.tripDirection === "roundtrip" ? "Khứ hồi" : "Một chiều",
        loai_xe: trip.tripType === "bao" ? "Trọn gói" : "Ghép",
        trang_thai: statusLabels[trip.status] ?? trip.status,
        gia_ve: Number(trip.price),
        loi_nhuan: trip.profit != null ? Number(trip.profit) : "",
        thu_ho: trip.collectionAmount != null ? Number(trip.collectionAmount) : "",
        chi_phi: trip.expense != null ? Number(trip.expense) : "",
        loi_nhuan_sau_chi_phi:
          trip.profit != null ? Number(trip.profit) - Number(trip.expense ?? 0) : "",
        ti_le_loi_nhuan: trip.profitRate != null ? Number(trip.profitRate) : "",
        diem_tichluy: trip.pointsEarned != null ? Number(trip.pointsEarned) : "",
        tong_ghe: trip.totalSeats,
        ghe_da_dat: trip.customers.reduce((sum, c) => sum + c.seats, 0),
        ma_tai_xe: trip.driver?.id ?? "",
        tai_xe: trip.driver?.fullName ?? "",
        sdt_tai_xe: trip.driver?.phone ?? "",
        ma_khach: mainCustomer?.id ?? "",
        ten_khach: mainCustomer?.name ?? "",
        sdt_khach: mainCustomer?.phone ?? "",
        email_khach: mainCustomer?.email ?? "",
        tong_chuyen_khach: mainCustomer?.totalTrips ?? "",
        danh_sach_khach: trip.customers
          .filter((c) => c.customer)
          .map((c) => `${c.customer.name} (${c.customer.phone}) x${c.seats} [${c.status}]`)
          .join("; "),
        ghi_chu: trip.notes ?? "",
        tao_luc: formatDateTime(trip.createdAt),
        cong_thuc_id: trip.matchedFormulaId ?? "",
      };
    });

    return NextResponse.json({
      success: true,
      data: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${formatTime(d)}`;
}
