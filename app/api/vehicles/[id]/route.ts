import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
      return NextResponse.json(
        { error: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: user.id,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Get vehicle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
      return NextResponse.json(
        { error: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: user.id,
      },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, licensePlate, vehicleType, capacity, color, brand, model, year, isActive } = body;

    if (licensePlate && licensePlate !== existingVehicle.licensePlate) {
      const duplicatePlate = await prisma.vehicle.findUnique({
        where: { licensePlate },
      });
      if (duplicatePlate) {
        return NextResponse.json(
          { error: "License plate already exists" },
          { status: 409 }
        );
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        name: name || existingVehicle.name,
        licensePlate: licensePlate || existingVehicle.licensePlate,
        vehicleType: vehicleType || existingVehicle.vehicleType,
        capacity: capacity ? parseInt(capacity) : existingVehicle.capacity,
        color: color !== undefined ? color : existingVehicle.color,
        brand: brand !== undefined ? brand : existingVehicle.brand,
        model: model !== undefined ? model : existingVehicle.model,
        year: year ? parseInt(year) : existingVehicle.year,
        isActive: isActive !== undefined ? isActive : existingVehicle.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("Update vehicle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    if (isNaN(vehicleId)) {
      return NextResponse.json(
        { error: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: user.id,
      },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    await prisma.vehicle.delete({
      where: { id: vehicleId },
    });

    return NextResponse.json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
