import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const driverId = searchParams.get("driverId");
    const vehicleType = searchParams.get("vehicleType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (driverId) {
      where.driverId = parseInt(driverId);
    }

    if (vehicleType) {
      where.vehicle = {
        vehicleType: vehicleType,
      };
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.departureTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.departureTime = {
        gte: start,
        lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.departureTime = {
        gte: start,
      };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.departureTime = {
        lte: end,
      };
    }

    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { departureTime: "asc" },
      }),
      prisma.trip.count({ where }),
    ]);

    const formattedTrips = trips.map((trip) => {
      return {
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
        customer: trip.customers[0]?.customer ? {
          id: trip.customers[0].customer.id,
          name: trip.customers[0].customer.name,
          phone: trip.customers[0].customer.phone,
        } : null,
        customers: trip.customers.map(c => ({
          customer: c.customer ? {
            id: c.customer.id,
            name: c.customer.name,
            phone: c.customer.phone,
          } : null,
          seats: c.seats,
          status: c.status,
        })),
        passengerCount: trip.customers.reduce((sum, c) => sum + c.seats, 0),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedTrips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get trips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, description, departure, destination, departureTime, arrivalTime,
      price, vehicleId, totalSeats, tripType, notes,
      customerPhone, customerName, customerEmail, customerNotes,
      seats
    } = body;

    const parsedTotalSeats = parseInt(totalSeats) || 4;

    if (!title || !departure || !destination || !departureTime || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Handle customer - create or get existing
    let customerId = null;
    if (customerPhone) {
      let customer = await prisma.customer.findUnique({
        where: { phone: customerPhone },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: customerPhone,
            name: customerName || "Khách vãng lai",
            email: customerEmail,
            notes: customerNotes,
          },
        });
      }

      customerId = customer.id;

      await prisma.customer.update({
        where: { id: customerId },
        data: { totalTrips: { increment: 1 } },
      });
    }

    // Get default driver if needed
    let driverId = null;
    let finalVehicleId = vehicleId;
    
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });
      if (vehicle?.ownerId) {
        driverId = vehicle.ownerId;
      }
    }

    const trip = await prisma.trip.create({
      data: {
        title,
        description,
        departure,
        destination,
        departureTime: new Date(departureTime),
        arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
        price: parseFloat(price),
        ...(finalVehicleId ? { vehicleId: finalVehicleId } : {}),
        ...(driverId ? { driverId } : {}),
        totalSeats: parsedTotalSeats,
        availableSeats: tripType === "bao" ? 0 : parsedTotalSeats,
        status: "scheduled",
        ...(notes ? { notes } : {}),
        ...(customerId ? {
          customers: {
            create: {
              customerId,
              seats: seats || 1,
              status: "confirmed",
              notes: customerNotes,
            },
          },
        } : {}),
      },
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

    // Format response
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

    return NextResponse.json({
      success: true,
      data: formattedTrip,
    });
  } catch (error) {
    console.error("Create trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
