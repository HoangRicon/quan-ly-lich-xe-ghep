import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};

    if (search) {
      where.OR = [
        { licensePlate: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }

    // Use isActive instead of status
    if (!includeInactive) {
      where.isActive = true;
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { licensePlate: "asc" },
      take: 50,
    });

    const formattedVehicles = vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      licensePlate: v.licensePlate,
      capacity: v.capacity,
      seats: v.seats,
      vehicleType: v.vehicleType,
      brand: v.brand,
      model: v.model,
      year: v.year,
      isActive: v.isActive,
      status: v.isActive ? "available" : "unavailable",
      driver: v.owner
        ? {
            id: v.owner.id,
            fullName: v.owner.fullName,
            phone: v.owner.phone,
          }
        : null,
    }));

    return NextResponse.json({ success: true, data: formattedVehicles });
  } catch (error) {
    console.error("Get vehicles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
