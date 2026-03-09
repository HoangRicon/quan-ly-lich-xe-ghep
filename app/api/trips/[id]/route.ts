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
    const tripId = parseInt(id, 10);

    if (isNaN(tripId)) {
      return NextResponse.json(
        { error: "Invalid trip ID" },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId: user.id,
      },
      include: {
        vehicle: true,
        bookings: {
          include: {
            passenger: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error("Get trip error:", error);
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
    const tripId = parseInt(id, 10);

    if (isNaN(tripId)) {
      return NextResponse.json(
        { error: "Invalid trip ID" },
        { status: 400 }
      );
    }

    const existingTrip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId: user.id,
      },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, departure, destination, departureTime, arrivalTime, price, status } = body;

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        title: title || existingTrip.title,
        description: description !== undefined ? description : existingTrip.description,
        departure: departure || existingTrip.departure,
        destination: destination || existingTrip.destination,
        departureTime: departureTime ? new Date(departureTime) : existingTrip.departureTime,
        arrivalTime: arrivalTime ? new Date(arrivalTime) : existingTrip.arrivalTime,
        price: price ? parseFloat(price) : existingTrip.price,
        status: status || existingTrip.status,
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
    console.error("Update trip error:", error);
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
    const tripId = parseInt(id, 10);

    if (isNaN(tripId)) {
      return NextResponse.json(
        { error: "Invalid trip ID" },
        { status: 400 }
      );
    }

    const existingTrip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId: user.id,
      },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
