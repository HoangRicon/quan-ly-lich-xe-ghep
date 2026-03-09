import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    const where = {
      driverId: user.id,
      ...(status ? { status } : {}),
    };

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: true,
          _count: {
            select: { bookings: true },
          },
        },
        orderBy: { departureTime: "desc" },
      }),
      prisma.trip.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get trips error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, departure, destination, departureTime, price, vehicleId, totalSeats } = body;

    if (!title || !departure || !destination || !departureTime || !price || !vehicleId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: parseInt(vehicleId),
        ownerId: user.id,
        isActive: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found or not active" },
        { status: 404 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        title,
        description,
        departure,
        destination,
        departureTime: new Date(departureTime),
        price: parseFloat(price),
        vehicleId: parseInt(vehicleId),
        driverId: user.id,
        totalSeats: totalSeats || vehicle.capacity,
        availableSeats: totalSeats || vehicle.capacity,
        status: "scheduled",
      },
      include: {
        vehicle: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error("Create trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
