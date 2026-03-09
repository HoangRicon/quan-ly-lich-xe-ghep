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
      include: {
        vehicles: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: driver });
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

    const { fullName, phone, status, vehicle } = await request.json();

    // Update driver
    const driver = await prisma.user.update({
      where: { id: driverId },
      data: {
        fullName,
        phone,
        status,
      },
    });

    // Update vehicle if provided
    if (vehicle) {
      const existingVehicle = await prisma.vehicle.findFirst({
        where: { ownerId: driverId },
      });

      if (existingVehicle) {
        await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            name: vehicle.name || existingVehicle.name,
            licensePlate: vehicle.licensePlate || existingVehicle.licensePlate,
            vehicleType: vehicle.vehicleType || existingVehicle.vehicleType,
            seats: vehicle.seats || existingVehicle.seats,
            capacity: vehicle.capacity || existingVehicle.capacity,
            brand: vehicle.brand ?? existingVehicle.brand,
            model: vehicle.model ?? existingVehicle.model,
            year: vehicle.year ?? existingVehicle.year,
          },
        });
      } else if (vehicle.licensePlate) {
        await prisma.vehicle.create({
          data: {
            name: vehicle.name || "Xe của tài xế",
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType || "car",
            seats: vehicle.seats || 4,
            capacity: vehicle.capacity || 4,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            ownerId: driverId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: driver });
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

    // Delete associated vehicles first
    await prisma.vehicle.deleteMany({
      where: { ownerId: driverId },
    });

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
