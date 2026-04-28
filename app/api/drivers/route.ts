import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const db = createTenantPrisma(prisma, user.accountId);

    const where: Prisma.UserWhereInput = {
      role: "driver",
      accountId: user.accountId,
      ...(q
        ? {
            fullName: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [drivers, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      }),
      db.user.count({ where }),
    ]);

    // Fetch all active formulas in one query, then filter per driver
    const allFormulas = await db.pricingFormula.findMany({
      where: { isActive: true },
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
      orderBy: { sortOrder: "asc" },
    });

    const formatFormula = (f: (typeof allFormulas)[number]) => ({
      id: f.id,
      name: f.name,
      tripType: f.tripType,
      seats: f.seats,
      minPrice: f.minPrice ? Number(f.minPrice) : null,
      maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
      points: Number(f.points),
      isActive: f.isActive,
    });

    const formulaMap = new Map(allFormulas.map((f: (typeof allFormulas)[number]) => [f.id, formatFormula(f)]));

    return NextResponse.json({
      success: true,
      data: drivers.map((d: { id: number; fullName: string; totalRevenue: unknown; profitRate: unknown; formulaId: number | null; formulaIds: number[]; formula?: { id: number; name: string; tripType: string; seats: number; minPrice: unknown; maxPrice: unknown; points: unknown; isActive: boolean } | null }) => {
        const formulas = (d.formulaIds || [])
          .map((id: number) => formulaMap.get(id))
          .filter(Boolean);
        return {
          id: d.id,
          fullName: d.fullName,
          totalRevenue: Number(d.totalRevenue),
          profitRate: Number(d.profitRate),
          formulaId: d.formulaId,
          formulaIds: d.formulaIds,
          formula: d.formula ? formatFormula(d.formula) : null,
          formulas,
        };
      }),
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
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fullName, profitRate, formulaId, formulaIds } = await request.json();

    const email = `zom-${Date.now()}@zom.local`;
    const password = "zom123";

    if (!fullName) {
      return NextResponse.json({ error: "Tên Zom là bắt buộc" }, { status: 400 });
    }

    const { hashPassword } = await import("@/lib/password");
    const passwordHash = await hashPassword(password);

    const db = createTenantPrisma(prisma, user.accountId);

    const driver = await db.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone: null,
        role: "driver",
        status: "offline",
        rating: 5,
        avatar: null,
        profitRate: profitRate !== undefined ? parseFloat(profitRate) : 1000,
        formulaId: formulaId ? parseInt(formulaId) : null,
        formulaIds: Array.isArray(formulaIds) ? formulaIds.map(Number).filter(Boolean) : [],
      } as any,
    });

    return NextResponse.json({ success: true, data: driver }, { status: 201 });
  } catch (error) {
    console.error("Create driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
