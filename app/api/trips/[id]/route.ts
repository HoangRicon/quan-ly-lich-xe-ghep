import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: {
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        customers: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const mainCustomer = trip.customers[0]?.customer;

    const formattedTrip = {
      id: trip.id,
      title: trip.title,
      departure: trip.departure,
      destination: trip.destination,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      price: trip.price,
      status: trip.status,
      totalSeats: trip.totalSeats,
      availableSeats: trip.availableSeats,
      notes: trip.notes,
      vehicle: trip.vehicle ? {
        id: trip.vehicle.id,
        name: trip.vehicle.name,
        licensePlate: trip.vehicle.licensePlate,
        vehicleType: trip.vehicle.vehicleType,
        seats: trip.vehicle.seats,
      } : null,
      driver: trip.driver ? {
        id: trip.driver.id,
        fullName: trip.driver.fullName,
        phone: trip.driver.phone,
      } : null,
      customer: mainCustomer ? {
        id: mainCustomer.id,
        name: mainCustomer.name,
        phone: mainCustomer.phone,
      } : null,
    };

    return NextResponse.json({ success: true, data: formattedTrip });
  } catch (error) {
    console.error("Get trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    const { 
      status, driverId, departure, destination, price, 
      title, departureTime, totalSeats, notes, vehicleId,
      customerPhone, customerName, customerEmail, customerNotes
    } = await request.json();

    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (driverId !== undefined) {
      updateData.driverId = driverId;
      // Also update vehicle from driver's vehicle
      if (driverId) {
        const driverVehicle = await prisma.vehicle.findFirst({
          where: { ownerId: driverId, isActive: true },
        });
        if (driverVehicle) {
          updateData.vehicleId = driverVehicle.id;
        }
      } else {
        updateData.vehicleId = null;
      }
    }

    if (departure !== undefined) {
      updateData.departure = departure;
    }

    if (destination !== undefined) {
      updateData.destination = destination;
    }

    if (price !== undefined) {
      updateData.price = parseFloat(price);
    }

    if (departureTime !== undefined && departureTime) {
      const parsedDate = new Date(departureTime);
      if (!isNaN(parsedDate.getTime())) {
        updateData.departureTime = parsedDate;
      }
    }

    if (totalSeats !== undefined) {
      updateData.totalSeats = parseInt(totalSeats);
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (vehicleId !== undefined) {
      updateData.vehicleId = vehicleId ? parseInt(vehicleId) : null;
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        vehicle: true,
        driver: true,
        customers: {
          include: {
            customer: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: trip });
  } catch (error) {
    console.error("Update trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    // Delete trip customers first
    await prisma.tripCustomer.deleteMany({
      where: { tripId },
    });

    // Delete trip
    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
