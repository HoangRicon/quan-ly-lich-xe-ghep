import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = parseInt(id);

    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        fullName: true,
        totalRevenue: true,
        role: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        fullName: driver.fullName,
        totalRevenue: Number(driver.totalRevenue),
      },
    });
  } catch (error) {
    console.error("Get driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = parseInt(id);

    const { fullName } = await request.json();

    // Update driver
    const driver = await prisma.user.update({
      where: { id: driverId },
      data: {
        fullName,
      },
      select: { id: true, fullName: true, totalRevenue: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        fullName: driver.fullName,
        totalRevenue: Number(driver.totalRevenue),
      },
    });
  } catch (error) {
    console.error("Update driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = parseInt(id);

    // Check if driver has active trips
    const activeTrips = await prisma.trip.count({
      where: {
        driverId,
        status: { in: ["scheduled", "running"] },
      },
    });

    if (activeTrips > 0) {
      return NextResponse.json(
        { error: "Không thể xóa tài xế đang có chuyến xe hoạt động" },
        { status: 400 }
      );
    }

    // Delete the driver
    await prisma.user.delete({
      where: { id: driverId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
