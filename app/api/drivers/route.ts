import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Temporarily disable auth check for development
    // const user = await getUserFromRequest(request);
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const vehicleType = searchParams.get("vehicleType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {
      role: "driver",
      ...(status && status !== "all" ? { status } : {}),
    };

    const [drivers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicles: {
            where: { isActive: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const driversWithVehicle = drivers.map((driver) => ({
      id: driver.id,
      fullName: driver.fullName,
      email: driver.email,
      phone: driver.phone,
      avatar: driver.avatar,
      status: driver.status,
      rating: Number(driver.rating),
      totalRevenue: Number(driver.totalRevenue),
      vehicle: driver.vehicles[0]
        ? {
            name: driver.vehicles[0].name,
            licensePlate: driver.vehicles[0].licensePlate,
            vehicleType: driver.vehicles[0].vehicleType,
            seats: driver.vehicles[0].seats,
            brand: driver.vehicles[0].brand,
            model: driver.vehicles[0].model,
            year: driver.vehicles[0].year,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: driversWithVehicle,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get drivers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Temporarily disable auth check for development
    // const user = await getUserFromRequest(request);
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { fullName, phone, licensePlate, vehicleType, seats, brand, model, year, notes } = await request.json();

    const email = `${phone || Date.now()}@driver.local`;
    const password = "driver123"; // Default password for demo

    if (!fullName) {
      return NextResponse.json({ error: "Họ tên là bắt buộc" }, { status: 400 });
    }

    // Check if phone already exists
    if (phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone } });
      if (existingPhone) {
        return NextResponse.json({ error: "Số điện thoại đã tồn tại" }, { status: 409 });
      }
    }

    const { hashPassword } = await import("@/lib/password");
    const passwordHash = await hashPassword(password);

    const driver = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone: phone || null,
        role: "driver",
        status: "available",
        rating: 5,
        avatar: null,
      },
    });

    // Create vehicle if license plate provided
    if (licensePlate) {
      await prisma.vehicle.create({
        data: {
          name: `${brand || "Xe"} ${model || ""}`.trim() || "Xe của tài xế",
          licensePlate,
          vehicleType: vehicleType || "car",
          seats: seats ? parseInt(seats as string) : 4,
          capacity: seats ? parseInt(seats as string) : 4,
          brand,
          model,
          year: year ? parseInt(year as string) : null,
          ownerId: driver.id,
        },
      });
    }

    return NextResponse.json({ success: true, data: driver }, { status: 201 });
  } catch (error) {
    console.error("Create driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
