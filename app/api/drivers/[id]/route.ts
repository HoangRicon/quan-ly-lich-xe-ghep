import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type FormulaLite = Prisma.PricingFormulaGetPayload<{
  select: {
    id: true;
    name: true;
    tripType: true;
    seats: true;
    minPrice: true;
    maxPrice: true;
    points: true;
    isActive: true;
  };
}>;

async function getActiveFormulasByIds(formulaIds: number[]) {
  const uniqueIds = Array.from(new Set(formulaIds)).filter(Boolean);
  if (uniqueIds.length === 0) return new Map<number, FormulaLite>();

  const formulas = await prisma.pricingFormula.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: {
      id: true,
      name: true,
      tripType: true,
      seats: true,
      minPrice: true,
      maxPrice: true,
      points: true,
      isActive: true,
    },
  });

  return new Map<number, FormulaLite>(formulas.map((f) => [f.id, f]));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = parseInt(id);

    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        fullName: true,
        totalRevenue: true,
        profitRate: true,
        role: true,
        formulaId: true,
        formulaIds: true,
        formula: {
          select: {
            id: true,
            name: true,
            tripType: true,
            seats: true,
            minPrice: true,
            maxPrice: true,
            points: true,
            isActive: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const formulasById = await getActiveFormulasByIds(
      Array.isArray(driver.formulaIds) ? driver.formulaIds.map(Number) : []
    );
    const formulas = (driver.formulaIds ?? [])
      .map((id) => formulasById.get(Number(id)))
      .filter((f): f is FormulaLite => Boolean(f));

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        fullName: driver.fullName,
        totalRevenue: Number(driver.totalRevenue),
        profitRate: Number(driver.profitRate),
        formulaId: driver.formulaId,
        formulaIds: driver.formulaIds,
        formula: driver.formula
          ? {
              id: driver.formula.id,
              name: driver.formula.name,
              tripType: driver.formula.tripType,
              seats: driver.formula.seats,
              minPrice: driver.formula.minPrice ? Number(driver.formula.minPrice) : null,
              maxPrice: driver.formula.maxPrice ? Number(driver.formula.maxPrice) : null,
              points: Number(driver.formula.points),
              isActive: driver.formula.isActive,
            }
          : null,
        formulas: formulas.map((f) => ({
          id: f.id,
          name: f.name,
          tripType: f.tripType,
          seats: f.seats,
          minPrice: f.minPrice ? Number(f.minPrice) : null,
          maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
          points: Number(f.points),
          isActive: f.isActive,
        })),
      },
    });
  } catch (error) {
    console.error("Get driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = parseInt(id);

    const { fullName, profitRate, formulaId, formulaIds } = await request.json();

    // Validate formulaId if provided
    if (formulaId !== undefined && formulaId !== null) {
      const formula = await prisma.pricingFormula.findUnique({ where: { id: parseInt(formulaId) } });
      if (!formula) {
        return NextResponse.json({ error: "Công thức không tồn tại" }, { status: 400 });
      }
    }

    // Update driver
    const updateData: Prisma.UserUpdateInput = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (profitRate !== undefined) updateData.profitRate = parseFloat(profitRate);
    if (formulaId !== undefined) updateData.formulaId = formulaId !== null ? parseInt(formulaId) : null;
    if (formulaIds !== undefined) updateData.formulaIds = Array.isArray(formulaIds) ? formulaIds.map(Number).filter(Boolean) : [];

    const driver = await prisma.user.update({
      where: { id: driverId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        totalRevenue: true,
        profitRate: true,
        formulaId: true,
        formulaIds: true,
        formula: {
          select: {
            id: true,
            name: true,
            tripType: true,
            seats: true,
            minPrice: true,
            maxPrice: true,
            points: true,
            isActive: true,
          },
        },
      },
    });

    const formulasById = await getActiveFormulasByIds(
      Array.isArray(driver.formulaIds) ? driver.formulaIds.map(Number) : []
    );
    const formulas = (driver.formulaIds ?? [])
      .map((id) => formulasById.get(Number(id)))
      .filter((f): f is FormulaLite => Boolean(f));

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        fullName: driver.fullName,
        totalRevenue: Number(driver.totalRevenue),
        profitRate: Number(driver.profitRate),
        formulaId: driver.formulaId,
        formulaIds: driver.formulaIds,
        formula: driver.formula
          ? {
              id: driver.formula.id,
              name: driver.formula.name,
              tripType: driver.formula.tripType,
              seats: driver.formula.seats,
              minPrice: driver.formula.minPrice ? Number(driver.formula.minPrice) : null,
              maxPrice: driver.formula.maxPrice ? Number(driver.formula.maxPrice) : null,
              points: Number(driver.formula.points),
              isActive: driver.formula.isActive,
            }
          : null,
        formulas: formulas.map((f) => ({
          id: f.id,
          name: f.name,
          tripType: f.tripType,
          seats: f.seats,
          minPrice: f.minPrice ? Number(f.minPrice) : null,
          maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
          points: Number(f.points),
          isActive: f.isActive,
        })),
      },
    });
  } catch (error) {
    console.error("Update driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = parseInt(id);

    // Check if driver has active trips
    const activeTrips = await prisma.trip.count({
      where: {
        driverId,
        status: { in: ["scheduled", "running"] },
      },
    });

    if (activeTrips > 0) {
      return NextResponse.json(
        { error: "Không thể xóa tài xế đang có chuyến xe hoạt động" },
        { status: 400 }
      );
    }

    // Delete the driver
    await prisma.user.delete({
      where: { id: driverId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
