import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone || phone.length < 3) {
      return NextResponse.json({ customers: [] });
    }

    const customers = await prisma.customer.findMany({
      where: {
        phone: {
          contains: phone,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        totalTrips: true,
      },
      take: 5,
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Search customer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phone, name, email, notes } = await request.json();

    if (!phone || !name) {
      return NextResponse.json(
        { error: "Phone and name are required" },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Customer with this phone already exists", customer: existingCustomer },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        phone,
        name,
        email,
        notes,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
