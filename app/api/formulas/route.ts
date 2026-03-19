import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripType = searchParams.get("tripType");
    const isActive = searchParams.get("isActive");

    const where: Prisma.PricingFormulaWhereInput = {};
    if (tripType) where.tripType = tripType;
    if (isActive !== null) where.isActive = isActive === "true";

    const formulas = await prisma.pricingFormula.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: formulas.map((f) => ({
        id: f.id,
        name: f.name,
        tripType: f.tripType,
        seats: f.seats,
        minPrice: f.minPrice ? Number(f.minPrice) : null,
        maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
        points: Number(f.points),
        description: f.description,
        isActive: f.isActive,
        sortOrder: f.sortOrder,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get formulas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      tripType,
      seats,
      minPrice,
      maxPrice,
      points,
      description,
      isActive,
      sortOrder,
    } = body;

    if (!name || !tripType || points === undefined) {
      return NextResponse.json(
        { error: "Thiếu trường bắt buộc: name, tripType, points" },
        { status: 400 }
      );
    }

    const VALID_TRIP_TYPES = ["ghep", "bao", "ghep_roundtrip", "bao_roundtrip"];
    if (!VALID_TRIP_TYPES.includes(tripType)) {
      return NextResponse.json(
        { error: `tripType không hợp lệ. Chỉ chấp nhận: ${VALID_TRIP_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (minPrice !== null && maxPrice !== null && Number(minPrice) > Number(maxPrice)) {
      return NextResponse.json(
        { error: "Giá tối thiểu không được lớn hơn giá tối đa" },
        { status: 400 }
      );
    }

    // Chuẩn hóa và validate points để hỗ trợ cả "0.75" và "0,75"
    const rawPoints = String(points).replace(",", ".");
    const parsedPoints = parseFloat(rawPoints);
    if (Number.isNaN(parsedPoints) || parsedPoints <= 0) {
      return NextResponse.json(
        { error: "Số điểm không hợp lệ (phải là số > 0)" },
        { status: 400 }
      );
    }

    const formula = await prisma.pricingFormula.create({
      data: {
        name: String(name).trim(),
        tripType,
        seats: seats !== undefined && seats !== null ? parseInt(seats) : null,
        minPrice: minPrice !== undefined && minPrice !== null && minPrice !== "" ? parseFloat(minPrice) : null,
        maxPrice: maxPrice !== undefined && maxPrice !== null && maxPrice !== "" ? parseFloat(maxPrice) : null,
        points: parsedPoints,
        description: description || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });

    return NextResponse.json({ success: true, data: formula }, { status: 201 });
  } catch (error) {
    console.error("Create formula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
