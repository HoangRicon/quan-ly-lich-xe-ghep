import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formula = await prisma.pricingFormula.findUnique({
      where: { id: parseInt(id) },
    });

    if (!formula) {
      return NextResponse.json({ error: "Không tìm thấy công thức" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: formula.id,
        name: formula.name,
        tripType: formula.tripType,
        seats: formula.seats,
        minPrice: formula.minPrice ? Number(formula.minPrice) : null,
        maxPrice: formula.maxPrice ? Number(formula.maxPrice) : null,
        points: Number(formula.points),
        description: formula.description,
        isActive: formula.isActive,
        sortOrder: formula.sortOrder,
        createdAt: formula.createdAt,
        updatedAt: formula.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get formula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const updateData: Prisma.PricingFormulaUpdateInput = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (tripType !== undefined) {
      const VALID_TRIP_TYPES = ["ghep", "bao", "ghep_roundtrip", "bao_roundtrip"];
      if (!VALID_TRIP_TYPES.includes(tripType)) {
        return NextResponse.json(
          { error: `tripType không hợp lệ. Chỉ chấp nhận: ${VALID_TRIP_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.tripType = tripType;
    }
    if (seats !== undefined) updateData.seats = seats !== null ? parseInt(seats) : null;
    if (minPrice !== undefined) {
      updateData.minPrice = minPrice !== null && minPrice !== "" ? parseFloat(minPrice) : null;
    }
    if (maxPrice !== undefined) {
      updateData.maxPrice = maxPrice !== null && maxPrice !== "" ? parseFloat(maxPrice) : null;
    }
    if (points !== undefined) {
      const rawPoints = String(points).replace(",", ".");
      const parsedPoints = parseFloat(rawPoints);
      if (Number.isNaN(parsedPoints) || parsedPoints <= 0) {
        return NextResponse.json(
          { error: "Số điểm không hợp lệ (phải là số > 0)" },
          { status: 400 }
        );
      }
      updateData.points = parsedPoints;
    }
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;

    if (
      (updateData.minPrice !== undefined && updateData.maxPrice !== undefined) ||
      (minPrice !== undefined && maxPrice !== undefined)
    ) {
      const min = updateData.minPrice ?? minPrice;
      const max = updateData.maxPrice ?? maxPrice;
      if (min !== null && max !== null && Number(min) > Number(max)) {
        return NextResponse.json(
          { error: "Giá tối thiểu không được lớn hơn giá tối đa" },
          { status: 400 }
        );
      }
    }

    const formula = await prisma.pricingFormula.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: formula.id,
        name: formula.name,
        tripType: formula.tripType,
        seats: formula.seats,
        minPrice: formula.minPrice ? Number(formula.minPrice) : null,
        maxPrice: formula.maxPrice ? Number(formula.maxPrice) : null,
        points: Number(formula.points),
        description: formula.description,
        isActive: formula.isActive,
        sortOrder: formula.sortOrder,
        createdAt: formula.createdAt,
        updatedAt: formula.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update formula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Kiểm tra công thức có đang được sử dụng bởi trip nào không
    const usedCount = await prisma.trip.count({
      where: { matchedFormulaId: parseInt(id) },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        {
          error: `Công thức đang được sử dụng bởi ${usedCount} chuyến xe. Vui lòng cập nhật hoặc xóa các chuyến xe trước.`,
        },
        { status: 400 }
      );
    }

    await prisma.pricingFormula.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete formula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
